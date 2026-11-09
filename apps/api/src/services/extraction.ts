import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { EntreeImage, Extraction } from '@buildnote/shared';
import type { Db } from '../db/client.js';
import * as t from '../db/schema.js';
import { ErreurMetier } from '../errors.js';
import { MockOcrProvider } from '../ocr/mock-provider.js';
import { construireScenarioMock } from '../ocr/scenario.js';
import { construireFormulaire } from './form-builder.js';
import type { EleveConnu } from './matching.js';
import { toBareme } from './bareme-row.js';

export interface ContexteExtraction {
  readonly db: Db;
  readonly etablissementId: string;
  readonly userId: string;
  readonly lotId: string;
  readonly image: EntreeImage;
  readonly horsLigne: boolean;
}

/**
 * Étapes 3→8 du pipeline, derrière `OcrProvider` (fournisseur simulé — ADR-0001).
 * Écrit en Raw (`extraction_ocr`, `cellule_reconnue`) puis structure le formulaire prérempli
 * (stocké sur le lot). **N'écrit rien en Normalized.**
 */
export async function lancerExtraction(ctx: ContexteExtraction): Promise<{ extraction: Extraction }> {
  const { db, etablissementId, userId, lotId } = ctx;

  const [lot] = await db
    .select()
    .from(t.lotSaisie)
    .where(and(eq(t.lotSaisie.id, lotId), eq(t.lotSaisie.etablissementId, etablissementId)));
  if (!lot) throw new ErreurMetier(404, 'lot_introuvable', 'Lot introuvable.');
  if (lot.statut === 'valide') throw new ErreurMetier(409, 'lot_deja_valide', 'Lot déjà validé.');

  const [page] = await db
    .select({ id: t.pageDocument.id })
    .from(t.pageDocument)
    .innerJoin(t.documentSource, eq(t.documentSource.id, t.pageDocument.documentSourceId))
    .where(eq(t.documentSource.lotSaisieId, lotId))
    .orderBy(t.pageDocument.numero);
  if (!page) throw new ErreurMetier(409, 'aucun_media', 'Aucun média n’a été téléversé pour ce lot.');

  // Contexte métier
  const [evalRow] = await db
    .select({
      id: t.evaluation.id,
      libelle: t.evaluation.libelle,
      type: t.evaluation.type,
      date: t.evaluation.date,
      enseignementId: t.evaluation.enseignementId,
      baremeType: t.bareme.type,
      baremeMin: t.bareme.min,
      baremeMax: t.bareme.max,
      baremePas: t.bareme.pas,
      classeId: t.enseignement.classeId,
      anneeScolaireId: t.classe.anneeScolaireId,
      matiereFr: t.matiere.libelleFr,
    })
    .from(t.evaluation)
    .innerJoin(t.bareme, eq(t.bareme.id, t.evaluation.baremeId))
    .innerJoin(t.enseignement, eq(t.enseignement.id, t.evaluation.enseignementId))
    .innerJoin(t.classe, eq(t.classe.id, t.enseignement.classeId))
    .innerJoin(t.matiere, eq(t.matiere.id, t.enseignement.matiereId))
    .where(and(eq(t.evaluation.id, lot.evaluationId), eq(t.evaluation.etablissementId, etablissementId)));
  if (!evalRow) throw new ErreurMetier(404, 'evaluation_introuvable', 'Évaluation introuvable.');

  const bareme = toBareme({
    type: evalRow.baremeType,
    min: evalRow.baremeMin,
    max: evalRow.baremeMax,
    pas: evalRow.baremePas,
  });

  const elevesRows = await db
    .select({
      eleveId: t.eleve.id,
      nom: t.personne.nom,
      prenoms: t.personne.prenoms,
      matricule: t.eleve.matricule,
    })
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

  // OCR simulé
  const { structure } = construireScenarioMock(
    eleves.map((e) => ({ id: e.eleveId, nom: e.nom, prenoms: e.prenoms })),
    bareme,
    { graine: lotId, ligneNonRapprochee: true, horsBareme: 1 },
  );
  const provider = new MockOcrProvider({ structure });
  const structureDetectee = await provider.detecterStructure(ctx.image);
  const capacites = provider.capacites();
  const statut = structureDetectee.scoreStructure >= 0.5 ? 'ok' : 'structure_non_reconnue';

  const extractionId = randomUUID();
  const horodatage = new Date();

  await db.transaction(async (tx) => {
    await tx.insert(t.extractionOcr).values({
      id: extractionId,
      etablissementId,
      lotSaisieId: lotId,
      pageDocumentId: page.id,
      moteur: provider.nom,
      versionMoteur: provider.version,
      horodatage,
      statut,
      scoreGlobal: String(structureDetectee.scoreStructure),
      payloadJson: { structure: structureDetectee, capacites, horsLigne: ctx.horsLigne },
    });

    for (const cell of structureDetectee.cellules) {
      const colonne = structureDetectee.colonnes.find((c) => c.index === cell.colonne);
      await tx.insert(t.celluleReconnue).values({
        id: randomUUID(),
        extractionOcrId: extractionId,
        ligne: cell.ligne,
        colonne: cell.colonne,
        roleColonne: colonne?.role ?? 'autre',
        texteReconnu: cell.reconnaissance.texte,
        scoreConfiance: String(cell.reconnaissance.score),
        bbox: cell.reconnaissance.bbox,
        noteId: null,
      });
    }

    const formulaire = construireFormulaire({
      lotId,
      evaluation: {
        id: evalRow.id,
        libelle: evalRow.libelle,
        type: evalRow.type,
        date: evalRow.date,
        matiere: evalRow.matiereFr,
      },
      bareme,
      structure: structureDetectee,
      eleves,
    });

    await tx
      .update(t.lotSaisie)
      .set({ statut: 'extraction_faite', formulaireJson: formulaire, modifieLe: new Date() })
      .where(eq(t.lotSaisie.id, lotId));

    await tx.insert(t.evenementAudit).values({
      id: randomUUID(),
      etablissementId,
      acteurId: userId,
      action: 'lot.extraction',
      objetType: 'lot_saisie',
      objetId: lotId,
      resultat: statut,
      detailsJson: { moteur: provider.nom, lignes: structureDetectee.nbLignes },
    });
  });

  return {
    extraction: {
      id: extractionId,
      lotId,
      moteur: provider.nom,
      versionMoteur: provider.version,
      scoreGlobal: structureDetectee.scoreStructure,
      statut,
      horodatage: horodatage.toISOString(),
    },
  };
}
