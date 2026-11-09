import type {
  AlternativeEcartee,
  BadgeScenario,
  Filiere,
  ProfilAcademique,
  ScenarioScore,
  VerdictRegle,
} from '@buildnote/shared';
import type { ScenarioEvalue } from './scorer.js';

/** Termes proscrits dans toute sortie de texte (gabarits-presentation.md §J.P.1). */
const TERMES_PROSCRITS =
  /(impossible|vous devez|tu dois|affect(?:e|é|és|ée|ées|er|ez|ation)|recal(?:e|é|és|ée|ées)|interdit)/i;

/**
 * Contrôle « non-prescription » : lève si un texte destiné à l'utilisateur
 * emploie un vocabulaire d'injonction ou d'affectation (EF-M2-26).
 */
export const verifierNonPrescription = (textes: readonly string[]): void => {
  for (const t of textes) {
    if (TERMES_PROSCRITS.test(t)) {
      throw new Error(`sortie non conforme (non-prescription) : « ${t} »`);
    }
  }
};

export interface ScenarioRegle extends ScenarioEvalue {
  readonly verdict: VerdictRegle;
  readonly badges: BadgeScenario[];
  /** Présent uniquement si verdict = 'ecarte'. */
  readonly ecarte?: AlternativeEcartee;
  /** Matière du prérequis non atteint, si verdict = 'sous_condition'. */
  readonly prerequisManquant?: string;
}

const prerequisAtteints = (
  filiere: Filiere,
  profil: ProfilAcademique,
): { ok: boolean; matiereManquante: string | null } => {
  const perf = new Map(profil.performances.map((p) => [p.matiere, p.niveau]));
  for (const r of filiere.prerequis) {
    const niveau = perf.get(r.matiere) ?? 0;
    if (niveau + 1e-9 < r.niveau_min) return { ok: false, matiereManquante: r.matiere };
  }
  return { ok: true, matiereManquante: null };
};

/**
 * Moteur de règles (architecture-detaillee.md §J.3.4). Ne supprime **jamais**
 * un scénario silencieusement : il le retient, le marque « sous condition »,
 * ou l'écarte **avec raison**.
 */
export const appliquerRegles = (
  evalues: readonly ScenarioEvalue[],
  filieresParId: ReadonlyMap<string, Filiere>,
  profil: ProfilAcademique,
  distanceMaxKm: number,
): ScenarioRegle[] =>
  evalues.map((ev): ScenarioRegle => {
    const filiere = filieresParId.get(ev.candidat.filiere_id);
    const badges: BadgeScenario[] = [];
    const plusProche = ev.candidat.etablissements[0] ?? null;

    // Faisabilité géographique : aucune offre → écarté avec raison (pas supprimé)
    if (!plusProche) {
      return {
        ...ev,
        verdict: 'ecarte',
        badges,
        ecarte: {
          filiere_id: ev.candidat.filiere_id,
          filiere_libelle: ev.candidat.filiere_libelle,
          raison: 'eloignement',
          score: Math.round(ev.score),
        },
      };
    }
    if (plusProche.distance_km > distanceMaxKm && !plusProche.internat) {
      badges.push('offre_eloignee');
    }

    // Prérequis de filière → « sous condition » avec explication (jamais supprimé)
    if (filiere) {
      const { ok, matiereManquante } = prerequisAtteints(filiere, profil);
      if (!ok && matiereManquante) {
        badges.push('sous_condition');
        return { ...ev, verdict: 'sous_condition', badges, prerequisManquant: matiereManquante };
      }
    }

    // Sélectivité forte sur toutes les offres → capacité limitée
    if (ev.candidat.etablissements.every((e) => (e.probabilite_acces ?? 1) < 0.35)) {
      badges.push('capacite_limitee');
    }

    // Besoins nationaux : badge informatif, non valorisant
    if ((ev.repartition.parts.besoins_strategiques_nationaux ?? 0) > 0.12) {
      badges.push('metier_en_tension');
    }

    return { ...ev, verdict: 'retenu', badges };
  });

/** Classe les scénarios retenus / sous condition par score décroissant. */
export const classer = (regles: readonly ScenarioRegle[]): ScenarioScore[] => {
  const retenus = regles.filter((r) => r.verdict !== 'ecarte').sort((a, b) => b.score - a.score);
  return retenus.map((r, i): ScenarioScore => ({
    ...r.candidat,
    rang: i + 1,
    score: r.score,
    verdict: r.verdict,
    badges: r.badges,
  }));
};
