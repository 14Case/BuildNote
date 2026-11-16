import { z } from 'zod';

export const VERSION_SCHEMA_CANONIQUE = 'v1' as const;

export const canoniqueSexeSchema = z.enum(['masculin', 'feminin', 'non_precise']);
export type CanoniqueSexe = z.infer<typeof canoniqueSexeSchema>;

export const canoniqueTypeEvaluationSchema = z.enum(['devoir', 'composition', 'interrogation']);
export type CanoniqueTypeEvaluation = z.infer<typeof canoniqueTypeEvaluationSchema>;

export const canoniquePeriodeSchema = z.enum(['T1', 'T2', 'T3', 'Semestre1', 'Semestre2']);
export type CanoniquePeriode = z.infer<typeof canoniquePeriodeSchema>;

export const canoniqueEleveSchema = z.object({
  matricule: z.string().min(1).optional(),
  codeNational: z.string().optional(),
  nom: z.string().min(1),
  prenoms: z.string().default(''),
  sexe: canoniqueSexeSchema.default('non_precise'),
  dateNaissance: z.string().optional(), // Format YYYY-MM-DD
  classeLibelle: z.string().min(1),
  anneeScolaire: z.string().min(1), // Ex: '2024-2025'
});
export type CanoniqueEleve = z.infer<typeof canoniqueEleveSchema>;

export const canoniqueClasseSchema = z.object({
  libelle: z.string().min(1),
  niveau: z.string().min(1), // Ex: '3eme', '2nde', 'CM2'
  anneeScolaire: z.string().min(1),
});
export type CanoniqueClasse = z.infer<typeof canoniqueClasseSchema>;

export const canoniqueMatiereSchema = z.object({
  code: z.string().min(1), // Ex: 'MATHS', 'PC', 'FR'
  libelleFr: z.string().min(1),
  libelleEn: z.string().min(1),
  coefficientDefaut: z.number().positive().default(1),
});
export type CanoniqueMatiere = z.infer<typeof canoniqueMatiereSchema>;

export const canoniqueEvaluationSchema = z.object({
  idInterne: z.string().optional(),
  classeLibelle: z.string().min(1),
  matiereCode: z.string().min(1),
  anneeScolaire: z.string().min(1),
  periode: canoniquePeriodeSchema.default('T1'),
  type: canoniqueTypeEvaluationSchema.default('devoir'),
  libelle: z.string().min(1),
  date: z.string().optional(), // YYYY-MM-DD
  baremeMax: z.number().positive().default(20),
});
export type CanoniqueEvaluation = z.infer<typeof canoniqueEvaluationSchema>;

export const canoniqueNoteSchema = z.object({
  eleveMatricule: z.string().optional(),
  eleveNom: z.string().min(1),
  elevePrenoms: z.string().optional(),
  classeLibelle: z.string().min(1),
  matiereCode: z.string().min(1),
  evaluationLibelle: z.string().min(1),
  anneeScolaire: z.string().min(1),
  valeur: z.number().min(0).max(100).nullable(), // null = absent / dispensé
  statut: z.enum(['note', 'absent', 'dispense']).default('note'),
  appreciation: z.string().optional(),
  date: z.string().optional(),
});
export type CanoniqueNote = z.infer<typeof canoniqueNoteSchema>;

export const canoniqueLotImportSchema = z.object({
  versionSchema: z.literal(VERSION_SCHEMA_CANONIQUE).default(VERSION_SCHEMA_CANONIQUE),
  source: z.string().min(1),
  anneeScolaire: z.string().min(1),
  eleves: z.array(canoniqueEleveSchema).default([]),
  classes: z.array(canoniqueClasseSchema).default([]),
  matieres: z.array(canoniqueMatiereSchema).default([]),
  evaluations: z.array(canoniqueEvaluationSchema).default([]),
  notes: z.array(canoniqueNoteSchema).default([]),
});
export type CanoniqueLotImport = z.infer<typeof canoniqueLotImportSchema>;
