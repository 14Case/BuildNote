import { describe, it, expect } from 'vitest';
import { BAREMES_STANDARD, controlerValeur } from './bareme.js';
import { classerConfiance } from './confidence.js';

describe('controlerValeur', () => {
  const sur20 = BAREMES_STANDARD.sur_20;

  it('accepte une valeur dans les bornes et au pas', () => {
    expect(controlerValeur(12.5, sur20).valide).toBe(true);
  });

  it('signale une valeur hors bornes sans lever d’erreur', () => {
    const r = controlerValeur(25, sur20);
    expect(r.dansLesBornes).toBe(false);
    expect(r.valide).toBe(false);
  });

  it('signale un pas non respecté', () => {
    expect(controlerValeur(12.1, sur20).pasRespecte).toBe(false);
  });
});

describe('classerConfiance', () => {
  it('classe selon les seuils par défaut', () => {
    expect(classerConfiance(0.95)).toBe('haute');
    expect(classerConfiance(0.8)).toBe('moyenne');
    expect(classerConfiance(0.4)).toBe('basse');
  });
});
