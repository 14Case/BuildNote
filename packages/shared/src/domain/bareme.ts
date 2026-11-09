import { z } from 'zod';

/**
 * Barème d'une évaluation.
 * Réf. docs/06-architecture-donnees/modele-conceptuel-logique-physique.md §G.2.2 (table `bareme`)
 * et docs/03-cahier-des-charges EF-M1-20 (plusieurs barèmes, rattachement barème ↔ évaluation).
 */
export const typeBaremeSchema = z.enum(['sur_20', 'sur_10', 'sur_100', 'mention']);
export type TypeBareme = z.infer<typeof typeBaremeSchema>;

export const baremeSchema = z
  .object({
    type: typeBaremeSchema,
    /** Borne basse incluse (0 pour les barèmes numériques). */
    min: z.number(),
    /** Borne haute incluse (20, 10, 100…). Pour `mention`, nombre de mentions - 1. */
    max: z.number(),
    /** Pas de saisie autorisé (0.25, 0.5, 1…). `null` = continu. */
    pas: z.number().positive().nullable(),
    /** Mentions canoniques ordonnées, uniquement pour `type = mention`. */
    mentions: z.array(z.string()).optional(),
  })
  .refine((b) => b.max > b.min, { message: 'bareme.max doit être > bareme.min' });

export type Bareme = z.infer<typeof baremeSchema>;

/** Barèmes usuels prêts à l'emploi. */
export const BAREMES_STANDARD: Record<'sur_20' | 'sur_10' | 'sur_100', Bareme> = {
  sur_20: { type: 'sur_20', min: 0, max: 20, pas: 0.25 },
  sur_10: { type: 'sur_10', min: 0, max: 10, pas: 0.25 },
  sur_100: { type: 'sur_100', min: 0, max: 100, pas: 1 },
};

export interface ControleBareme {
  readonly dansLesBornes: boolean;
  readonly pasRespecte: boolean;
  /** true si la valeur peut être enregistrée sans forçage. */
  readonly valide: boolean;
}

/**
 * Contrôle une valeur numérique contre le barème (EF-M1-09).
 * N'émet pas d'erreur : renvoie un diagnostic que l'UI présente à l'humain.
 */
export function controlerValeur(valeur: number, bareme: Bareme): ControleBareme {
  const dansLesBornes = valeur >= bareme.min && valeur <= bareme.max;
  const pasRespecte =
    bareme.pas == null ? true : Math.abs(Math.round(valeur / bareme.pas) * bareme.pas - valeur) < 1e-9;
  return { dansLesBornes, pasRespecte, valide: dansLesBornes && pasRespecte };
}
