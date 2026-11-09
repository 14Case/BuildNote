import {
  rendreGabarit,
  VERSION_CATALOGUE_GABARITS,
  type AvertissementFiabilite,
  type DemandeOrientation,
  type DossierOrientation,
  type Langue,
  type NiveauFiabilite,
  type ScenarioDossier,
} from '@buildnote/shared';
import type { CompletudeFraicheur } from './gateway.js';
import { verifierNonPrescription } from './rules.js';

/** Niveau de fiabilité gradué (gabarits-presentation.md §J.P.6). */
export const niveauFiabilite = (c: CompletudeFraicheur): NiveauFiabilite => {
  const categoriesClesAbsentes = [!c.a_aspirations, !c.a_avis_parents].filter(Boolean).length;
  if (categoriesClesAbsentes >= 2 || c.nb_notes_validees < 8 || c.profondeur_historique_annees < 1) {
    return 'a_consolider';
  }
  if (categoriesClesAbsentes === 1 || c.profondeur_historique_annees < 2) return 'moyenne';
  return 'elevee';
};

const listeManques = (c: CompletudeFraicheur): string[] => {
  const m: string[] = [];
  if (!c.a_aspirations) m.push('aspirations');
  if (!c.a_avis_parents) m.push('avis des parents');
  if (!c.a_interets) m.push("centres d'intérêt");
  if (c.profondeur_historique_annees < 2) m.push('historique de notes');
  return m;
};

export const construireAvertissement = (
  c: CompletudeFraicheur,
  langue: Langue,
): AvertissementFiabilite => {
  const niveau = niveauFiabilite(c);
  const manques = listeManques(c);
  const cle_gabarit =
    niveau === 'elevee'
      ? 'fiabilite.elevee'
      : niveau === 'moyenne'
        ? 'fiabilite.moyenne'
        : 'fiabilite.a_consolider';
  const params = niveau === 'moyenne' ? { liste: manques.join(', ') } : {};
  // rendu vérifié ici pour lever tôt en cas de gabarit non conforme
  verifierNonPrescription([rendreGabarit(cle_gabarit, params, langue)]);
  return { niveau, cle_gabarit, params, a_completer: manques };
};

const synthese = (langue: Langue, scenarios: readonly ScenarioDossier[]): string => {
  const entete = rendreGabarit('synthese.entete', {}, langue);
  const tetes = scenarios
    .slice(0, 3)
    .map((s) => s.scenario.filiere_libelle)
    .join(' · ');
  return langue === 'fr'
    ? `Pistes de tête : ${tetes || '—'}. ${entete}`
    : `Leading options: ${tetes || '—'}. ${entete}`;
};

/**
 * Assemble le dossier d'orientation (gabarits-presentation.md §J.P.3).
 * N'écrit rien dans Normalized (EF-M2-25) : renvoie un objet pur.
 */
export const assemblerDossier = (args: {
  demande: DemandeOrientation;
  scenarios: ScenarioDossier[];
  completude: CompletudeFraicheur;
  versionReferentielId: string;
  ancienneteMedianeMois: number;
  versionPonderations: string;
  numeroVersion: number;
  motif: 'initial' | 'revision';
}): DossierOrientation => {
  const avertissement_fiabilite = construireAvertissement(args.completude, args.demande.langue);
  return {
    demande: args.demande,
    numero_version: args.numeroVersion,
    genere_le: args.demande.instantane.horodatage,
    motif: args.motif,
    synthese: synthese(args.demande.langue, args.scenarios),
    avertissement_fiabilite,
    scenarios: args.scenarios,
    version_referentiel_id: args.versionReferentielId,
    anciennete_mediane_donnees_mois: args.ancienneteMedianeMois,
    version_ponderations: args.versionPonderations,
    version_catalogue_gabarits: VERSION_CATALOGUE_GABARITS,
  };
};
