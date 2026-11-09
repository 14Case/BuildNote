import { z } from 'zod';
import { eleveIdSchema } from './ids.js';

/**
 * Profil dérivé de l'élève (Intelligence Data). Recalculable à tout moment
 * depuis Normalized ; jamais une source. Voir architecture-detaillee.md §J.3.2.
 */

export const styleTravailSchema = z.enum(['regulier', 'irregulier', 'indetermine']);
export type StyleTravail = z.infer<typeof styleTravailSchema>;

export const performanceMatiereSchema = z
  .object({
    matiere: z.string().min(1),
    /** Moyenne pondérée par coefficient, normalisée dans [0,1]. */
    niveau: z.number().min(0).max(1),
    /** Position relative dans la classe/le niveau, dans [0,1] (1 = tête). */
    position_relative: z.number().min(0).max(1).nullable(),
    /** Pente de la régression sur la série temporelle des notes validées. */
    tendance: z.number(),
    /** Régularité : 1 = très stable, 0 = très dispersé. */
    regularite: z.number().min(0).max(1),
    /** Nombre de notes validées ayant servi au calcul. */
    nb_notes: z.number().int().nonnegative(),
  })
  .strict();
export type PerformanceMatiere = z.infer<typeof performanceMatiereSchema>;

export const competenceDetecteeSchema = z
  .object({
    code: z.string().min(1),
    libelle: z.string().min(1),
    niveau_estime: z.number().min(0).max(1),
    /** Indice de confiance du calcul, dans [0,1]. */
    confiance: z.number().min(0).max(1),
    /** Matières / signaux ayant fondé la détection (base de calcul explicitée). */
    base_calcul: z.array(z.string().min(1)).min(1),
    /** Ajustement éventuel par le conseiller (supervision humaine). */
    ajuste_par_conseiller: z.boolean().default(false),
  })
  .strict();
export type CompetenceDetectee = z.infer<typeof competenceDetecteeSchema>;

export const profilAcademiqueSchema = z
  .object({
    eleve_id: eleveIdSchema,
    calcule_le: z.string().datetime(),
    /** Version de l'algorithme de profilage (calcul_trace). */
    version_algo: z.string().min(1),
    performances: z.array(performanceMatiereSchema),
    matieres_fortes: z.array(z.string().min(1)),
    matieres_fragiles: z.array(z.string().min(1)),
    style_travail: styleTravailSchema,
    competences: z.array(competenceDetecteeSchema),
    /** Longueur de l'historique mobilisé, en années scolaires. */
    profondeur_historique_annees: z.number().nonnegative(),
  })
  .strict();
export type ProfilAcademique = z.infer<typeof profilAcademiqueSchema>;
