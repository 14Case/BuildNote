import type { Langue } from './ids.js';

/**
 * Catalogue de gabarits de texte FR/EN, versionné et revu.
 * Le texte du dossier d'orientation est **toujours** produit par ces gabarits —
 * aucun modèle génératif (gabarits-presentation.md §J.P.2).
 */

export const VERSION_CATALOGUE_GABARITS = 'gabarits-2026-09-1';

type ValeurParam = string | number;

export interface Gabarit {
  readonly fr: string;
  readonly en: string;
}

/**
 * Un gabarit = une phrase FR + sa contrepartie EN, avec des emplacements
 * `{nom}`. Les nombres signés utilisent `{nom:+}`.
 */
export const GABARITS = {
  // --- Facteurs déterminants (bloc 1) ---
  'facteur.profil.matieres_fortes': {
    fr: 'Matières fortes ({matieres}) en phase avec cette filière — contribution {contribution:+}.',
    en: 'Strong subjects ({matieres}) match this pathway — contribution {contribution:+}.',
  },
  'facteur.profil.tendance_positive': {
    fr: 'Résultats en progression régulière — contribution {contribution:+}.',
    en: 'Steadily improving results — contribution {contribution:+}.',
  },
  'facteur.aspiration.metier_couvert': {
    fr: "Métiers visés par l'élève ({metiers}) : cohérents avec cette filière — contribution {contribution:+}.",
    en: 'Careers the student is aiming for ({metiers}): consistent with this pathway — contribution {contribution:+}.',
  },
  'facteur.avis_parents.aligne': {
    fr: 'Souhait exprimé par les parents : aligné avec ce scénario — contribution {contribution:+}.',
    en: "Parents' stated preference: aligned with this scenario — contribution {contribution:+}.",
  },
  'facteur.offre.accessible': {
    fr: 'Offre accessible à {distance_km} km — contribution {contribution:+}.',
    en: 'Training available {distance_km} km away — contribution {contribution:+}.',
  },
  'facteur.offre.prerequis_partiels': {
    fr: 'Prérequis partiellement atteints ({matiere}) — contribution {contribution:+}.',
    en: 'Prerequisites partly met ({matiere}) — contribution {contribution:+}.',
  },
  'facteur.debouches.diversite': {
    fr: 'Débouchés variés pour cette filière — contribution {contribution:+}.',
    en: 'Varied career outcomes for this pathway — contribution {contribution:+}.',
  },
  'facteur.besoins_nationaux.tension': {
    fr: 'Métier en tension au niveau national ({metier}) — contribution {contribution:+}.',
    en: 'Nationally in-demand occupation ({metier}) — contribution {contribution:+}.',
  },

  // --- Zones d'incertitude (bloc 4) ---
  'incertitude.avis_parents_absent': {
    fr: "Avis des parents non renseigné : la catégorie correspondante est neutralisée (poids redistribué), la fiabilité globale est réduite.",
    en: 'No parental input recorded: that category is neutralised (weight redistributed), overall reliability is reduced.',
  },
  'incertitude.aspirations_absentes': {
    fr: "Aspirations de l'élève non renseignées : la catégorie correspondante est neutralisée, la fiabilité globale est réduite.",
    en: 'No student aspirations recorded: that category is neutralised, overall reliability is reduced.',
  },
  'incertitude.historique_court': {
    fr: 'Historique court ({annees} année(s)) : les tendances de performance sont indicatives.',
    en: 'Short history ({annees} year(s)): performance trends are indicative only.',
  },
  'incertitude.peu_de_notes': {
    fr: 'Peu de notes validées ({nb}) : le profil académique est provisoire.',
    en: 'Few validated marks ({nb}): the academic profile is provisional.',
  },

  // --- Avertissement de fiabilité (§J.P.6) ---
  'fiabilite.elevee': {
    fr: 'Dossier établi sur des données complètes et récentes.',
    en: 'This report is based on complete and recent data.',
  },
  'fiabilite.moyenne': {
    fr: 'Certaines informations manquent ({liste}). Les recommandations restent exploitables ; les compléter les affinera.',
    en: 'Some information is missing ({liste}). The recommendations are still usable; completing them will refine the results.',
  },
  'fiabilite.a_consolider': {
    fr: "Données insuffisantes pour un dossier robuste. À utiliser comme point de départ d'entretien uniquement.",
    en: 'Not enough data for a robust report. Use as a starting point for discussion only.',
  },

  // --- Alternatives écartées (bloc 3) ---
  'alternative.score_inferieur': {
    fr: 'Score inférieur aux scénarios retenus.',
    en: 'Lower score than the retained scenarios.',
  },
  'alternative.prerequis_non_atteint': {
    fr: 'Prérequis de filière non atteints ({matiere}).',
    en: 'Pathway prerequisites not met ({matiere}).',
  },
  'alternative.eloignement': {
    fr: "Aucune offre accessible à proximité (plus proche : {distance_km} km).",
    en: 'No training available nearby (closest: {distance_km} km).',
  },
  'alternative.capacite': {
    fr: 'Formation à capacité limitée pour ce profil.',
    en: 'Limited-capacity training for this profile.',
  },

  // --- Synthèse ---
  'synthese.entete': {
    fr: "Document d'aide à la décision. La décision revient au conseil d'orientation et à la famille.",
    en: 'Decision-support document. The decision rests with the guidance board and the family.',
  },
} as const satisfies Record<string, Gabarit>;

export type CleGabarit = keyof typeof GABARITS;

const formatValeur = (v: ValeurParam, signe: boolean): string => {
  if (typeof v === 'number') {
    const arrondi = Math.round(v * 100) / 100;
    return signe && arrondi >= 0 ? `+${arrondi}` : String(arrondi);
  }
  return v;
};

/** Rend un gabarit dans la langue demandée. Lève si une clé est inconnue ou
 *  si un emplacement n'est pas fourni (défaut détecté au test, pas en prod). */
export const rendreGabarit = (
  cle: CleGabarit,
  params: Record<string, ValeurParam>,
  langue: Langue,
): string => {
  const gabarit = GABARITS[cle];
  const modele = gabarit[langue];
  return modele.replace(/\{(\w+)(:\+)?\}/g, (_, nom: string, signe?: string) => {
    if (!(nom in params)) {
      throw new Error(`gabarit ${cle} : emplacement manquant « ${nom} »`);
    }
    return formatValeur(params[nom]!, signe === ':+');
  });
};

/** Liste des clés, pour le lint de complétude FR/EN en CI. */
export const CLES_GABARITS = Object.keys(GABARITS) as CleGabarit[];
