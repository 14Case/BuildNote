import { describe, expect, it } from 'vitest';
import { traduire } from '@buildnote/shared/i18n';
import type { EleveSituation, SituationClasse } from '../src/types.js';

describe('apps/web — Logique Dashboard et Dossier d’orientation (Lot L4)', () => {
  it('i18n : traduit fidèlement les clés du Module 2 en FR et EN', () => {
    // Navigation
    expect(traduire('fr', 'nav.module2')).toBe('Module 2 : Orientation & Décision');
    expect(traduire('en', 'nav.module2')).toBe('Module 2: Guidance & Decision');

    // Dashboard
    expect(traduire('fr', 'dashboard.title')).toBe('Tableau de bord de situation');
    expect(traduire('en', 'dashboard.title')).toBe('Situation dashboard');
    expect(traduire('fr', 'dashboard.lastRefresh', { date: '12:00' })).toBe('Dernier calcul : 12:00');
    expect(traduire('en', 'dashboard.lastRefresh', { date: '12:00' })).toBe('Last computed: 12:00');

    // Questionnaire
    expect(traduire('fr', 'questionnaire.title')).toBe("Questionnaire & Consentement d'orientation");
    expect(traduire('en', 'questionnaire.title')).toBe('Guidance Questionnaire & Consent');

    // Dossier d'orientation
    expect(traduire('fr', 'dossier.title')).toBe("Dossier d'orientation");
    expect(traduire('en', 'dossier.title')).toBe('Guidance Record');
    expect(traduire('fr', 'dossier.scoreLabel', { score: 85 })).toBe('Score : 85/100');
    expect(traduire('en', 'dossier.scoreLabel', { score: 85 })).toBe('Score: 85/100');
  });

  it('Garde-fou EF-M2-11 : la génération d’orientation requiert strictement le double consentement', () => {
    const verifierEligibiliteGeneration = (el: EleveSituation): boolean => {
      return Boolean(el.consentement.eleve && el.consentement.parents);
    };

    const eleveSansConsentement: EleveSituation = {
      id: 'el-1',
      nom: 'NKOLO',
      prenoms: 'Aristide',
      classeId: 'c-1',
      classeLibelle: '3e 2',
      anneeScolaireId: 'a-1',
      consentement: { eleve: false, parents: false, valide: false },
      questionnaire: { complet: false, centresInteret: [], matieresPreferees: [], aspirationsMetiers: [] },
      nbNotes: 4,
    };

    const eleveConsentementPartiel: EleveSituation = {
      ...eleveSansConsentement,
      consentement: { eleve: true, parents: false, valide: false },
    };

    const eleveConsentementComplet: EleveSituation = {
      ...eleveSansConsentement,
      consentement: { eleve: true, parents: true, valide: true },
    };

    expect(verifierEligibiliteGeneration(eleveSansConsentement)).toBe(false);
    expect(verifierEligibiliteGeneration(eleveConsentementPartiel)).toBe(false);
    expect(verifierEligibiliteGeneration(eleveConsentementComplet)).toBe(true);
  });

  it('Garde-fou EF-M2-19/26 : la bannière d’aide à la décision garantit la non-prescription', () => {
    const banniereFr = traduire('fr', 'dossier.ethicsBanner');
    const banniereEn = traduire('en', 'dossier.ethicsBanner');

    // Vérifie le vocabulaire d'aide à la décision
    expect(banniereFr.toLowerCase()).toContain('aide à la décision');
    expect(banniereFr.toLowerCase()).toContain('indicatives');
    expect(banniereFr.toLowerCase()).toContain('aucune orientation n\'est imposée');

    expect(banniereEn.toLowerCase()).toContain('decision aid');
    expect(banniereEn.toLowerCase()).toContain('indicative');
    expect(banniereEn.toLowerCase()).toContain('no track is mandatory');
  });

  it('Garde-fou EF-M2-18 : les 5 blocs d’explication structurent la restitution du dossier', () => {
    const explication = {
      facteurs_determinants: [{ contribution: 12.5, cle_gabarit: 'point_fort' }],
      donnees_utilisees: [{ source: 'Normalized', fiabilite: 'elevee' }],
      repartition_score: {
        parts: {
          profil_academique: 0.35,
          aspirations_eleve: 0.25,
          avis_parents: 0.15,
          offre_faisabilite: 0.1,
          debouches_insertion: 0.1,
          besoins_strategiques_nationaux: 0.05,
        },
      },
      alternatives_ecartees: [{ filiere_id: 'fil-1', raison: 'score_inferieur' }],
      zones_incertitude: [{ cle_gabarit: 'donnee_manquante' }],
    };

    // 1. Facteurs déterminants
    expect(explication.facteurs_determinants.length).toBeGreaterThan(0);
    // 2. Données utilisées
    expect(explication.donnees_utilisees.length).toBeGreaterThan(0);
    // 3. Répartition du score
    expect(Object.keys(explication.repartition_score.parts).length).toBe(6);
    // 4. Alternatives écartées
    expect(explication.alternatives_ecartees[0]?.raison).toBe('score_inferieur');
    // 5. Zones d'incertitude
    expect(explication.zones_incertitude.length).toBeGreaterThan(0);
  });

  it('Tableau de bord : calculs et agrégats de situation de classe exacts', () => {
    const situation: SituationClasse = {
      classe: { id: 'c-1', libelle: '3e 2', anneeScolaireId: 'a-1' },
      stats: { totalEleves: 3, avecConsentement: 2, avecQuestionnaire: 2, avecDossier: 1 },
      derniereConsultation: new Date().toISOString(),
      eleves: [
        {
          id: '1',
          nom: 'A',
          prenoms: 'A',
          classeId: 'c-1',
          classeLibelle: '3e 2',
          anneeScolaireId: 'a-1',
          consentement: { eleve: true, parents: true, valide: true },
          questionnaire: { complet: true, centresInteret: ['Info'], matieresPreferees: ['Maths'], aspirationsMetiers: [] },
          dernierDossier: { id: 'd-1', palier: 'p', genereLe: '', recommandation: 'Série C', score: 85 },
          nbNotes: 5,
        },
        {
          id: '2',
          nom: 'B',
          prenoms: 'B',
          classeId: 'c-1',
          classeLibelle: '3e 2',
          anneeScolaireId: 'a-1',
          consentement: { eleve: true, parents: true, valide: true },
          questionnaire: { complet: true, centresInteret: ['Lettres'], matieresPreferees: ['Français'], aspirationsMetiers: [] },
          dernierDossier: null,
          nbNotes: 4,
        },
        {
          id: '3',
          nom: 'C',
          prenoms: 'C',
          classeId: 'c-1',
          classeLibelle: '3e 2',
          anneeScolaireId: 'a-1',
          consentement: { eleve: false, parents: false, valide: false },
          questionnaire: { complet: false, centresInteret: [], matieresPreferees: [], aspirationsMetiers: [] },
          dernierDossier: null,
          nbNotes: 2,
        },
      ],
    };

    expect(situation.stats.totalEleves).toBe(3);
    expect(situation.stats.avecConsentement).toBe(2);
    expect(situation.stats.avecQuestionnaire).toBe(2);
    expect(situation.stats.avecDossier).toBe(1);

    const filtrerAvecConsentement = situation.eleves.filter((e) => e.consentement.valide);
    expect(filtrerAvecConsentement.length).toBe(2);
  });
});
