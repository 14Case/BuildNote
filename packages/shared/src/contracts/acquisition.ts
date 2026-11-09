import { z } from 'zod';
import { baremeSchema } from '../domain/bareme.js';
import { statutNoteSchema } from '../domain/valeur.js';
import { bandeConfianceSchema } from '../domain/confidence.js';
import { bboxSchema, varianteSchema, roleColonneSchema } from './ocr.js';

/**
 * Contrats d'API de la chaîne d'acquisition du Module 1.
 * Réf. docs/04-architecture-fonctionnelle §E.3, docs/08-ocr-computer-vision/pipeline.md (étapes 7→10),
 * docs/06-architecture-donnees/modele-conceptuel-logique-physique.md §G.2.
 *
 * Version du contrat — incrémentée à chaque changement incompatible (cf. versioning schéma canonique).
 */
export const VERSION_CONTRAT_ACQUISITION = '1.0.0';

export const uuidSchema = z.string().uuid();

/* ------------------------------------------------------------------ */
/* Lot de saisie                                                       */
/* ------------------------------------------------------------------ */

export const statutLotSchema = z.enum([
  'ouvert', // créé, pas encore d'extraction
  'extraction_faite', // formulaire prérempli disponible
  'en_revue', // corrections humaines en cours (brouillon)
  'valide', // validation humaine explicite effectuée → écrit en Normalized
  'en_conflit', // synchronisation : note déjà présente, résolution requise
]);
export type StatutLot = z.infer<typeof statutLotSchema>;

export const creerLotSchema = z.object({
  enseignementId: uuidSchema,
  evaluationId: uuidSchema,
});
export type CreerLot = z.infer<typeof creerLotSchema>;

export const lotSchema = z.object({
  id: uuidSchema,
  etablissementId: uuidSchema,
  enseignementId: uuidSchema,
  evaluationId: uuidSchema,
  statut: statutLotSchema,
  creeParUserId: uuidSchema,
  creeLe: z.string().datetime(),
});
export type Lot = z.infer<typeof lotSchema>;

/* ------------------------------------------------------------------ */
/* Upload de média (Raw)                                               */
/* ------------------------------------------------------------------ */

export const pageDocumentSchema = z.object({
  id: uuidSchema,
  numero: z.number().int().positive(),
  uri: z.string(),
  largeur: z.number().int().positive().nullable(),
  hauteur: z.number().int().positive().nullable(),
});

export const documentSourceSchema = z.object({
  id: uuidSchema,
  lotId: uuidSchema,
  typeMedia: z.enum(['image', 'pdf', 'video']),
  hash: z.string(),
  taille: z.number().int().nonnegative(),
  captureLe: z.string().datetime(),
  pages: z.array(pageDocumentSchema),
});
export type DocumentSource = z.infer<typeof documentSourceSchema>;

/* ------------------------------------------------------------------ */
/* Extraction OCR (Raw) — déclenchée explicitement                     */
/* ------------------------------------------------------------------ */

export const lancerExtractionSchema = z.object({
  gabaritId: z.string().optional(),
  /** true = exécution hors-ligne / dégradée acceptée (EF-M1-15). */
  horsLigne: z.boolean().default(false),
});
export type LancerExtraction = z.infer<typeof lancerExtractionSchema>;

export const extractionSchema = z.object({
  id: uuidSchema,
  lotId: uuidSchema,
  moteur: z.string(),
  versionMoteur: z.string(),
  scoreGlobal: z.number().min(0).max(1),
  statut: z.enum(['ok', 'structure_non_reconnue', 'echec']),
  horodatage: z.string().datetime(),
});
export type Extraction = z.infer<typeof extractionSchema>;

/* ------------------------------------------------------------------ */
/* Formulaire prérempli (structuration, étape 7)                       */
/* ------------------------------------------------------------------ */

export const sourceValeurSchema = z.enum(['ocr', 'corrige_manuellement', 'confirme']);
export type SourceValeur = z.infer<typeof sourceValeurSchema>;

export const rapprochementSchema = z.object({
  statut: z.enum(['auto', 'manuel', 'non_rapproche']),
  eleveId: uuidSchema.nullable(),
  nomReconnu: z.string(),
  score: z.number().min(0).max(1).nullable(),
});

export const celluleNoteSchema = z.object({
  valeur: z.number().nullable(),
  statut: statutNoteSchema.nullable(),
  valeurOcr: z.string(),
  source: sourceValeurSchema,
  confiance: z.object({ score: z.number().min(0).max(1), bande: bandeConfianceSchema }),
  variantes: z.array(varianteSchema),
  bbox: bboxSchema.nullable(),
  /** true si hors des bornes du barème (EF-M1-09) — n'empêche pas la revue, l'humain tranche. */
  horsBareme: z.boolean(),
});
export type CelluleNote = z.infer<typeof celluleNoteSchema>;

export const celluleTexteSchema = z.object({
  texte: z.string(),
  source: sourceValeurSchema,
  confiance: z.object({ score: z.number().min(0).max(1), bande: bandeConfianceSchema }),
  bbox: bboxSchema.nullable(),
});

export const ligneFormulaireSchema = z.object({
  ligneIndex: z.number().int().nonnegative(),
  rapprochement: rapprochementSchema,
  note: celluleNoteSchema,
  appreciation: celluleTexteSchema.nullable(),
});
export type LigneFormulaire = z.infer<typeof ligneFormulaireSchema>;

export const formulairePreremptSchema = z.object({
  lotId: uuidSchema,
  versionContrat: z.string(),
  evaluation: z.object({
    id: uuidSchema,
    libelle: z.string(),
    type: z.string(),
    date: z.string().nullable(),
    matiere: z.string(),
  }),
  bareme: baremeSchema,
  entete: z.object({
    matiereDetectee: z.string().nullable(),
    evaluationDetectee: z.string().nullable(),
    dateDetectee: z.string().nullable(),
    /** true si l'en-tête lu diverge de l'évaluation choisie (pipeline §I.6 — alerte). */
    divergence: z.boolean(),
  }),
  colonnesDetectees: z.array(z.object({ index: z.number(), role: roleColonneSchema })),
  lignes: z.array(ligneFormulaireSchema),
  alertes: z.object({
    horsBareme: z.number().int().nonnegative(),
    lignesNonRapprochees: z.number().int().nonnegative(),
    elevesSansNote: z.array(uuidSchema),
    doublonsEleve: z.array(uuidSchema),
  }),
  resume: z.object({
    nbLignes: z.number().int().nonnegative(),
    nbNotes: z.number().int().nonnegative(),
    nbAbsents: z.number().int().nonnegative(),
    nbCorrigees: z.number().int().nonnegative(),
    nbConfirmees: z.number().int().nonnegative(),
    nbAControler: z.number().int().nonnegative(),
  }),
  structureReconnue: z.boolean(),
});
export type FormulairePrerempt = z.infer<typeof formulairePreremptSchema>;

/* ------------------------------------------------------------------ */
/* Corrections humaines (brouillon — n'écrit RIEN en Normalized)       */
/* ------------------------------------------------------------------ */

export const editionCelluleSchema = z.discriminatedUnion('champ', [
  z.object({
    champ: z.literal('note'),
    ligneIndex: z.number().int().nonnegative(),
    valeur: z.number().nullable(),
    statut: statutNoteSchema.nullable(),
  }),
  z.object({
    champ: z.literal('appreciation'),
    ligneIndex: z.number().int().nonnegative(),
    texte: z.string(),
  }),
  z.object({
    champ: z.literal('rapprochement'),
    ligneIndex: z.number().int().nonnegative(),
    eleveId: uuidSchema.nullable(),
  }),
  z.object({
    champ: z.literal('confirmation'),
    ligneIndex: z.number().int().nonnegative(),
  }),
]);
export type EditionCellule = z.infer<typeof editionCelluleSchema>;

export const patchFormulaireSchema = z.object({
  editions: z.array(editionCelluleSchema).min(1),
});
export type PatchFormulaire = z.infer<typeof patchFormulaireSchema>;

/* ------------------------------------------------------------------ */
/* Validation humaine explicite (LA PORTE — EF-M1-10/11/13)            */
/* ------------------------------------------------------------------ */

export const demandeValidationSchema = z.object({
  /** Clé d'idempotence (rejeu hors-ligne sans double écriture — EF-M1-15). */
  idempotencyKey: z.string().min(8).max(200),
  roleValidation: z.enum(['enseignant', 'responsable']),
  /** L'humain confirme explicitement avoir vu le récapitulatif (EF-M1-11). */
  resumeAccepte: z.literal(true),
  /** Hash du formulaire tel qu'affiché au moment de la validation (anti-écrasement). */
  empreinteFormulaire: z.string(),
});
export type DemandeValidation = z.infer<typeof demandeValidationSchema>;

export const resultatValidationSchema = z.object({
  lotId: uuidSchema,
  statut: z.literal('valide'),
  validationId: uuidSchema,
  notesEcrites: z.number().int().nonnegative(),
  contreValidationRequise: z.boolean(),
});
export type ResultatValidation = z.infer<typeof resultatValidationSchema>;

export const conflitNoteSchema = z.object({
  eleveId: uuidSchema,
  nomEleve: z.string(),
  evaluationId: uuidSchema,
  valeurExistante: z.string(),
  valeurProposee: z.string(),
});

export const rapportConflitSchema = z.object({
  lotId: uuidSchema,
  statut: z.literal('en_conflit'),
  conflits: z.array(conflitNoteSchema),
});
export type RapportConflit = z.infer<typeof rapportConflitSchema>;

export const resolutionConflitSchema = z.object({
  idempotencyKey: z.string().min(8).max(200),
  decisions: z
    .array(
      z.object({
        eleveId: uuidSchema,
        action: z.enum(['garder_existante', 'remplacer']),
      }),
    )
    .min(1),
});
export type ResolutionConflit = z.infer<typeof resolutionConflitSchema>;

/* ------------------------------------------------------------------ */
/* Enveloppe d'erreur                                                  */
/* ------------------------------------------------------------------ */

export const erreurApiSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});
export type ErreurApi = z.infer<typeof erreurApiSchema>;
