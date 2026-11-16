import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { arbitrerConflitNote, normaliserNom } from '@buildnote/shared';
import type { Db } from '../db/client.js';
import * as t from '../db/schema.js';
import type { ResultatMapping } from './mapping-engine.js';

export interface RapportImportDetaille {
  importLotId: string;
  sourceRef: string;
  statut: 'termine' | 'partiel' | 'erreur';
  lignesTotal: number;
  lignesSucces: number;
  lignesQuarantaine: number;
  lignesConflit: number;
  elevesTraites: number;
  notesInserees: number;
  notesIgnoreesOuIdentiques: number;
  horodatage: string;
}

/**
 * Service d'exécution d'un import de données canoniques dans PostgreSQL (Lot L5).
 * Réf. docs/07-interoperabilite/architecture-detaillee.md §H.4 et §H.5.
 *
 * Garde-fous non négociables :
 * - EF-M1-16 / H.5.3 : Aucune note validée par le Module 1 n'est écrasée silencieusement.
 * - EF-SOC-06 : Isolation multi-tenant stricte par etablissement_id.
 * - Idempotence : un ré-import du même fichier ne duplique ni n'altère les notes identiques.
 */
export async function executerImportCanonique(
  db: Db,
  etablissementId: string,
  userId: string,
  resultat: ResultatMapping,
): Promise<RapportImportDetaille> {
  const importLotId = randomUUID();
  const lot = resultat.lot;

  let lignesSucces = 0;
  let lignesConflit = 0;
  let elevesTraites = 0;
  let notesInserees = 0;
  let notesIgnorees = 0;

  await db.transaction(async (tx) => {
    // 1. Initialiser le lot d'import dans l'historique
    await tx.insert(t.importLot).values({
      id: importLotId,
      etablissementId,
      sourceRef: lot.source,
      formatSource: 'csv_tabulaire',
      versionCanonique: lot.versionSchema,
      statut: 'en_cours',
      lignesTotal: resultat.statistiques.lignesLues,
      lignesSucces: 0,
      lignesQuarantaine: resultat.quarantaines.length,
      lignesConflit: 0,
      creePar: userId,
    });

    // 2. Enregistrer les éventuelles lignes de quarantaine identifiées dès le parsing
    for (const q of resultat.quarantaines) {
      await tx.insert(t.importQuarantaine).values({
        id: randomUUID(),
        etablissementId,
        importLotId,
        ligneNumero: q.ligneNumero,
        entite: q.entite,
        motifCode: q.motifCode,
        message: q.message,
        donneesBrutes: q.donneesBrutes,
        statut: 'en_quarantaine',
      });
    }

    // 3. Résolution ou création de l'Année Scolaire
    let [anneeRow] = await tx
      .select()
      .from(t.anneeScolaire)
      .where(
        and(
          eq(t.anneeScolaire.etablissementId, etablissementId),
          eq(t.anneeScolaire.libelle, lot.anneeScolaire),
        ),
      );

    if (!anneeRow) {
      const anneeId = randomUUID();
      await tx.insert(t.anneeScolaire).values({
        id: anneeId,
        etablissementId,
        libelle: lot.anneeScolaire,
        active: true,
      });
      [anneeRow] = await tx.select().from(t.anneeScolaire).where(eq(t.anneeScolaire.id, anneeId));
    }

    // 4. Résolution ou création des Classes
    const classeIdMap = new Map<string, string>();
    for (const c of lot.classes) {
      let [clRow] = await tx
        .select()
        .from(t.classe)
        .where(
          and(
            eq(t.classe.etablissementId, etablissementId),
            eq(t.classe.anneeScolaireId, anneeRow!.id),
            eq(t.classe.libelle, c.libelle),
          ),
        );

      if (!clRow) {
        const clId = randomUUID();
        await tx.insert(t.classe).values({
          id: clId,
          etablissementId,
          anneeScolaireId: anneeRow!.id,
          libelle: c.libelle,
          effectif: 0,
        });
        classeIdMap.set(c.libelle, clId);
      } else {
        classeIdMap.set(c.libelle, clRow.id);
      }
    }

    // 5. Résolution ou création des Matières
    const matiereIdMap = new Map<string, string>();
    for (const m of lot.matieres) {
      let [matRow] = await tx
        .select()
        .from(t.matiere)
        .where(
          and(
            eq(t.matiere.etablissementId, etablissementId),
            eq(t.matiere.libelleFr, m.libelleFr),
          ),
        );

      if (!matRow) {
        const matId = randomUUID();
        await tx.insert(t.matiere).values({
          id: matId,
          etablissementId,
          libelleFr: m.libelleFr,
          libelleEn: m.libelleEn || m.libelleFr,
        });
        matiereIdMap.set(m.code, matId);
        matiereIdMap.set(m.libelleFr, matId);
      } else {
        matiereIdMap.set(m.code, matRow.id);
        matiereIdMap.set(m.libelleFr, matRow.id);
      }
    }

    // 6. Barème par défaut sur 20
    let [baremeRow] = await tx
      .select()
      .from(t.bareme)
      .where(
        and(
          eq(t.bareme.etablissementId, etablissementId),
          eq(t.bareme.type, 'sur_20'),
        ),
      );

    if (!baremeRow) {
      const baremeId = randomUUID();
      await tx.insert(t.bareme).values({
        id: baremeId,
        etablissementId,
        type: 'sur_20',
        min: '0',
        max: '20',
        pas: '0.25',
      });
      [baremeRow] = await tx.select().from(t.bareme).where(eq(t.bareme.id, baremeId));
    }

    // 7. Enseignant par défaut pour les enseignements importés
    let [ensProf] = await tx
      .select({ id: t.enseignant.id })
      .from(t.enseignant)
      .innerJoin(t.personne, eq(t.personne.id, t.enseignant.id))
      .where(eq(t.personne.etablissementId, etablissementId));

    if (!ensProf) {
      const pId = randomUUID();
      await tx.insert(t.personne).values({
        id: pId,
        etablissementId,
        nom: 'SYSTÈME',
        prenoms: 'Import',
        nomNormalise: 'SYSTEME IMPORT',
      });
      await tx.insert(t.enseignant).values({ id: pId });
      ensProf = { id: pId };
    }
    const enseignantId = ensProf.id;

    // 8. Évaluations et Enseignements
    const evaluationIdMap = new Map<string, string>();
    for (const ev of lot.evaluations) {
      const classeId = classeIdMap.get(ev.classeLibelle);
      const matiereId = matiereIdMap.get(ev.matiereCode);
      if (!classeId || !matiereId) continue;

      // Enseignement
      let [ensRow] = await tx
        .select()
        .from(t.enseignement)
        .where(
          and(
            eq(t.enseignement.etablissementId, etablissementId),
            eq(t.enseignement.classeId, classeId),
            eq(t.enseignement.matiereId, matiereId),
          ),
        );

      if (!ensRow) {
        const ensId = randomUUID();
        await tx.insert(t.enseignement).values({
          id: ensId,
          etablissementId,
          classeId,
          matiereId,
          enseignantId,
          coefficient: '1',
        });
        [ensRow] = await tx.select().from(t.enseignement).where(eq(t.enseignement.id, ensId));
      }

      // Évaluation
      let [evalRow] = await tx
        .select()
        .from(t.evaluation)
        .where(
          and(
            eq(t.evaluation.etablissementId, etablissementId),
            eq(t.evaluation.enseignementId, ensRow!.id),
            eq(t.evaluation.libelle, ev.libelle),
          ),
        );

      if (!evalRow) {
        const evalId = randomUUID();
        await tx.insert(t.evaluation).values({
          id: evalId,
          etablissementId,
          enseignementId: ensRow!.id,
          baremeId: baremeRow!.id,
          libelle: ev.libelle,
          type: ev.type,
          date: ev.date ? String(ev.date) : new Date().toISOString().slice(0, 10),
        });
        evaluationIdMap.set(ev.libelle, evalId);
      } else {
        evaluationIdMap.set(ev.libelle, evalRow.id);
      }
    }

    // 9. Personnes, Élèves et Inscriptions
    const eleveIdMap = new Map<string, string>(); // clé: nom_prenoms -> eleveId
    const inscriptionIdMap = new Map<string, string>(); // clé: eleveId_classeId -> inscriptionId

    for (const el of lot.eleves) {
      const classeId = classeIdMap.get(el.classeLibelle);
      if (!classeId) continue;

      // Recherche par matricule si disponible, sinon nom normalisé
      let eleveId: string | null = null;

      if (el.matricule) {
        const [existingMat] = await tx
          .select({ id: t.eleve.id })
          .from(t.eleve)
          .innerJoin(t.personne, eq(t.personne.id, t.eleve.id))
          .where(
            and(
              eq(t.personne.etablissementId, etablissementId),
              eq(t.eleve.matricule, el.matricule),
            ),
          );
        if (existingMat) eleveId = existingMat.id;
      }

      if (!eleveId) {
        const nomNorm = normaliserNom(`${el.nom} ${el.prenoms}`);
        const [existingPers] = await tx
          .select({ id: t.personne.id })
          .from(t.personne)
          .where(
            and(
              eq(t.personne.etablissementId, etablissementId),
              eq(t.personne.nomNormalise, nomNorm),
            ),
          );
        if (existingPers) eleveId = existingPers.id;
      }

      if (!eleveId) {
        eleveId = randomUUID();
        await tx.insert(t.personne).values({
          id: eleveId,
          etablissementId,
          nom: el.nom,
          prenoms: el.prenoms,
          nomNormalise: normaliserNom(`${el.nom} ${el.prenoms}`),
          dateNaissance: el.dateNaissance ? String(el.dateNaissance) : null,
        });

        await tx.insert(t.eleve).values({
          id: eleveId,
          matricule: el.matricule ?? null,
          codeNational: el.codeNational ?? null,
        });
        elevesTraites++;
      }

      const cleEleve = el.matricule || `${el.nom}_${el.prenoms}`;
      eleveIdMap.set(cleEleve, eleveId);
      eleveIdMap.set(`${el.nom}_${el.prenoms}`, eleveId);

      // Inscription
      let [inscrRow] = await tx
        .select()
        .from(t.inscription)
        .where(
          and(
            eq(t.inscription.etablissementId, etablissementId),
            eq(t.inscription.classeId, classeId),
            eq(t.inscription.eleveId, eleveId),
            eq(t.inscription.anneeScolaireId, anneeRow!.id),
          ),
        );

      if (!inscrRow) {
        const inscrId = randomUUID();
        await tx.insert(t.inscription).values({
          id: inscrId,
          etablissementId,
          eleveId,
          classeId,
          anneeScolaireId: anneeRow!.id,
          statut: 'active',
        });
        inscriptionIdMap.set(`${eleveId}_${classeId}`, inscrId);
      } else {
        inscriptionIdMap.set(`${eleveId}_${classeId}`, inscrRow.id);
      }
    }

    // 10. Traitement des Notes avec GARDE-FOU ANTI-ÉCRASEMENT (EF-M1-16 / H.5.3)
    for (let i = 0; i < lot.notes.length; i++) {
      const n = lot.notes[i]!;
      const classeId = classeIdMap.get(n.classeLibelle);
      const evalId = evaluationIdMap.get(n.evaluationLibelle);
      const eleveCle = n.eleveMatricule || `${n.eleveNom}_${n.elevePrenoms ?? ''}`;
      const eleveId = eleveIdMap.get(eleveCle) ?? eleveIdMap.get(`${n.eleveNom}_${n.elevePrenoms ?? ''}`);

      if (!classeId || !evalId || !eleveId) {
        continue;
      }

      const inscrId = inscriptionIdMap.get(`${eleveId}_${classeId}`);
      if (!inscrId) continue;

      // Vérifier si une note existe déjà pour cette évaluation et cette inscription
      const [noteExistante] = await tx
        .select()
        .from(t.note)
        .where(
          and(
            eq(t.note.etablissementId, etablissementId),
            eq(t.note.evaluationId, evalId),
            eq(t.note.inscriptionId, inscrId),
          ),
        );

      if (noteExistante) {
        const valExistante = noteExistante.valeur !== null ? Number(noteExistante.valeur) : null;
        const arbitrage = arbitrerConflitNote(
          valExistante,
          noteExistante.origine,
          n.valeur,
        );

        if (arbitrage.enConflit && arbitrage.doitAllerEnRevue) {
          // Conflit détecté avec une note existante protégée (ex: validée Module 1)
          lignesConflit++;
          await tx.insert(t.importQuarantaine).values({
            id: randomUUID(),
            etablissementId,
            importLotId,
            ligneNumero: i + 1,
            entite: 'Note',
            motifCode: arbitrage.motif,
            message: `Conflit non écrasé : valeur existante (${valExistante}) vs importée (${n.valeur})`,
            donneesBrutes: {
              eleve: `${n.eleveNom} ${n.elevePrenoms ?? ''}`,
              evaluation: n.evaluationLibelle,
              valeurExistante: valExistante,
              valeurImportee: n.valeur,
              origineExistante: noteExistante.origine,
            },
            statut: 'en_quarantaine',
          });
          continue;
        }

        // Si valeur identique, idempotent
        notesIgnorees++;
        lignesSucces++;
        continue;
      }

      // Création de la nouvelle note
      const noteId = randomUUID();
      await tx.insert(t.note).values({
        id: noteId,
        etablissementId,
        evaluationId: evalId,
        inscriptionId: inscrId,
        valeur: n.valeur !== null ? String(n.valeur) : null,
        statut: n.statut === 'absent' ? 'absent' : null,
        lotSaisieId: null,
        origine: 'import',
        creePar: userId,
      });

      // Écriture du lineage (traçabilité H.6)
      await tx.insert(t.donneeLineage).values({
        id: randomUUID(),
        etablissementId,
        entiteType: 'note',
        entiteId: noteId,
        sourceType: 'import_csv',
        sourceRef: lot.source,
        importLotId,
        transformations: ['parser_tabulaire', 'normaliser_notes'],
      });

      notesInserees++;
      lignesSucces++;
    }

    // 11. Finaliser le rapport d'import
    const statutFinal =
      lignesConflit > 0 || resultat.quarantaines.length > 0 ? 'partiel' : 'termine';

    const rapportJson: RapportImportDetaille = {
      importLotId,
      sourceRef: lot.source,
      statut: statutFinal,
      lignesTotal: resultat.statistiques.lignesLues,
      lignesSucces,
      lignesQuarantaine: resultat.quarantaines.length,
      lignesConflit,
      elevesTraites,
      notesInserees,
      notesIgnoreesOuIdentiques: notesIgnorees,
      horodatage: new Date().toISOString(),
    };

    await tx
      .update(t.importLot)
      .set({
        statut: statutFinal,
        lignesSucces,
        lignesConflit,
        rapportJson,
      })
      .where(eq(t.importLot.id, importLotId));
  });

  return {
    importLotId,
    sourceRef: lot.source,
    statut: lignesConflit > 0 || resultat.quarantaines.length > 0 ? 'partiel' : 'termine',
    lignesTotal: resultat.statistiques.lignesLues,
    lignesSucces,
    lignesQuarantaine: resultat.quarantaines.length,
    lignesConflit,
    elevesTraites,
    notesInserees,
    notesIgnoreesOuIdentiques: notesIgnorees,
    horodatage: new Date().toISOString(),
  };
}
