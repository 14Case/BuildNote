import type {
  AnneeScolaireId,
  Consentement,
  EleveId,
  EtablissementId,
  Instantane,
  ProfilAcademique,
} from '@buildnote/shared';

/**
 * Couche d'accès aux données du moteur d'orientation (architecture-detaillee.md §J.3.1).
 *
 * Point d'entrée **unique** de toute lecture. Contrats :
 * - lecture **à la demande** uniquement (aucun déclenchement sur écriture de note) ;
 * - **instantané cohérent** figé à t0 et identifié ;
 * - **cloisonnement** : `etablissement_id` obligatoire sur chaque appel ;
 * - le moteur n'écrit **rien** (aucune méthode d'écriture ici — EF-M2-25).
 */

/** Note validée, telle que lue depuis Normalized (jamais une note non validée). */
export interface NoteValidee {
  readonly matiere: string;
  readonly annee_scolaire_id: AnneeScolaireId;
  readonly periode: string;
  readonly valeur: number;
  readonly bareme_max: number;
  readonly coefficient: number;
  readonly date: string;
}

export interface SaisiesModule2 {
  readonly centres_interet: readonly string[];
  readonly matieres_preferees: readonly string[];
  readonly aspirations_metiers: readonly string[];
  readonly aspirations_maj_le: string | null;
  readonly avis_parents: { readonly filieres_souhaitees: readonly string[]; readonly priorite: number } | null;
  readonly avis_parents_maj_le: string | null;
}

/** Mesure de complétude / fraîcheur alimentant l'indice de fiabilité (EF-M2-21). */
export interface CompletudeFraicheur {
  readonly nb_notes_validees: number;
  readonly derniere_note: string | null;
  readonly profondeur_historique_annees: number;
  readonly a_aspirations: boolean;
  readonly a_avis_parents: boolean;
  readonly a_interets: boolean;
}

/** Instantané cohérent de l'élève au moment de la demande. */
export interface SnapshotEleve {
  readonly instantane: Instantane;
  readonly eleve_id: EleveId;
  readonly etablissement_id: EtablissementId;
  readonly annee_scolaire_id: AnneeScolaireId;
  readonly niveau_courant: string;
  readonly notes_validees: readonly NoteValidee[];
  readonly saisies: SaisiesModule2;
  readonly completude: CompletudeFraicheur;
  /** Profil Intelligence si déjà calculé et frais ; sinon null → profilage à la demande. */
  readonly profil_existant: ProfilAcademique | null;
}

export interface DemandeSnapshot {
  readonly eleve_id: EleveId;
  readonly etablissement_id: EtablissementId;
  readonly annee_scolaire_id: AnneeScolaireId;
}

export interface OrientationDataGateway {
  /** Consentement Module 2 enregistré pour l'élève (EF-M2-11). */
  lireConsentement(d: DemandeSnapshot): Promise<Consentement | null>;

  /**
   * Fige et renvoie l'instantané cohérent. Toute lecture est restreinte à
   * `etablissement_id` (cloisonnement). Ne réalise aucune écriture.
   */
  ouvrirSnapshot(d: DemandeSnapshot): Promise<SnapshotEleve>;
}
