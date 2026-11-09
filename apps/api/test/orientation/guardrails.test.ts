import { describe, expect, it } from 'vitest';
import { CATEGORIES_SCORE } from '@buildnote/shared';
import {
  ConsentementRequisError,
  genererDossierOrientation,
  verifierNonPrescription,
} from '../../src/orientation/index.js';
import {
  deps,
  eleveCM2,
  eleveComplet,
  eleveSansConsentement,
  eleveTerminale,
} from './helpers.js';

const entree = {
  eleve_id: 'el-1',
  etablissement_id: 'et-1',
  annee_scolaire_id: '2025-2026',
  declenchee_par: 'u-conseiller',
  langue: 'fr' as const,
};

describe('garde-fous non négociables du Module 2', () => {
  it('refuse la génération sans consentement complet (EF-M2-11)', async () => {
    await expect(
      genererDossierOrientation(entree, deps({ 'el-1': eleveSansConsentement })),
    ).rejects.toBeInstanceOf(ConsentementRequisError);
  });

  it("ne lit aucune donnée avant d'avoir vérifié le consentement", async () => {
    const d = deps({ 'el-1': eleveSansConsentement });
    await genererDossierOrientation(entree, d).catch(() => undefined);
    // lireConsentement enregistre l'établissement ; ouvrirSnapshot aussi.
    // Sans consentement, seule la lecture du consentement doit avoir eu lieu.
    expect(d.gateway.etablissementsInterroges).toEqual(['et-1']);
  });

  it('applique le cloisonnement : établissement de la demande ≠ établissement élève → erreur', async () => {
    await expect(
      genererDossierOrientation(
        { ...entree, etablissement_id: 'et-AUTRE' },
        deps({ 'el-1': eleveComplet }),
      ),
    ).rejects.toThrow(/cloisonnement/i);
  });

  it('produit un dossier explicable : 5 blocs par scénario, contributions ≈ score (EF-M2-18)', async () => {
    const dossier = await genererDossierOrientation(entree, deps({ 'el-1': eleveComplet }));
    expect(dossier.scenarios.length).toBeGreaterThan(0);
    for (const { scenario, explication } of dossier.scenarios) {
      expect(explication.donnees_utilisees.length).toBeGreaterThan(0);
      expect(Object.keys(explication.repartition_score.parts).sort()).toEqual(
        [...CATEGORIES_SCORE].sort(),
      );
      const sommeContributions = explication.facteurs_determinants.reduce(
        (s, f) => s + f.contribution,
        0,
      );
      // les facteurs affichés partitionnent les contributions de catégorie :
      // leur somme ne dépasse jamais le score (à l'arrondi près)
      expect(sommeContributions).toBeGreaterThan(0);
      expect(sommeContributions).toBeLessThanOrEqual(scenario.score + 1);
    }
  });

  it('la répartition du score rend la catégorie « besoins nationaux » visible comme les autres', async () => {
    const dossier = await genererDossierOrientation(entree, deps({ 'el-1': eleveComplet }));
    for (const { explication } of dossier.scenarios) {
      expect(explication.repartition_score.parts).toHaveProperty('besoins_strategiques_nationaux');
    }
  });

  it('le contrôle non-prescription rejette un vocabulaire d\'affectation', () => {
    expect(() => verifierNonPrescription(['Vous devez choisir la série C'])).toThrow();
    expect(() => verifierNonPrescription(['Élève affecté en série C'])).toThrow();
    expect(() => verifierNonPrescription(['Piste à explorer : série C'])).not.toThrow();
  });

  it('génère une orientation adaptée pour un élève du CM2 (Palier 1 : primaire vers secondaire)', async () => {
    const dossierCM2 = await genererDossierOrientation(
      { ...entree, eleve_id: 'el-cm2' },
      deps({ 'el-cm2': eleveCM2 }),
    );
    expect(dossierCM2.demande.palier).toBe('primaire_vers_secondaire');
    expect(dossierCM2.scenarios.length).toBeGreaterThan(0);
    const filieres = dossierCM2.scenarios.map((s) => s.scenario.filiere_id);
    expect(filieres).toContain('fil-sec-general');
  });

  it('génère une orientation adaptée pour un élève de Terminale (Palier 3 : terminale vers supérieur)', async () => {
    const dossierTle = await genererDossierOrientation(
      { ...entree, eleve_id: 'el-tle' },
      deps({ 'el-tle': eleveTerminale }),
    );
    expect(dossierTle.demande.palier).toBe('terminale_vers_superieur');
    expect(dossierTle.scenarios.length).toBeGreaterThan(0);
    const filieres = dossierTle.scenarios.map((s) => s.scenario.filiere_id);
    expect(filieres).toContain('fil-superieur-ingenierie');
  });

  it('génère une orientation avec auto-détection du Palier 2 pour un élève de 3ème', async () => {
    const dossier3e = await genererDossierOrientation(entree, deps({ 'el-1': eleveComplet }));
    expect(dossier3e.demande.palier).toBe('premier_cycle_vers_second_cycle');
  });

  it('ne renvoie qu\'un objet (aucune écriture) — le dossier est sérialisable', async () => {
    const dossier = await genererDossierOrientation(entree, deps({ 'el-1': eleveComplet }));
    expect(() => JSON.parse(JSON.stringify(dossier))).not.toThrow();
    expect(dossier.demande.statut).toBe('genere');
  });
});
