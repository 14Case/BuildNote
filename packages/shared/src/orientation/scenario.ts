import { z } from 'zod';
import { filiereIdSchema, formationIdSchema, metierIdSchema } from './ids.js';

/**
 * Scénario d'orientation : chaîne filière → formations → établissements → métiers,
 * scoré et classé (EF-M2-16). Voir architecture-detaillee.md §J.3.3.
 */

export const etablissementScenarioSchema = z
  .object({
    etablissement_reference_id: z.string().min(1),
    libelle: z.string().min(1),
    /** Distance à l'élève en km (EF-M2-13). */
    distance_km: z.number().nonnegative(),
    internat: z.boolean(),
    /** Probabilité d'accès estimée, dans [0,1]. null si non estimable. */
    probabilite_acces: z.number().min(0).max(1).nullable(),
  })
  .strict();
export type EtablissementScenario = z.infer<typeof etablissementScenarioSchema>;

/** Badges informatifs (non valorisants) — gabarits-presentation.md §J.P.4. */
export const badgeScenarioSchema = z.enum([
  'sous_condition',
  'offre_eloignee',
  'capacite_limitee',
  'metier_en_tension',
  'secteur_prioritaire',
]);
export type BadgeScenario = z.infer<typeof badgeScenarioSchema>;

export const scenarioCandidatSchema = z
  .object({
    filiere_id: filiereIdSchema,
    filiere_libelle: z.string().min(1),
    formations: z.array(z.object({ id: formationIdSchema, libelle: z.string().min(1) })).min(1),
    etablissements: z.array(etablissementScenarioSchema),
    metiers: z.array(z.object({ id: metierIdSchema, libelle: z.string().min(1) })),
    /** Vrai si la filière vient d'une aspiration de l'élève (élargissement). */
    issu_aspiration: z.boolean(),
  })
  .strict();
export type ScenarioCandidat = z.infer<typeof scenarioCandidatSchema>;

/**
 * Verdict du moteur de règles sur un scénario (J.3.4). Un scénario n'est
 * **jamais supprimé silencieusement** : il est classé, ou marqué « sous
 * condition », ou écarté **avec explication**.
 */
export const verdictRegleSchema = z.enum(['retenu', 'sous_condition', 'ecarte']);
export type VerdictRegle = z.infer<typeof verdictRegleSchema>;

export const scenarioScoreSchema = scenarioCandidatSchema.extend({
  rang: z.number().int().positive(),
  /** Score relatif entre scénarios, dans [0,100]. Pas une probabilité de réussite. */
  score: z.number().min(0).max(100),
  verdict: verdictRegleSchema,
  badges: z.array(badgeScenarioSchema),
});
export type ScenarioScore = z.infer<typeof scenarioScoreSchema>;
