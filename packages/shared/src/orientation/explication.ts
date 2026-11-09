import { z } from 'zod';
import { categorieScoreSchema } from './categories.js';

/**
 * Explication d'un scénario : les 5 blocs obligatoires (EF-M2-18).
 * Voir architecture-detaillee.md §J.3.6 et gabarits-presentation.md §J.P.5.
 */

/** 1 · Facteur déterminant : une ligne de l'explication. */
export const facteurSchema = z
  .object({
    categorie: categorieScoreSchema,
    /** Clé de gabarit (résolue en FR/EN à l'assemblage). */
    cle_gabarit: z.string().min(1),
    /** Substitutions du gabarit. */
    params: z.record(z.string(), z.union([z.string(), z.number()])),
    /** Valeur normalisée du sous-critère pour cet élève, dans [0,1]. */
    valeur: z.number().min(0).max(1),
    /** Contribution signée au score (poids × valeur, échelle du score). */
    contribution: z.number(),
  })
  .strict();
export type Facteur = z.infer<typeof facteurSchema>;

/** 2 · Donnée utilisée. */
export const donneeUtiliseeSchema = z
  .object({
    libelle: z.string().min(1),
    source: z.string().min(1),
    /** Date de la donnée la plus récente, ou null si absente. */
    fraicheur: z.string().nullable(),
    fiabilite: z.enum(['elevee', 'declarative', 'sourcee', 'absente']),
  })
  .strict();
export type DonneeUtilisee = z.infer<typeof donneeUtiliseeSchema>;

/** 3 · Alternative écartée. */
export const alternativeEcarteeSchema = z
  .object({
    filiere_id: z.string().min(1),
    filiere_libelle: z.string().min(1),
    raison: z.enum(['score_inferieur', 'prerequis_non_atteint', 'eloignement', 'capacite']),
    score: z.number().min(0).max(100),
  })
  .strict();
export type AlternativeEcartee = z.infer<typeof alternativeEcarteeSchema>;

/** 4 · Zone d'incertitude. */
export const zoneIncertitudeSchema = z
  .object({
    cle_gabarit: z.string().min(1),
    params: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
    /** Catégorie neutralisée par ce manque, le cas échéant. */
    categorie_neutralisee: categorieScoreSchema.nullable(),
  })
  .strict();
export type ZoneIncertitude = z.infer<typeof zoneIncertitudeSchema>;

/** 5 · Répartition du score : part de chaque catégorie. */
export const repartitionScoreSchema = z.object({
  parts: z.record(categorieScoreSchema, z.number().min(0).max(1)),
  /** Catégories neutralisées (donnée absente) — affichées à 0 %. */
  neutralisees: z.array(categorieScoreSchema),
});
export type RepartitionScore = z.infer<typeof repartitionScoreSchema>;

export const explicationSchema = z
  .object({
    facteurs_determinants: z.array(facteurSchema),
    donnees_utilisees: z.array(donneeUtiliseeSchema),
    alternatives_ecartees: z.array(alternativeEcarteeSchema),
    zones_incertitude: z.array(zoneIncertitudeSchema),
    repartition_score: repartitionScoreSchema,
  })
  .strict();
export type Explication = z.infer<typeof explicationSchema>;

export const niveauFiabiliteSchema = z.enum(['elevee', 'moyenne', 'a_consolider']);
export type NiveauFiabilite = z.infer<typeof niveauFiabiliteSchema>;
