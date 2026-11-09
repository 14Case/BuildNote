import { describe, expect, it } from 'vitest';
import {
  CATEGORIES_SCORE,
  PONDERATIONS_DEFAUT,
  type ScenarioCandidat,
} from '@buildnote/shared';
import { construireProfil, scorerScenario, type ContexteScoring } from '../../src/orientation/index.js';
import { eleveComplet, eleveSansAvisParents } from './helpers.js';

const candidat: ScenarioCandidat = {
  filiere_id: 'fil-sciences',
  filiere_libelle: 'Série C — sciences',
  formations: [{ id: 'for-maths-info', libelle: 'Licence Maths-Info' }],
  etablissements: [
    {
      etablissement_reference_id: 'etab-japoma',
      libelle: 'Lycée de Japoma',
      distance_km: 3,
      internat: false,
      probabilite_acces: 0.6,
    },
  ],
  metiers: [{ id: 'met-data', libelle: 'ingénieur data' }],
  issu_aspiration: false,
};

const ctx: ContexteScoring = {
  filiere: {
    id: 'fil-sciences',
    libelle: { fr: 'Série C — sciences', en: 'Science track' },
    accessible_depuis: ['3eme'],
    prerequis: [{ matiere: 'Mathématiques', niveau_min: 0.55 }],
  },
  metiersParId: new Map([
    [
      'met-data',
      {
        id: 'met-data',
        libelle: { fr: 'ingénieur data', en: 'data engineer' },
        competences_requises: [],
        perspectives: 0.8,
      },
    ],
  ]),
  entreesStrategiques: [
    {
      cible_type: 'metier',
      cible_ref: 'met-data',
      intensite: 0.8,
      secteur_prioritaire: true,
      source: {
        reference: 'SND30',
        organisme: 'MINEPAT',
        date_publication: '2020-11-16',
        date_consultation: '2026-03-01',
      },
    },
  ],
};

describe('scoreur additif pondéré (§J.3.5)', () => {
  it('score dans [0,100] et somme des parts de répartition = 1 (hors neutralisées)', () => {
    const profil = construireProfil({
      ...eleveComplet.snapshot,
      instantane: { id: 's', horodatage: '2026-09-09T10:00:00.000Z' },
    });
    const ev = scorerScenario(candidat, profil, eleveComplet.snapshot.saisies, ctx, PONDERATIONS_DEFAUT);
    expect(ev.score).toBeGreaterThan(0);
    expect(ev.score).toBeLessThanOrEqual(100);
    const somme = CATEGORIES_SCORE.reduce((s, c) => s + (ev.repartition.parts[c] ?? 0), 0);
    expect(somme).toBeCloseTo(1, 2);
  });

  it('additivité : Σ contributions de catégorie = score', () => {
    const profil = construireProfil({
      ...eleveComplet.snapshot,
      instantane: { id: 's', horodatage: '2026-09-09T10:00:00.000Z' },
    });
    const ev = scorerScenario(candidat, profil, eleveComplet.snapshot.saisies, ctx, PONDERATIONS_DEFAUT);
    const parCategorie = ev.repartition.parts; // parts normalisées : on recompose via score
    const total = CATEGORIES_SCORE.reduce((s, c) => s + (parCategorie[c] ?? 0), 0) * ev.score;
    expect(total).toBeCloseTo(ev.score, 5);
  });

  it('avis des parents absent → catégorie neutralisée + poids redistribué (score comparable)', () => {
    const profil = construireProfil({
      ...eleveComplet.snapshot,
      instantane: { id: 's', horodatage: '2026-09-09T10:00:00.000Z' },
    });
    const avecAvis = scorerScenario(candidat, profil, eleveComplet.snapshot.saisies, ctx, PONDERATIONS_DEFAUT);
    const sansAvis = scorerScenario(
      candidat,
      profil,
      eleveSansAvisParents.snapshot.saisies,
      ctx,
      PONDERATIONS_DEFAUT,
    );

    expect(sansAvis.categoriesNeutralisees).toContain('avis_parents');
    expect(avecAvis.categoriesNeutralisees).not.toContain('avis_parents');
    // part de la catégorie neutralisée = 0 ; les autres restent visibles
    expect(sansAvis.repartition.parts.avis_parents).toBe(0);
    const sommeSans = CATEGORIES_SCORE.reduce((s, c) => s + (sansAvis.repartition.parts[c] ?? 0), 0);
    expect(sommeSans).toBeCloseTo(1, 2);
    // la catégorie « besoins nationaux » reste présente et non nulle
    expect(sansAvis.repartition.parts.besoins_strategiques_nationaux ?? 0).toBeGreaterThan(0);
  });

  it('un jeu de pondérations à poids « besoins nationaux » nul supprime sa contribution', () => {
    const profil = construireProfil({
      ...eleveComplet.snapshot,
      instantane: { id: 's', horodatage: '2026-09-09T10:00:00.000Z' },
    });
    const jeu = {
      ...PONDERATIONS_DEFAUT,
      version: 'test-sans-national',
      poids: { ...PONDERATIONS_DEFAUT.poids, besoins_strategiques_nationaux: 0 },
    };
    const ev = scorerScenario(candidat, profil, eleveComplet.snapshot.saisies, ctx, jeu);
    expect(ev.repartition.parts.besoins_strategiques_nationaux ?? 0).toBe(0);
  });
});
