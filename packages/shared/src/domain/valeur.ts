import { z } from 'zod';

/**
 * Statut d'une cellule de note sans valeur numérique.
 * Réf. docs/08-ocr-computer-vision/pipeline.md §I.7 et docs/12-poc/acquisition/jeux-de-donnees.md §D.5.
 */
export const statutNoteSchema = z.enum(['absent', 'non_evalue', 'dispense']);
export type StatutNote = z.infer<typeof statutNoteSchema>;

export interface ValeurNormalisee {
  /** Valeur numérique canonique, ou null si `statut` est renseigné ou si non lisible. */
  readonly valeur: number | null;
  readonly statut: StatutNote | null;
  /** true si l'entrée n'a pas pu être interprétée (à corriger par l'humain). */
  readonly illisible: boolean;
}

const MAP_STATUT: ReadonlyArray<readonly [RegExp, StatutNote]> = [
  [/^(abs|absent|absente|a)$/i, 'absent'],
  [/^(ne|n\.?e\.?|non[\s-]?[eé]valu[eé]e?|—|-|\/)$/i, 'non_evalue'],
  [/^(disp|dispens[eé]e?)$/i, 'dispense'],
];

/**
 * Normalise une chaîne reconnue (OCR ou saisie) en valeur canonique.
 * Règles alignées sur le harnais de mesure des POC (docs/12-poc/acquisition/harnais-mesure.md §H.3) :
 * séparateur décimal, fractions simples, jetons de statut, zéro de tête.
 */
export function normaliserValeur(brut: string): ValeurNormalisee {
  const t = brut.trim().replace(/\s+/g, ' ');
  if (t === '') return { valeur: null, statut: null, illisible: false };

  for (const [re, statut] of MAP_STATUT) {
    if (re.test(t)) return { valeur: null, statut, illisible: false };
  }

  // Fractions « 12 ½ », « 12 1/2 »
  const frac = t.match(/^(\d{1,3})\s*(?:½|1\/2)$/);
  if (frac) return { valeur: Number(frac[1]) + 0.5, statut: null, illisible: false };

  // « 12/20 » dans une cellule de note → on garde le numérateur
  const surN = t.match(/^(\d{1,3}(?:[.,]\d{1,2})?)\s*\/\s*\d{1,3}$/);
  const candidat = surN ? surN[1]! : t;

  // Zéro de tête non significatif : « 08 » → « 8 », « 00 » → « 0 » (mais « 100 » inchangé).
  const num = candidat.replace(',', '.').replace(/^0+(\d)/, '$1');
  if (/^\d{1,3}(\.\d{1,2})?$/.test(num)) {
    return { valeur: Number(num), statut: null, illisible: false };
  }

  return { valeur: null, statut: null, illisible: true };
}
