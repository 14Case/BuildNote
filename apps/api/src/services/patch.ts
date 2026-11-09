import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import {
  formulairePreremptSchema,
  type FormulairePrerempt,
  type PatchFormulaire,
} from '@buildnote/shared';
import type { Db } from '../db/client.js';
import * as t from '../db/schema.js';
import { ErreurMetier } from '../errors.js';
import { recalculerDerive } from './form-builder.js';
import type { EleveConnu } from './matching.js';
import { toBareme } from './bareme-row.js';
import { empreinteStable } from './empreinte.js';

export interface ContextePatch {
  readonly db: Db;
  readonly etablissementId: string;
  readonly userId: string;
  readonly lotId: string;
  readonly patch: PatchFormulaire;
}

/**
 * Applique des corrections humaines au formulaire (brouillon).
 * **N'écrit RIEN en Normalized** : met seulement à jour `lot_saisie.formulaire_json`
 * et repasse le lot en `en_revue`.
 */
export async function appliquerPatch(
  ctx: ContextePatch,
): Promise<{ formulaire: FormulairePrerempt; empreinte: string }> {
  const { db, etablissementId, userId, lotId, patch } = ctx;

  const [lot] = await db
    .select()
    .from(t.lotSaisie)
    .where(and(eq(t.lotSaisie.id, lotId), eq(t.lotSaisie.etablissementId, etablissementId)));
  if (!lot) throw new ErreurMetier(404, 'lot_introuvable', 'Lot introuvable.');
  if (lot.statut === 'valide') throw new ErreurMetier(409, 'lot_deja_valide', 'Lot déjà validé — corrections impossibles ici (voir EF-M1-14).');
  if (!lot.formulaireJson) throw new ErreurMetier(409, 'extraction_absente', 'Lancez l’extraction avant de corriger.');

  const formulaire = formulairePreremptSchema.parse(lot.formulaireJson);
  const parIndex = new Map(formulaire.lignes.map((l) => [l.ligneIndex, l]));

  for (const e of patch.editions) {
    const ligne = parIndex.get(e.ligneIndex);
    if (!ligne) throw new ErreurMetier(400, 'ligne_inconnue', `Ligne ${e.ligneIndex} absente du formulaire.`);

    switch (e.champ) {
      case 'note':
        ligne.note = {
          ...ligne.note,
          valeur: e.valeur,
          statut: e.statut,
          source: 'corrige_manuellement',
        };
        break;
      case 'appreciation':
        ligne.appreciation = {
          texte: e.texte,
          source: 'corrige_manuellement',
          confiance: ligne.appreciation?.confiance ?? { score: 1, bande: 'haute' },
          bbox: ligne.appreciation?.bbox ?? null,
        };
        break;
      case 'rapprochement':
        ligne.rapprochement = {
          ...ligne.rapprochement,
          statut: e.eleveId ? 'manuel' : 'non_rapproche',
          eleveId: e.eleveId,
        };
        break;
      case 'confirmation':
        if (ligne.note.source === 'ocr') ligne.note = { ...ligne.note, source: 'confirme' };
        break;
    }
  }

  // Liste de classe (pour recalculer « élèves sans note »)
  const [evalRow] = await db
    .select({
      classeId: t.enseignement.classeId,
      anneeScolaireId: t.classe.anneeScolaireId,
      baremeType: t.bareme.type,
      baremeMin: t.bareme.min,
      baremeMax: t.bareme.max,
      baremePas: t.bareme.pas,
    })
    .from(t.evaluation)
    .innerJoin(t.enseignement, eq(t.enseignement.id, t.evaluation.enseignementId))
    .innerJoin(t.classe, eq(t.classe.id, t.enseignement.classeId))
    .innerJoin(t.bareme, eq(t.bareme.id, t.evaluation.baremeId))
    .where(and(eq(t.evaluation.id, lot.evaluationId), eq(t.evaluation.etablissementId, etablissementId)));
  if (!evalRow) throw new ErreurMetier(404, 'evaluation_introuvable', 'Évaluation introuvable.');

  const elevesRows = await db
    .select({ eleveId: t.eleve.id, nom: t.personne.nom, prenoms: t.personne.prenoms, matricule: t.eleve.matricule })
    .from(t.inscription)
    .innerJoin(t.eleve, eq(t.eleve.id, t.inscription.eleveId))
    .innerJoin(t.personne, eq(t.personne.id, t.eleve.id))
    .where(
      and(
        eq(t.inscription.etablissementId, etablissementId),
        eq(t.inscription.classeId, evalRow.classeId),
        eq(t.inscription.anneeScolaireId, evalRow.anneeScolaireId),
      ),
    );
  const eleves: EleveConnu[] = elevesRows.map((e) => ({
    eleveId: e.eleveId,
    nom: e.nom,
    prenoms: e.prenoms,
    matricule: e.matricule,
  }));

  const misAJour = recalculerDerive(
    { ...formulaire, lignes: [...parIndex.values()].sort((a, b) => a.ligneIndex - b.ligneIndex) },
    eleves,
    toBareme({
      type: evalRow.baremeType,
      min: evalRow.baremeMin,
      max: evalRow.baremeMax,
      pas: evalRow.baremePas,
    }),
  );

  await db
    .update(t.lotSaisie)
    .set({ statut: 'en_revue', formulaireJson: misAJour, modifieLe: new Date() })
    .where(eq(t.lotSaisie.id, lotId));

  await db.insert(t.evenementAudit).values({
    id: randomUUID(),
    etablissementId,
    acteurId: userId,
    action: 'lot.correction',
    objetType: 'lot_saisie',
    objetId: lotId,
    resultat: 'ok',
    detailsJson: { editions: patch.editions.length },
  });

  return { formulaire: misAJour, empreinte: empreinteStable(misAJour) };
}
