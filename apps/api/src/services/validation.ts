import { randomUUID } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import {
  formulairePreremptSchema,
  type DemandeValidation,
  type FormulairePrerempt,
  type RapportConflit,
  type ResultatValidation,
} from '@buildnote/shared';
import type { Db } from '../db/client.js';
import * as t from '../db/schema.js';
import { ErreurMetier } from '../errors.js';
import { empreinteStable } from './empreinte.js';

export interface ContexteValidation {
  readonly db: Db;
  readonly etablissementId: string;
  readonly userId: string;
  readonly lotId: string;
  readonly demande: DemandeValidation;
}

function valeurAffichee(l: FormulairePrerempt['lignes'][number]['note']): string {
  if (l.statut) return l.statut;
  if (l.valeur != null) return String(l.valeur);
  return '∅';
}

/**
 * LA PORTE (EF-M1-10/11/13). Seule fonction du service qui écrit dans `note` (Normalized).
 * - exige une validation humaine explicite (schéma : `resumeAccepte = true`) ;
 * - vérifie l'empreinte du formulaire affiché (anti-écrasement) ;
 * - idempotente par `idempotencyKey` (rejeu hors-ligne) ;
 * - en cas de note déjà présente et différente : NE écrit RIEN, renvoie un rapport de conflit ;
 * - ne déclenche AUCUN traitement du Module 2 (EF-M1-19).
 */
export async function validerLot(
  ctx: ContexteValidation,
): Promise<
  | { type: 'valide'; resultat: ResultatValidation }
  | { type: 'conflit'; rapport: RapportConflit }
> {
  const { db, etablissementId, userId, lotId, demande } = ctx;

  // 1. Idempotence
  const [dejaFait] = await db
    .select()
    .from(t.idempotence)
    .where(and(eq(t.idempotence.cle, demande.idempotencyKey), eq(t.idempotence.etablissementId, etablissementId)));
  if (dejaFait) {
    if (dejaFait.lotSaisieId !== lotId) {
      throw new ErreurMetier(409, 'idempotency_key_reutilisee', 'Clé d’idempotence déjà utilisée pour un autre lot.');
    }
    return { type: 'valide', resultat: dejaFait.resultatJson as ResultatValidation };
  }

  // 2. Lot
  const [lot] = await db
    .select()
    .from(t.lotSaisie)
    .where(and(eq(t.lotSaisie.id, lotId), eq(t.lotSaisie.etablissementId, etablissementId)));
  if (!lot) throw new ErreurMetier(404, 'lot_introuvable', 'Lot introuvable.');
  if (lot.statut === 'valide') throw new ErreurMetier(409, 'lot_deja_valide', 'Ce lot est déjà validé.');
  if (!lot.formulaireJson) {
    throw new ErreurMetier(409, 'extraction_absente', 'Aucun formulaire à valider : lancez l’extraction.');
  }

  // 3. Empreinte (le formulaire validé doit être celui qui a été affiché)
  const formulaire = formulairePreremptSchema.parse(lot.formulaireJson);
  if (empreinteStable(formulaire) !== demande.empreinteFormulaire) {
    throw new ErreurMetier(
      409,
      'formulaire_perime',
      'Le formulaire a changé depuis son affichage : rechargez avant de valider.',
    );
  }

  // 4. Contexte évaluation → classe → année active
  const [evalRow] = await db
    .select({
      evaluationId: t.evaluation.id,
      enseignementId: t.evaluation.enseignementId,
      classeId: t.enseignement.classeId,
      anneeScolaireId: t.classe.anneeScolaireId,
    })
    .from(t.evaluation)
    .innerJoin(t.enseignement, eq(t.enseignement.id, t.evaluation.enseignementId))
    .innerJoin(t.classe, eq(t.classe.id, t.enseignement.classeId))
    .where(and(eq(t.evaluation.id, lot.evaluationId), eq(t.evaluation.etablissementId, etablissementId)));
  if (!evalRow) throw new ErreurMetier(404, 'evaluation_introuvable', 'Évaluation introuvable.');

  const colonneNote = formulaire.colonnesDetectees.find((c) => c.role === 'note')?.index ?? null;

  // 5. Lignes cibles (rapprochées à un élève)
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

  // 6. Détection de conflits (aucune écriture si conflit — EF-M1-16)
  const conflits: RapportConflit['conflits'] = [];
  const aEcrire: {
    ligne: (typeof lignesCibles)[number];
    inscriptionId: string;
  }[] = [];

  for (const ligne of lignesCibles) {
    const inscriptionId = inscriptionParEleve.get(ligne.rapprochement.eleveId!);
    if (!inscriptionId) continue; // élève non inscrit dans cette classe : ignoré (signalé au récap.)
    const existante = noteParInscription.get(inscriptionId);
    const proposee = valeurAffichee(ligne.note);
    if (existante) {
      const valeurExistante = existante.statut ?? (existante.valeur != null ? String(Number(existante.valeur)) : '∅');
      if (valeurExistante !== proposee) {
        conflits.push({
          eleveId: ligne.rapprochement.eleveId!,
          nomEleve: ligne.rapprochement.nomReconnu,
          evaluationId: lot.evaluationId,
          valeurExistante,
          valeurProposee: proposee,
        });
      }
      continue; // identique → rien à faire
    }
    aEcrire.push({ ligne, inscriptionId });
  }

  if (conflits.length > 0) {
    await db.update(t.lotSaisie).set({ statut: 'en_conflit', modifieLe: new Date() }).where(eq(t.lotSaisie.id, lotId));
    await db.insert(t.evenementAudit).values({
      id: randomUUID(),
      etablissementId,
      acteurId: userId,
      action: 'lot.validation.conflit',
      objetType: 'lot_saisie',
      objetId: lotId,
      resultat: 'conflit',
      detailsJson: { nb: conflits.length },
    });
    return { type: 'conflit', rapport: { lotId, statut: 'en_conflit', conflits } };
  }

  // 7. Écriture (transaction) — Normalized alimenté UNIQUEMENT ici
  const validationId = randomUUID();
  await db.transaction(async (tx) => {
    const extractions = await tx
      .select({ id: t.extractionOcr.id })
      .from(t.extractionOcr)
      .where(eq(t.extractionOcr.lotSaisieId, lotId));
    const extractionIds = extractions.map((e) => e.id);

    for (const { ligne, inscriptionId } of aEcrire) {
      const noteId = randomUUID();
      await tx.insert(t.note).values({
        id: noteId,
        etablissementId,
        evaluationId: lot.evaluationId,
        inscriptionId,
        valeur: ligne.note.valeur != null ? String(ligne.note.valeur) : null,
        valeurTexte: null,
        statut: ligne.note.statut,
        lotSaisieId: lotId,
        origine: ligne.note.source === 'corrige_manuellement' ? 'manuel' : 'ocr',
        creePar: userId,
      });

      if (ligne.appreciation && ligne.appreciation.texte.trim() !== '') {
        await tx.insert(t.appreciation).values({
          id: randomUUID(),
          etablissementId,
          noteId,
          texte: ligne.appreciation.texte.trim(),
          auteurId: userId,
        });
      }

      if (colonneNote != null && extractionIds.length) {
        await tx
          .update(t.celluleReconnue)
          .set({ noteId })
          .where(
            and(
              inArray(t.celluleReconnue.extractionOcrId, extractionIds),
              eq(t.celluleReconnue.ligne, ligne.ligneIndex),
              eq(t.celluleReconnue.colonne, colonneNote),
            ),
          );
      }
    }

    await tx.insert(t.validationTable).values({
      id: validationId,
      etablissementId,
      lotSaisieId: lotId,
      utilisateurId: userId,
      roleValidation: demande.roleValidation,
    });

    await tx.update(t.lotSaisie).set({ statut: 'valide', modifieLe: new Date() }).where(eq(t.lotSaisie.id, lotId));

    const resultat: ResultatValidation = {
      lotId,
      statut: 'valide',
      validationId,
      notesEcrites: aEcrire.length,
      contreValidationRequise: false,
    };

    await tx.insert(t.idempotence).values({
      cle: demande.idempotencyKey,
      etablissementId,
      lotSaisieId: lotId,
      resultatJson: resultat,
    });

    await tx.insert(t.evenementAudit).values({
      id: randomUUID(),
      etablissementId,
      acteurId: userId,
      action: 'lot.valide',
      objetType: 'lot_saisie',
      objetId: lotId,
      resultat: 'ok',
      detailsJson: { notesEcrites: aEcrire.length, role: demande.roleValidation },
    });
  });

  return {
    type: 'valide',
    resultat: { lotId, statut: 'valide', validationId, notesEcrites: aEcrire.length, contreValidationRequise: false },
  };
}
