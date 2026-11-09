import { describe, it, expect } from 'vitest';
import { normaliserValeur } from './valeur.js';

describe('normaliserValeur', () => {
  it('normalise les séparateurs décimaux et fractions', () => {
    expect(normaliserValeur('12,5')).toEqual({ valeur: 12.5, statut: null, illisible: false });
    expect(normaliserValeur('12.5')).toEqual({ valeur: 12.5, statut: null, illisible: false });
    expect(normaliserValeur('12 ½')).toEqual({ valeur: 12.5, statut: null, illisible: false });
    expect(normaliserValeur('12 1/2')).toEqual({ valeur: 12.5, statut: null, illisible: false });
  });

  it('supprime le zéro de tête non significatif mais garde 100', () => {
    expect(normaliserValeur('08').valeur).toBe(8);
    expect(normaliserValeur('00').valeur).toBe(0);
    expect(normaliserValeur('100').valeur).toBe(100);
  });

  it('interprète « 12/20 » comme 12', () => {
    expect(normaliserValeur('12/20').valeur).toBe(12);
  });

  it('mappe les jetons de statut', () => {
    expect(normaliserValeur('Abs').statut).toBe('absent');
    expect(normaliserValeur('NE').statut).toBe('non_evalue');
    expect(normaliserValeur('—').statut).toBe('non_evalue');
    expect(normaliserValeur('Disp').statut).toBe('dispense');
  });

  it('distingue vide et illisible', () => {
    expect(normaliserValeur('   ')).toEqual({ valeur: null, statut: null, illisible: false });
    expect(normaliserValeur('1?3').illisible).toBe(true);
  });
});
