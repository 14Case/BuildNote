import { z } from 'zod';

/**
 * Les 6 catégories de critères du scoreur additif pondéré.
 * Référence : docs/09-moteur-orientation/architecture-detaillee.md §J.3.5.
 * La catégorie « besoins stratégiques nationaux » est un critère pondéré et
 * transparent, présenté comme les cinq autres (règle produit non négociable,
 * EF-M2-19).
 */
export const CATEGORIES_SCORE = [
  'profil_eleve',
  'aspirations_eleve',
  'avis_parents',
  'offre_faisabilite',
  'perspectives_professionnelles',
  'besoins_strategiques_nationaux',
] as const;

export const categorieScoreSchema = z.enum(CATEGORIES_SCORE);
export type CategorieScore = z.infer<typeof categorieScoreSchema>;

/**
 * Jeu de pondérations : une valeur par catégorie, versionné et daté.
 * Les valeurs par défaut sont **publiées** ; un rôle habilité peut les ajuster
 * dans des bornes ; tout ajustement est tracé et affiché (EF-M2-20).
 */
export const jeuPonderationsSchema = z
  .object({
    version: z.string().min(1),
    date_publication: z.string().date(),
    /** Poids par catégorie, dans [0,1]. La somme n'a pas besoin de valoir 1 :
     *  le scoreur normalise. */
    poids: z.record(categorieScoreSchema, z.number().min(0).max(1)),
    /** Bornes d'ajustement autorisées par catégorie (min/max inclusifs). */
    bornes: z
      .record(categorieScoreSchema, z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]))
      .optional(),
  })
  .strict()
  .superRefine((jeu, ctx) => {
    for (const c of CATEGORIES_SCORE) {
      if (!(c in jeu.poids)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `poids manquant pour la catégorie ${c}` });
      }
    }
  });

export type JeuPonderations = z.infer<typeof jeuPonderationsSchema>;

/**
 * Valeurs par défaut publiées (architecture-detaillee.md §J.3.5).
 * Total = 100 %. Modifiables uniquement par un nouveau jeu versionné.
 */
export const PONDERATIONS_DEFAUT: JeuPonderations = {
  version: 'defaut-2026-09',
  date_publication: '2026-09-09',
  poids: {
    profil_eleve: 0.3,
    aspirations_eleve: 0.2,
    avis_parents: 0.15,
    offre_faisabilite: 0.15,
    perspectives_professionnelles: 0.1,
    besoins_strategiques_nationaux: 0.1,
  },
};
