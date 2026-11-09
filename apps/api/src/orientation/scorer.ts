import {
  CATEGORIES_SCORE,
  type CategorieScore,
  type EntreeStrategiqueNationale,
  type Facteur,
  type Filiere,
  type JeuPonderations,
  type Metier,
  type ProfilAcademique,
  type RepartitionScore,
  type ScenarioCandidat,
} from '@buildnote/shared';
import type { SaisiesModule2 } from './gateway.js';

export interface ContexteScoring {
  readonly filiere: Filiere;
  readonly metiersParId: ReadonlyMap<string, Metier>;
  readonly entreesStrategiques: readonly EntreeStrategiqueNationale[];
}

export interface CategorieEvaluee {
  readonly valeur: number;
  /** null si la catégorie est neutralisée (donnée absente). */
  readonly neutralisee: boolean;
  readonly facteurs: Facteur[];
}

export interface ScenarioEvalue {
  readonly candidat: ScenarioCandidat;
  readonly score: number;
  readonly facteurs: Facteur[];
  readonly repartition: RepartitionScore;
  readonly categoriesNeutralisees: CategorieScore[];
}

const borne = (x: number): number => Math.max(0, Math.min(1, x));
const moyenne = (xs: readonly number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((s, x) => s + x, 0) / xs.length;

/** Adéquation profil ↔ prérequis de filière + tendance. */
const evalProfil = (profil: ProfilAcademique, ctx: ContexteScoring): CategorieEvaluee => {
  const perfParMatiere = new Map(profil.performances.map((p) => [p.matiere, p]));
  const prereq = ctx.filiere.prerequis;
  const adequation =
    prereq.length === 0
      ? moyenne(profil.performances.map((p) => p.niveau))
      : moyenne(
          prereq.map((r) => {
            const p = perfParMatiere.get(r.matiere);
            return p ? borne(p.niveau / Math.max(0.01, r.niveau_min)) : 0;
          }),
        );
  const tendance = borne(0.5 + moyenne(profil.performances.map((p) => p.tendance)) * 5);
  const valeur = borne(0.7 * adequation + 0.3 * tendance);
  const facteurs: Facteur[] = [];
  if (profil.matieres_fortes.length > 0) {
    facteurs.push({
      categorie: 'profil_eleve',
      cle_gabarit: 'facteur.profil.matieres_fortes',
      params: { matieres: profil.matieres_fortes.join(', ') },
      valeur: adequation,
      contribution: 0,
    });
  }
  if (tendance > 0.55) {
    facteurs.push({
      categorie: 'profil_eleve',
      cle_gabarit: 'facteur.profil.tendance_positive',
      params: {},
      valeur: tendance,
      contribution: 0,
    });
  }
  return { valeur, neutralisee: false, facteurs };
};

const evalAspirations = (
  saisies: SaisiesModule2,
  candidat: ScenarioCandidat,
  ctx: ContexteScoring,
): CategorieEvaluee => {
  const aRien =
    saisies.aspirations_metiers.length === 0 &&
    saisies.centres_interet.length === 0 &&
    saisies.matieres_preferees.length === 0;
  if (aRien) return { valeur: 0, neutralisee: true, facteurs: [] };

  const metiersScenario = new Set(candidat.metiers.map((m) => m.id));
  const vises = saisies.aspirations_metiers.filter((id) => metiersScenario.has(id));
  const proximite = candidat.metiers.length === 0 ? 0 : borne(vises.length / candidat.metiers.length + (candidat.issu_aspiration ? 0.4 : 0));
  const facteurs: Facteur[] = [];
  if (vises.length > 0) {
    const libelles = vises.map((id) => ctx.metiersParId.get(id)?.libelle.fr ?? id);
    facteurs.push({
      categorie: 'aspirations_eleve',
      cle_gabarit: 'facteur.aspiration.metier_couvert',
      params: { metiers: libelles.join(', ') },
      valeur: proximite,
      contribution: 0,
    });
  }
  return { valeur: borne(proximite), neutralisee: false, facteurs };
};

const evalAvisParents = (saisies: SaisiesModule2, candidat: ScenarioCandidat): CategorieEvaluee => {
  const avis = saisies.avis_parents;
  if (!avis) return { valeur: 0, neutralisee: true, facteurs: [] };
  const aligne = avis.filieres_souhaitees.includes(candidat.filiere_id);
  const valeur = aligne ? borne(0.5 + avis.priorite * 0.5) : 0.15;
  const facteurs: Facteur[] = aligne
    ? [
        {
          categorie: 'avis_parents',
          cle_gabarit: 'facteur.avis_parents.aligne',
          params: {},
          valeur,
          contribution: 0,
        },
      ]
    : [];
  return { valeur, neutralisee: false, facteurs };
};

const evalOffreFaisabilite = (candidat: ScenarioCandidat, ctx: ContexteScoring): CategorieEvaluee => {
  if (candidat.etablissements.length === 0) return { valeur: 0.05, neutralisee: false, facteurs: [] };
  const plusProche = candidat.etablissements[0]!;
  const proximite = borne(1 - plusProche.distance_km / 100);
  const acces = moyenne(
    candidat.etablissements.map((e) => (e.probabilite_acces === null ? 0.6 : e.probabilite_acces)),
  );
  const perfNiveauFiliere = ctx.filiere.prerequis.length; // simple signal de contrainte
  const valeur = borne(0.5 * proximite + 0.4 * acces + 0.1 * (perfNiveauFiliere > 0 ? 0.7 : 1));
  return {
    valeur,
    neutralisee: false,
    facteurs: [
      {
        categorie: 'offre_faisabilite',
        cle_gabarit: 'facteur.offre.accessible',
        params: { distance_km: plusProche.distance_km },
        valeur,
        contribution: 0,
      },
    ],
  };
};

const evalPerspectives = (candidat: ScenarioCandidat, ctx: ContexteScoring): CategorieEvaluee => {
  const valeur = moyenne(
    candidat.metiers.map((m) => ctx.metiersParId.get(m.id)?.perspectives ?? 0.4),
  );
  const facteurs: Facteur[] =
    valeur > 0.5
      ? [
          {
            categorie: 'perspectives_professionnelles',
            cle_gabarit: 'facteur.debouches.diversite',
            params: {},
            valeur,
            contribution: 0,
          },
        ]
      : [];
  return { valeur: borne(valeur), neutralisee: false, facteurs };
};

const evalBesoinsNationaux = (candidat: ScenarioCandidat, ctx: ContexteScoring): CategorieEvaluee => {
  const metierIds = new Set(candidat.metiers.map((m) => m.id));
  const pertinentes = ctx.entreesStrategiques.filter(
    (e) => e.cible_type === 'metier' && metierIds.has(e.cible_ref),
  );
  const intensite = pertinentes.length === 0 ? 0 : Math.max(...pertinentes.map((e) => e.intensite));
  const prioritaire = pertinentes.some((e) => e.secteur_prioritaire);
  const valeur = borne(intensite + (prioritaire ? 0.1 : 0));
  const facteurs: Facteur[] = [];
  if (intensite > 0) {
    const top = pertinentes.reduce((a, b) => (b.intensite > a.intensite ? b : a));
    facteurs.push({
      categorie: 'besoins_strategiques_nationaux',
      cle_gabarit: 'facteur.besoins_nationaux.tension',
      params: { metier: ctx.metiersParId.get(top.cible_ref)?.libelle.fr ?? top.cible_ref },
      valeur,
      contribution: 0,
    });
  }
  return { valeur, neutralisee: false, facteurs };
};

/**
 * Scoreur additif pondéré (architecture-detaillee.md §J.3.5).
 * - score = 100 × Σ (poids_effectif_c × valeur_c) sur les catégories renseignées ;
 * - une catégorie sans données est **neutralisée** et son poids **redistribué
 *   proportionnellement** sur les catégories renseignées ;
 * - chaque facteur porte sa contribution = poids_effectif × valeur (échelle 0–100),
 *   affichée dans l'explication ; la somme des contributions reconstitue le score.
 */
export const scorerScenario = (
  candidat: ScenarioCandidat,
  profil: ProfilAcademique,
  saisies: SaisiesModule2,
  ctx: ContexteScoring,
  jeu: JeuPonderations,
): ScenarioEvalue => {
  const evals: Record<CategorieScore, CategorieEvaluee> = {
    profil_eleve: evalProfil(profil, ctx),
    aspirations_eleve: evalAspirations(saisies, candidat, ctx),
    avis_parents: evalAvisParents(saisies, candidat),
    offre_faisabilite: evalOffreFaisabilite(candidat, ctx),
    perspectives_professionnelles: evalPerspectives(candidat, ctx),
    besoins_strategiques_nationaux: evalBesoinsNationaux(candidat, ctx),
  };

  const actives = CATEGORIES_SCORE.filter((c) => !evals[c].neutralisee);
  const neutralisees = CATEGORIES_SCORE.filter((c) => evals[c].neutralisee);
  const poidsActifTotal = actives.reduce((s, c) => s + jeu.poids[c]!, 0);

  const poidsEffectif = (c: CategorieScore): number =>
    poidsActifTotal === 0 ? 0 : jeu.poids[c]! / poidsActifTotal;

  let score = 0;
  const facteurs: Facteur[] = [];
  const parts: Partial<Record<CategorieScore, number>> = {};

  for (const c of CATEGORIES_SCORE) {
    if (evals[c].neutralisee) {
      parts[c] = 0;
      continue;
    }
    const pe = poidsEffectif(c);
    const contributionCategorie = pe * evals[c].valeur * 100;
    score += contributionCategorie;
    parts[c] = contributionCategorie;

    // Les sous-critères (facteurs) partitionnent la contribution de la catégorie,
    // au prorata de leur valeur : Σ contributions des facteurs = contribution catégorie.
    const sommeValeurs = evals[c].facteurs.reduce((s, f) => s + f.valeur, 0);
    for (const f of evals[c].facteurs) {
      const part =
        sommeValeurs > 0 ? f.valeur / sommeValeurs : 1 / Math.max(1, evals[c].facteurs.length);
      facteurs.push({ ...f, contribution: Math.round(contributionCategorie * part * 100) / 100 });
    }
  }

  score = Math.round(score * 100) / 100;
  const totalParts = Object.values(parts).reduce((s, v) => s + (v ?? 0), 0) || 1;
  const repartition: RepartitionScore = {
    parts: Object.fromEntries(
      CATEGORIES_SCORE.map((c) => [c, Math.round(((parts[c] ?? 0) / totalParts) * 1000) / 1000]),
    ) as Record<CategorieScore, number>,
    neutralisees,
  };

  facteurs.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  return { candidat, score, facteurs, repartition, categoriesNeutralisees: neutralisees };
};
