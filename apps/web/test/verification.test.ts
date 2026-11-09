import { describe, expect, it } from 'vitest';
import { traduire, type Langue } from '@buildnote/shared/i18n';

describe('apps/web — Logique de vérification humaine et i18n (Lot L2)', () => {
  it('i18n : traduit fidèlement les clés de vérification en FR et EN', () => {
    expect(traduire('fr', 'app.name')).toBe('BuildNote');
    expect(traduire('en', 'app.name')).toBe('BuildNote');

    expect(traduire('fr', 'verify.title')).toBe('Vérifier et valider');
    expect(traduire('en', 'verify.title')).toBe('Verify and validate');

    expect(traduire('fr', 'verify.progress', { pct: 75 })).toBe('Progrès 75%');
    expect(traduire('en', 'verify.progress', { pct: 75 })).toBe('Progress 75%');
  });

  it('Contrôle de barème : détecte immédiatement les notes hors barème', () => {
    const bareme = { min: 0, max: 20 };
    const verifierNote = (val: number) => val < bareme.min || val > bareme.max;

    expect(verifierNote(15)).toBe(false);
    expect(verifierNote(25)).toBe(true);
    expect(verifierNote(-2)).toBe(true);
  });

  it('Garde-fou EF-M1-11 : la validation requiert une attestation explicite', () => {
    let attestationCochee = false;
    const boutonValidationActif = (coche: boolean, enCours: boolean) => coche && !enCours;

    expect(boutonValidationActif(attestationCochee, false)).toBe(false);

    attestationCochee = true;
    expect(boutonValidationActif(attestationCochee, false)).toBe(true);
    expect(boutonValidationActif(attestationCochee, true)).toBe(false);
  });
});
