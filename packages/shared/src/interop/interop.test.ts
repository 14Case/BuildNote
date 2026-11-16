import { describe, expect, it } from 'vitest';
import {
  normaliserNom,
  normaliserDate,
  parserNombreDecimal,
  estValeurAbsence,
} from './mapping.js';
import {
  canoniqueEleveSchema,
  canoniqueNoteSchema,
  canoniqueLotImportSchema,
} from './schema.js';
import { arbitrerConflitNote } from './conflit.js';

describe('@buildnote/shared/interop — Modèle canonique & Mapping (Lot L5)', () => {
  it('normaliserNom : retire les accents, espaces multiples et passe en majuscules', () => {
    expect(normaliserNom('  nkolo   aristide  ')).toBe('NKOLO ARISTIDE');
    expect(normaliserNom('Étienne d’Ondoa')).toBe("ETIENNE D'ONDOA");
    expect(normaliserNom('ÉLÈVE   À  TESTER')).toBe('ELEVE A TESTER');
  });

  it('normaliserDate : convertit les formats hétérogènes en ISO YYYY-MM-DD', () => {
    expect(normaliserDate('12/03/2010')).toBe('2010-03-12');
    expect(normaliserDate('05-11-2009')).toBe('2009-11-05');
    expect(normaliserDate('2011/04/25')).toBe('2011-04-25');
    expect(normaliserDate('2008-09-30')).toBe('2008-09-30');
    expect(normaliserDate('0000-00-00')).toBeNull();
    expect(normaliserDate('')).toBeNull();
  });

  it('parserNombreDecimal : supporte virgule et point décimal', () => {
    expect(parserNombreDecimal('14,5')).toBe(14.5);
    expect(parserNombreDecimal('14.5')).toBe(14.5);
    expect(parserNombreDecimal(18)).toBe(18);
    expect(parserNombreDecimal('09')).toBe(9);
    expect(parserNombreDecimal('inconnu')).toBeNull();
    expect(parserNombreDecimal(null)).toBeNull();
  });

  it('estValeurAbsence : reconnaît les notations d’absence usuelles', () => {
    expect(estValeurAbsence('abs')).toBe(true);
    expect(estValeurAbsence('ABSENT')).toBe(true);
    expect(estValeurAbsence('-')).toBe(true);
    expect(estValeurAbsence('disp')).toBe(true);
    expect(estValeurAbsence('14.5')).toBe(false);
  });

  it('Schéma canonique : valide un lot d’import conforme', () => {
    const lot = canoniqueLotImportSchema.parse({
      source: 'test-lycee.csv',
      anneeScolaire: '2024-2025',
      eleves: [
        {
          matricule: 'MAT-01',
          nom: 'NKOLO',
          prenoms: 'Aristide',
          classeLibelle: '3e 2',
          anneeScolaire: '2024-2025',
        },
      ],
      classes: [
        {
          libelle: '3e 2',
          niveau: '3eme',
          anneeScolaire: '2024-2025',
        },
      ],
      matieres: [
        {
          code: 'MATHS',
          libelleFr: 'Mathématiques',
          libelleEn: 'Mathematics',
        },
      ],
      notes: [
        {
          eleveNom: 'NKOLO',
          elevePrenoms: 'Aristide',
          classeLibelle: '3e 2',
          matiereCode: 'MATHS',
          evaluationLibelle: 'Devoir n°1',
          anneeScolaire: '2024-2025',
          valeur: 15.5,
        },
      ],
    });

    expect(lot.eleves.length).toBe(1);
    expect(lot.notes[0]?.valeur).toBe(15.5);
  });

  it('Garde-fou H.5.3 / EF-M1-16 : une note validée par Module 1 n’est jamais écrasée silencieusement', () => {
    const arbitrage = arbitrerConflitNote(
      16.5,
      'module1_valide', // valeur issue de la vérification humaine
      12.0,             // valeur discordante venue d’un import externe
    );

    expect(arbitrage.enConflit).toBe(true);
    expect(arbitrage.valeurRetenue).toBe(16.5); // Valeur Module 1 conservée
    expect(arbitrage.doitAllerEnRevue).toBe(true);
    expect(arbitrage.motif).toBe('protection_note_module1_validee');
  });
});
