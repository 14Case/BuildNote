import { randomUUID } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { type Consentement, type Instantane, normaliserNiveau } from '@buildnote/shared';
import type { Db } from '../db/client.js';
import * as t from '../db/schema.js';
import type {
  CompletudeFraicheur,
  DemandeSnapshot,
  NoteValidee,
  OrientationDataGateway,
  SaisiesModule2,
  SnapshotEleve,
} from './gateway.js';

/**
 * Passerelle d'accès aux données réelles de la base (Normalized) pour le Module 2.
 * Réf. architecture-detaillee.md §J.3.1 et ADR-0004 §3.
 *
 * Garde-fous absolus :
 * - Lecture À LA DEMANDE uniquement (aucun recalcul automatique sur écriture de note - EF-M1-19).
 * - Ne réalise AUCUNE écriture dans la couche Normalized (EF-M2-25).
 * - Cloisonnement strict par établissement_id sur toutes les requêtes (EF-SOC-06).
 */
export class DatabaseOrientationGateway implements OrientationDataGateway {
  constructor(private readonly db: Db) {}

  async lireConsentement(d: DemandeSnapshot): Promise<Consentement | null> {
    const [row] = await this.db
      .select()
      .from(t.consentementOrientation)
      .where(
        and(
          eq(t.consentementOrientation.etablissementId, d.etablissement_id),
          eq(t.consentementOrientation.eleveId, d.eleve_id),
          eq(t.consentementOrientation.anneeScolaireId, d.annee_scolaire_id),
        ),
      );

    if (!row) return null;

    return {
      eleve: row.consentementEleve,
      parents: row.consentementParents,
      enregistre_le: (row.dateConsentement ?? row.creeLe).toISOString(),
    };
  }

  async ouvrirSnapshot(d: DemandeSnapshot): Promise<SnapshotEleve> {
    // 1. Lire la classe et le niveau courant de l'élève
    const [inscrRow] = await this.db
      .select({
        classeId: t.classe.id,
        classeLibelle: t.classe.libelle,
      })
      .from(t.inscription)
      .innerJoin(t.classe, eq(t.classe.id, t.inscription.classeId))
      .where(
        and(
          eq(t.inscription.etablissementId, d.etablissement_id),
          eq(t.inscription.eleveId, d.eleve_id),
          eq(t.inscription.anneeScolaireId, d.annee_scolaire_id),
        ),
      );

    const niveauCourant = normaliserNiveau(inscrRow?.classeLibelle ?? '3eme');

    // 2. Lire les notes VALIDÉES (Normalized uniquement)
    const notesRows = await this.db
      .select({
        valeur: t.note.valeur,
        matiereFr: t.matiere.libelleFr,
        anneeScolaireId: t.inscription.anneeScolaireId,
        date: t.evaluation.date,
        baremeMax: t.bareme.max,
        coefficient: t.enseignement.coefficient,
      })
      .from(t.note)
      .innerJoin(t.inscription, eq(t.inscription.id, t.note.inscriptionId))
      .innerJoin(t.evaluation, eq(t.evaluation.id, t.note.evaluationId))
      .innerJoin(t.bareme, eq(t.bareme.id, t.evaluation.baremeId))
      .innerJoin(t.enseignement, eq(t.enseignement.id, t.evaluation.enseignementId))
      .innerJoin(t.matiere, eq(t.matiere.id, t.enseignement.matiereId))
      .where(
        and(
          eq(t.note.etablissementId, d.etablissement_id),
          eq(t.inscription.eleveId, d.eleve_id),
          isNull(t.note.statut),
        ),
      );

    const notesValidees: NoteValidee[] = notesRows
      .filter((r) => r.valeur !== null)
      .map((r) => ({
        matiere: r.matiereFr,
        annee_scolaire_id: r.anneeScolaireId,
        periode: 'Trimestre',
        valeur: Number(r.valeur),
        bareme_max: Number(r.baremeMax),
        coefficient: Number(r.coefficient ?? 1),
        date: r.date ? String(r.date) : new Date().toISOString().slice(0, 10),
      }));

    // 3. Lire les saisies du questionnaire (si existantes)
    const [questRow] = await this.db
      .select()
      .from(t.questionnaireOrientation)
      .where(
        and(
          eq(t.questionnaireOrientation.etablissementId, d.etablissement_id),
          eq(t.questionnaireOrientation.eleveId, d.eleve_id),
          eq(t.questionnaireOrientation.anneeScolaireId, d.annee_scolaire_id),
        ),
      );

    const saisies: SaisiesModule2 = {
      centres_interet: (questRow?.centresInteret as string[] | undefined) ?? [],
      matieres_preferees: (questRow?.matieresPreferees as string[] | undefined) ?? [],
      aspirations_metiers: (questRow?.aspirationsMetiers as string[] | undefined) ?? [],
      aspirations_maj_le: questRow?.modifieLe ? questRow.modifieLe.toISOString() : null,
      avis_parents: (questRow?.avisParents as { filieres_souhaitees: string[]; priorite: number } | null | undefined) ?? null,
      avis_parents_maj_le: questRow?.modifieLe ? questRow.modifieLe.toISOString() : null,
    };

    // 4. Calculer la complétude et fraîcheur
    const derniereNoteDate = notesValidees.length
      ? notesValidees.reduce((max, n) => (n.date > max ? n.date : max), notesValidees[0]!.date)
      : null;

    const anneesDistinctes = new Set(notesValidees.map((n) => n.annee_scolaire_id));

    const completude: CompletudeFraicheur = {
      nb_notes_validees: notesValidees.length,
      derniere_note: derniereNoteDate,
      profondeur_historique_annees: Math.max(1, anneesDistinctes.size),
      a_aspirations: saisies.aspirations_metiers.length > 0,
      a_avis_parents: saisies.avis_parents !== null,
      a_interets: saisies.centres_interet.length > 0,
    };

    const instantane: Instantane = {
      id: randomUUID(),
      horodatage: new Date().toISOString(),
    };

    return {
      instantane,
      eleve_id: d.eleve_id,
      etablissement_id: d.etablissement_id,
      annee_scolaire_id: d.annee_scolaire_id,
      niveau_courant: niveauCourant,
      notes_validees: notesValidees,
      saisies,
      completude,
      profil_existant: null,
    };
  }
}
