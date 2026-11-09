import type { Consentement } from '@buildnote/shared';
import {
  GatewayFixture,
  PonderationsFixture,
  ReferentialFixture,
  type DependancesOrientation,
  type DonneesEleveFixture,
} from '../../src/orientation/index.js';

export const CONSENTEMENT_OK: Consentement = {
  eleve: true,
  parents: true,
  enregistre_le: '2026-09-01T09:00:00.000Z',
};

const notes = (matiere: string, valeurs: number[], anneeBase = 2025) =>
  valeurs.map((v, i) => ({
    matiere,
    annee_scolaire_id: `${anneeBase + Math.floor(i / 3)}-${anneeBase + 1 + Math.floor(i / 3)}`,
    periode: `T${(i % 3) + 1}`,
    valeur: v,
    bareme_max: 20,
    coefficient: 4,
    date: `${anneeBase + Math.floor(i / 3)}-${String(((i % 3) * 3) + 3).padStart(2, '0')}-15`,
  }));

export const eleveComplet: DonneesEleveFixture = {
  consentement: CONSENTEMENT_OK,
  snapshot: {
    eleve_id: 'el-1',
    etablissement_id: 'et-1',
    annee_scolaire_id: '2025-2026',
    niveau_courant: '3eme',
    notes_validees: [
      ...notes('Mathématiques', [14, 15, 16, 15, 17, 18]),
      ...notes('Physique', [13, 14, 14, 15, 16, 16]),
      ...notes('Français', [11, 10, 12, 11, 10, 11]),
    ],
    saisies: {
      centres_interet: ['informatique'],
      matieres_preferees: ['Mathématiques'],
      aspirations_metiers: ['met-data'],
      aspirations_maj_le: '2026-05-02',
      avis_parents: { filieres_souhaitees: ['fil-sciences'], priorite: 0.8 },
      avis_parents_maj_le: '2026-05-10',
    },
    completude: {
      nb_notes_validees: 18,
      derniere_note: '2026-05-15',
      profondeur_historique_annees: 2,
      a_aspirations: true,
      a_avis_parents: true,
      a_interets: true,
    },
    profil_existant: null,
  },
};

export const eleveSansAvisParents: DonneesEleveFixture = {
  consentement: CONSENTEMENT_OK,
  snapshot: {
    ...eleveComplet.snapshot,
    saisies: { ...eleveComplet.snapshot.saisies, avis_parents: null, avis_parents_maj_le: null },
    completude: { ...eleveComplet.snapshot.completude, a_avis_parents: false },
  },
};

export const eleveCM2: DonneesEleveFixture = {
  consentement: CONSENTEMENT_OK,
  snapshot: {
    eleve_id: 'el-cm2',
    etablissement_id: 'et-1',
    annee_scolaire_id: '2025-2026',
    niveau_courant: 'CM2',
    notes_validees: [
      ...notes('Français', [13, 14, 15]),
      ...notes('Mathématiques', [12, 13, 14]),
    ],
    saisies: {
      centres_interet: ['dessin', 'bricolage'],
      matieres_preferees: ['Mathématiques'],
      aspirations_metiers: [],
      aspirations_maj_le: '2026-05-02',
      avis_parents: { filieres_souhaitees: ['fil-sec-general'], priorite: 0.8 },
      avis_parents_maj_le: '2026-05-10',
    },
    completude: {
      nb_notes_validees: 6,
      derniere_note: '2026-05-15',
      profondeur_historique_annees: 1,
      a_aspirations: false,
      a_avis_parents: true,
      a_interets: true,
    },
    profil_existant: null,
  },
};

export const eleveTerminale: DonneesEleveFixture = {
  consentement: CONSENTEMENT_OK,
  snapshot: {
    eleve_id: 'el-tle',
    etablissement_id: 'et-1',
    annee_scolaire_id: '2025-2026',
    niveau_courant: 'Terminale',
    notes_validees: [
      ...notes('Mathématiques', [15, 16, 17]),
      ...notes('Physique', [14, 15, 16]),
    ],
    saisies: {
      centres_interet: ['technologie'],
      matieres_preferees: ['Mathématiques'],
      aspirations_metiers: ['met-ing'],
      aspirations_maj_le: '2026-05-02',
      avis_parents: { filieres_souhaitees: ['fil-superieur-ingenierie'], priorite: 0.9 },
      avis_parents_maj_le: '2026-05-10',
    },
    completude: {
      nb_notes_validees: 6,
      derniere_note: '2026-05-15',
      profondeur_historique_annees: 1,
      a_aspirations: true,
      a_avis_parents: true,
      a_interets: true,
    },
    profil_existant: null,
  },
};

export const eleveSansConsentement: DonneesEleveFixture = {
  consentement: { eleve: true, parents: false, enregistre_le: '2026-09-01T09:00:00.000Z' },
  snapshot: eleveComplet.snapshot,
};

export const deps = (
  parEleve: Record<string, DonneesEleveFixture>,
): DependancesOrientation & { gateway: GatewayFixture } => {
  const gateway = new GatewayFixture(new Map(Object.entries(parEleve)));
  return {
    gateway,
    referentiel: new ReferentialFixture(),
    ponderations: new PonderationsFixture(),
    nouvelId: () => 'dem-test-1',
    positionEleve: async () => ({ lat: 4.02, lon: 9.79 }),
    distanceMaxKm: 60,
  };
};
