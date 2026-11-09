import { z } from 'zod';
import {
  anneeScolaireIdSchema,
  demandeOrientationIdSchema,
  eleveIdSchema,
  etablissementIdSchema,
  langueSchema,
  utilisateurIdSchema,
} from './ids.js';
import { palierOrientationSchema } from './referentiel.js';

/**
 * Consentement à l'usage des données du Module 2 (EF-M2-11).
 * Sans consentement enregistré (élève + parents), la génération est refusée
 * avant toute lecture de données.
 */
export const consentementSchema = z
  .object({
    eleve: z.boolean(),
    parents: z.boolean(),
    enregistre_le: z.string().datetime(),
  })
  .strict();
export type Consentement = z.infer<typeof consentementSchema>;

export const consentementComplet = (c: Consentement | null | undefined): c is Consentement =>
  !!c && c.eleve === true && c.parents === true;

/**
 * Instantané cohérent : identifie la lecture figée de Normalized au moment de
 * la demande (architecture-detaillee.md §J.3.1). Rejouer
 * `instantane + version_referentiel + version_ponderations` reproduit le même
 * dossier.
 */
export const instantaneSchema = z
  .object({
    id: z.string().min(1),
    horodatage: z.string().datetime(),
  })
  .strict();
export type Instantane = z.infer<typeof instantaneSchema>;

export const statutDemandeSchema = z.enum(['en_cours', 'genere', 'refuse_consentement', 'erreur']);
export type StatutDemande = z.infer<typeof statutDemandeSchema>;

/**
 * Demande d'orientation individuelle. Déclenchée explicitement par un conseiller
 * habilité (EF-M2-10) — jamais par un événement « note écrite » (EF-M1-19).
 */
export const demandeOrientationSchema = z
  .object({
    id: demandeOrientationIdSchema,
    eleve_id: eleveIdSchema,
    etablissement_id: etablissementIdSchema,
    annee_scolaire_id: anneeScolaireIdSchema,
    declenchee_par: utilisateurIdSchema,
    horodatage: z.string().datetime(),
    langue: langueSchema,
    /** Palier d'orientation charnière ciblé. */
    palier: palierOrientationSchema.optional(),
    version_referentiel_id: z.string().min(1),
    version_ponderations: z.string().min(1),
    instantane: instantaneSchema,
    statut: statutDemandeSchema,
  })
  .strict();
export type DemandeOrientation = z.infer<typeof demandeOrientationSchema>;

/** Entrée d'appel du moteur : ce que fournit l'appelant (couche API). */
export const entreeDemandeSchema = z
  .object({
    eleve_id: eleveIdSchema,
    etablissement_id: etablissementIdSchema,
    annee_scolaire_id: anneeScolaireIdSchema,
    declenchee_par: utilisateurIdSchema,
    langue: langueSchema,
    /** Palier forcé ou explicité ; déduit du niveau si omis. */
    palier: palierOrientationSchema.optional(),
    /** Jeu de pondérations à utiliser ; défaut publié si absent. */
    version_ponderations: z.string().min(1).optional(),
  })
  .strict();
export type EntreeDemande = z.infer<typeof entreeDemandeSchema>;
