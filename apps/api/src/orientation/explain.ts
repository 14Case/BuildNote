import type {
  AlternativeEcartee,
  DonneeUtilisee,
  Explication,
  ZoneIncertitude,
} from '@buildnote/shared';
import type { CompletudeFraicheur } from './gateway.js';
import type { ScenarioRegle } from './rules.js';

const donneesUtilisees = (c: CompletudeFraicheur, versionReferentiel: string): DonneeUtilisee[] => [
  {
    libelle: `Notes validées (${c.nb_notes_validees})`,
    source: 'Normalized — saisie établissement',
    fraicheur: c.derniere_note,
    fiabilite: 'elevee',
  },
  {
    libelle: "Aspirations de l'élève",
    source: 'Questionnaire élève',
    fraicheur: c.a_aspirations ? 'renseigné' : null,
    fiabilite: c.a_aspirations ? 'declarative' : 'absente',
  },
  {
    libelle: 'Avis des parents',
    source: 'Formulaire parent',
    fraicheur: c.a_avis_parents ? 'renseigné' : null,
    fiabilite: c.a_avis_parents ? 'declarative' : 'absente',
  },
  {
    libelle: 'Référentiel stratégique national',
    source: `Version ${versionReferentiel}`,
    fraicheur: versionReferentiel,
    fiabilite: 'sourcee',
  },
];

const zonesIncertitude = (
  c: CompletudeFraicheur,
  neutralisees: ScenarioRegle['categoriesNeutralisees'],
): ZoneIncertitude[] => {
  const zones: ZoneIncertitude[] = [];
  if (neutralisees.includes('avis_parents')) {
    zones.push({ cle_gabarit: 'incertitude.avis_parents_absent', params: {}, categorie_neutralisee: 'avis_parents' });
  }
  if (neutralisees.includes('aspirations_eleve')) {
    zones.push({ cle_gabarit: 'incertitude.aspirations_absentes', params: {}, categorie_neutralisee: 'aspirations_eleve' });
  }
  if (c.profondeur_historique_annees < 1.5) {
    zones.push({
      cle_gabarit: 'incertitude.historique_court',
      params: { annees: Math.round(c.profondeur_historique_annees * 10) / 10 },
      categorie_neutralisee: null,
    });
  }
  if (c.nb_notes_validees < 8) {
    zones.push({ cle_gabarit: 'incertitude.peu_de_notes', params: { nb: c.nb_notes_validees }, categorie_neutralisee: null });
  }
  return zones;
};

/**
 * Construit l'explication d'un scénario : les 5 blocs obligatoires (EF-M2-18).
 * Voir architecture-detaillee.md §J.3.6.
 */
export const construireExplication = (
  scenario: ScenarioRegle,
  completude: CompletudeFraicheur,
  versionReferentiel: string,
  alternativesTransverses: readonly AlternativeEcartee[],
): Explication => ({
  facteurs_determinants: scenario.facteurs,
  donnees_utilisees: donneesUtilisees(completude, versionReferentiel),
  alternatives_ecartees: [...alternativesTransverses].sort((a, b) => b.score - a.score),
  zones_incertitude: zonesIncertitude(completude, scenario.categoriesNeutralisees),
  repartition_score: scenario.repartition,
});
