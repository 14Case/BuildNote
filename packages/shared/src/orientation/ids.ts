import { z } from 'zod';

/**
 * Identifiants. Le modèle physique (choix de type de clé) est tranché en
 * Couche 4 ; ici on impose « chaîne non vide » et on nomme les cibles via des
 * alias de type pour la lisibilité des signatures.
 */
export const idSchema = z.string().min(1);

export const eleveIdSchema = idSchema;
export const etablissementIdSchema = idSchema;
export const anneeScolaireIdSchema = idSchema;
export const filiereIdSchema = idSchema;
export const formationIdSchema = idSchema;
export const etablissementReferenceIdSchema = idSchema;
export const metierIdSchema = idSchema;
export const demandeOrientationIdSchema = idSchema;
export const utilisateurIdSchema = idSchema;

export type EleveId = string;
export type EtablissementId = string;
export type AnneeScolaireId = string;
export type FiliereId = string;
export type FormationId = string;
export type EtablissementReferenceId = string;
export type MetierId = string;
export type DemandeOrientationId = string;
export type UtilisateurId = string;

/** Langue de rendu. Bilinguisme FR/EN de bout en bout (EF-SOC-02). */
export const langueSchema = z.enum(['fr', 'en']);
export type Langue = z.infer<typeof langueSchema>;
