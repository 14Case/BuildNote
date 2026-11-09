import { randomUUID } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import {
  formulairePreremptSchema,
  type RapportConflit,
  type ResolutionConflit,
  type ResultatValidation,
} from '@buildnote/shared';
import type { Db } from '../db/client.js';
import * as t from '../db/schema.js';
import { ErreurMetier } from '../errors.js';

export interface ContexteResolution {
  readonly db: Db;
  readonly etablissementId: string;
  readonly userId: string;
  readonly lotId: string;
  readonly resolution: ResolutionConflit;
}

/**
 * Résolution guidée d'un conflit de synchronisation (EF-M1-16) : pour chaque élève en conflit,
 * l'humain a choisi `garder_existante` ou `remplacer`. Aucun écrasement sans décision explicite.
 */
export async function resoudreConflit(
  ctx: ContexteResolution,
): Promise<{ type: 'valide'; resultat: ResultatValidation } | { type: 'conflit'; rapport: RapportConflit }> {
  const { db, etablissementId, userId, lotId, resolution } = ctx;

  const [dejaFait] = await db
    .select()
    .from(t.idempotence)
    .where(and(eq(t.idempotence.cle, resolution.idempotencyKey), eq(t.idempotence.etablissementId, etablissementId)));
  if (dejaFait) return { type: 'valide', resultat: dejaFait.resultatJson as ResultatValidation };

  const [lot] = await db
    .select()
    .from(t.lotSaisie)
    .where(and(eq(t.lotSaisie.id, lotId), eq(t.lotSaisie.etablissementId, etablissementId)));
  if (!lot) throw new ErreurMetier(404, 'lot_introuvable', 'Lot introuvable.');
  if (lot.statut !== 'en_conflit') throw new ErreurMetier(409, 'pas_en_conflit', 'Ce lot n’est pas en conflit.');
  if (!lot.formulaireJson) throw new ErreurMetier(409, 'extraction_absente', 'Formulaire absent.');

  const formulaire = formulairePreremptSchema.parse(lot.formulaireJson);
  const decisionParEleve = new Map(resolution.decisions.map((d) => [d.eleveId, d.action]));

  const [evalRow] = await db
    .select({ classeId: t.enseignement.classeId, anneeScolaireId: t.classe.anneeScolaireId })
    .from(t.evaluation)
    .innerJoin(t.enseignement, eq(t.enseignement.id, t.evaluation.enseignementId))
    .innerJoin(t.classe, eq(t.classe.id, t.enseignement.classeId))
    .where(and(eq(t.evaluation.id, lot.evaluationId), eq(t.evaluation.etablissementId, etablissementId)));
  if (!evalRow) throw new ErreurMetier(404, 'evaluation_introuvable', 'Évaluation introuvable.');

  const lignesCibles = formulaire.lignes.filter((l) => l.rapprochement.eleveId);
  const eleveIds = lignesCibles.map((l) => l.rapprochement.eleveId!) as string[];
  const inscriptions = eleveIds.length
    ? await db
        .select()
        .from(t.inscription)
        .where(
          and(
            eq(t.inscription.etablissementId, etablissementId),
            eq(t.inscription.classeId, evalRow.classeId),
            eq(t.inscription.anneeScolaireId, evalRow.anneeScolaireId),
            inArray(t.inscription.eleveId, eleveIds),
          ),
        )
    : [];
  const inscriptionParEleve = new Map(inscriptions.map((i) => [i.eleveId, i.id]));
  const notesExistantes = await db
    .select()
    .from(t.note)
    .where(and(eq(t.note.etablissementId, etablissementId), eq(t.note.evaluationId, lot.evaluationId)));
  const noteParInscription = new Map(notesExistantes.map((n) => [n.inscriptionId, n]));

  const validationId = randomUUID();
  let ecrites = 0;

  await db.transaction(async (tx) => {
    for (const ligne of lignesCibles) {
      const eleveId = ligne.rapprochement.eleveId!;
      const inscriptionId = inscriptionParEleve.get(eleveId);
      if (!inscriptionId) continue;
      const existante = noteParInscription.get(inscriptionId);
      const valeur = ligne.note.valeur != null ? String(ligne.note.valeur) : null;

      if (existante) {
        const decision = decisionParEleve.get(eleveId);
        if (decision === 'remplacer') {
          await tx
            .update(t.note)
            .set({
              valeur,
              statut: ligne.note.statut,
              origine: ligne.note.source === 'corrige_manuellement' ? 'manuel' : 'ocr',
              lotSaisieId: lotId,
              creePar: userId,
              creeLe: new Date(),
            })
            .where(eq(t.note.id, existante.id));
          ecrites++;
        }
        // garder_existante ou pas de décision → on ne touche pas
        continue;
      }

      await tx.insert(t.note).values({
        id: randomUUID(),
        etablissementId,
        evaluationId: lot.evaluationId,
        inscriptionId,
        valeur,
        valeurTexte: null,
        statut: ligne.note.statut,
        lotSaisieId: lotId,
        origine: ligne.note.source === 'corrige_manuellement' ? 'manuel' : 'ocr',
        creePar: userId,
      });
      ecrites++;
    }

    await tx.insert(t.validationTable).values({
      id: validationId,
      etablissementId,
      lotSaisieId: lotId,
      utilisateurId: userId,
      roleValidation: 'enseignant',
    });
    await tx.update(t.lotSaisie).set({ statut: 'valide', modifieLe: new Date() }).where(eq(t.lotSaisie.id, lotId));

    const resultat: ResultatValidation = {
      lotId,
      statut: 'valide',
      validationId,
      notesEcrites: ecrites,
      contreValidationRequise: false,
    };
    await tx.insert(t.idempotence).values({
      cle: resolution.idempotencyKey,
      etablissementId,
      lotSaisieId: lotId,
      resultatJson: resultat,
    });
    await tx.insert(t.evenementAudit).values({
      id: randomUUID(),
      etablissementId,
      acteurId: userId,
      action: 'lot.conflit.resolu',
      objetType: 'lot_saisie',
      objetId: lotId,
      resultat: 'ok',
      detailsJson: { decisions: resolution.decisions.length, ecrites },
    });
  });

  return {
    type: 'valide',
    resultat: { lotId, statut: 'valide', validationId, notesEcrites: ecrites, contreValidationRequise: false },
  };
}
