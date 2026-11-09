import { z } from 'zod';

/**
 * Bandes de confiance d'une cellule reconnue.
 * Réf. docs/08-ocr-computer-vision/pipeline.md §I.9 (3 bandes) et
 * docs/11-ux-ui/architecture-ux-ui.md §L.3 (codage visuel : bleu discret / orange / orange soutenu).
 *
 * Aucun seuil, même « haute », n'autorise l'enregistrement sans validation humaine (EF-M1-10).
 */
export const bandeConfianceSchema = z.enum(['haute', 'moyenne', 'basse']);
export type BandeConfiance = z.infer<typeof bandeConfianceSchema>;

export interface SeuilsConfiance {
  /** score >= haute → bande « haute ». */
  readonly haute: number;
  /** score >= moyenne → bande « moyenne » ; en dessous → « basse ». */
  readonly moyenne: number;
}

/** Seuils par défaut — paramétrables par établissement / type de fiche (pipeline §I.9). */
export const SEUILS_CONFIANCE_DEFAUT: SeuilsConfiance = { haute: 0.9, moyenne: 0.7 };

export function classerConfiance(score: number, seuils: SeuilsConfiance = SEUILS_CONFIANCE_DEFAUT): BandeConfiance {
  if (score >= seuils.haute) return 'haute';
  if (score >= seuils.moyenne) return 'moyenne';
  return 'basse';
}

/**
 * Poids de priorité pour trier le parcours de revue (les cellules les plus douteuses d'abord).
 * Réf. EF-M1-07 (parcourir en priorité les cellules à faible confiance).
 */
export const PRIORITE_REVUE: Record<BandeConfiance, number> = { basse: 0, moyenne: 1, haute: 2 };
