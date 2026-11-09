import { describe, expect, it } from 'vitest';
import {
  determinerPalierOrientation,
  filiereSchema,
  palierOrientationSchema,
} from './referentiel.js';
import { entreeDemandeSchema } from './demande.js';

describe('Paliers d\'orientation', () => {
  it('valide les valeurs du schéma palierOrientationSchema', () => {
    expect(palierOrientationSchema.parse('primaire_vers_secondaire')).toBe('primaire_vers_secondaire');
    expect(palierOrientationSchema.parse('premier_cycle_vers_second_cycle')).toBe('premier_cycle_vers_second_cycle');
    expect(palierOrientationSchema.parse('terminale_vers_superieur')).toBe('terminale_vers_superieur');
    expect(() => palierOrientationSchema.parse('invalide')).toThrow();
  });

  it('détermine le bon palier selon le niveau de l\'élève', () => {
    // Palier 1 : Primaire -> Secondaire
    expect(determinerPalierOrientation('CM2')).toBe('primaire_vers_secondaire');
    expect(determinerPalierOrientation('cm2')).toBe('primaire_vers_secondaire');
    expect(determinerPalierOrientation('Class 6')).toBe('primaire_vers_secondaire');

    // Palier 2 : Fin de 1er cycle -> 2nd cycle
    expect(determinerPalierOrientation('3eme')).toBe('premier_cycle_vers_second_cycle');
    expect(determinerPalierOrientation('3e')).toBe('premier_cycle_vers_second_cycle');
    expect(determinerPalierOrientation('4eme annee technique')).toBe('premier_cycle_vers_second_cycle');
    expect(determinerPalierOrientation('Form 5')).toBe('premier_cycle_vers_second_cycle');

    // Palier 3 : Fin de 2nd cycle -> Supérieur
    expect(determinerPalierOrientation('Terminale')).toBe('terminale_vers_superieur');
    expect(determinerPalierOrientation('Tle')).toBe('terminale_vers_superieur');
    expect(determinerPalierOrientation('Upper Sixth')).toBe('terminale_vers_superieur');

    // Hors palier charnière
    expect(determinerPalierOrientation('6eme')).toBeNull();
    expect(determinerPalierOrientation('5eme')).toBeNull();
  });

  it('valide une filière avec palier d\'orientation', () => {
    const filiere = filiereSchema.parse({
      id: 'fil-sec-technique',
      libelle: { fr: 'Enseignement secondaire technique', en: 'Technical secondary education' },
      palier: 'primaire_vers_secondaire',
      accessible_depuis: ['CM2', 'Class 6'],
      prerequis: [{ matiere: 'Mathématiques', niveau_min: 0.5 }],
    });
    expect(filiere.palier).toBe('primaire_vers_secondaire');
  });

  it('valide une entrée de demande avec palier optionnel', () => {
    const entree = entreeDemandeSchema.parse({
      eleve_id: 'eleve-001',
      etablissement_id: 'etab-001',
      annee_scolaire_id: '2025-2026',
      declenchee_par: 'user-001',
      langue: 'fr',
      palier: 'primaire_vers_secondaire',
    });
    expect(entree.palier).toBe('primaire_vers_secondaire');
  });
});
