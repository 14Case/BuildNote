import { z } from 'zod';
import { demandeOrientationSchema } from './demande.js';
import { explicationSchema, niveauFiabiliteSchema } from './explication.js';
import { scenarioScoreSchema } from './scenario.js';

/**
 * Dossier d'orientation : objet du Module 2, versionné et contestable
 * (EF-M2-22, EF-M2-24). Gabarit : gabarits-presentation.md §J.P.3.
 * Le moteur n'écrit **rien** dans Normalized (EF-M2-25).
 */

export const scenarioDossierSchema = z.object({
  scenario: scenarioScoreSchema,
  explication: explicationSchema,
});
export type ScenarioDossier = z.infer<typeof scenarioDossierSchema>;

export const avertissementFiabiliteSchema = z
  .object({
    niveau: niveauFiabiliteSchema,
    /** Clé de gabarit + params, rendus en FR/EN à l'export. */
    cle_gabarit: z.string().min(1),
    params: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
    /** Données à compléter pour améliorer la fiabilité. */
    a_completer: z.array(z.string().min(1)),
  })
  .strict();
export type AvertissementFiabilite = z.infer<typeof avertissementFiabiliteSchema>;

export const dossierOrientationSchema = z
  .object({
    demande: demandeOrientationSchema,
    numero_version: z.number().int().positive(),
    genere_le: z.string().datetime(),
    motif: z.enum(['initial', 'revision']),
    /** Synthèse courte (3–5 lignes), déjà rendue dans la langue de la demande. */
    synthese: z.string().min(1),
    avertissement_fiabilite: avertissementFiabiliteSchema,
    scenarios: z.array(scenarioDossierSchema),
    /** Rappels de pied de page. */
    version_referentiel_id: z.string().min(1),
    anciennete_mediane_donnees_mois: z.number().nonnegative(),
    version_ponderations: z.string().min(1),
    version_catalogue_gabarits: z.string().min(1),
  })
  .strict();
export type DossierOrientation = z.infer<typeof dossierOrientationSchema>;
