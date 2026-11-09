import { z } from 'zod';

/**
 * Interface d'abstraction OCR (contrat interne).
 * Réf. docs/08-ocr-computer-vision/pipeline.md §I.15.
 *
 * IMPORTANT (ADR-0001) : aucun moteur n'est choisi. Toute reconnaissance passe par ce contrat.
 * Le développement utilise un fournisseur simulé ; les POC 1 & 2 tranchent la décision #3.
 */

/** Boîte englobante [x_min, y_min, x_max, y_max] en pixels de l'image prétraitée. */
export const bboxSchema = z.tuple([z.number(), z.number(), z.number(), z.number()]);
export type Bbox = z.infer<typeof bboxSchema>;

export const typeAttenduSchema = z.enum(['nombre', 'texte_court', 'enumere', 'texte_libre']);
export type TypeAttendu = z.infer<typeof typeAttenduSchema>;

export const roleColonneSchema = z.enum([
  'nom',
  'prenom',
  'nom_prenom',
  'matricule',
  'note',
  'coefficient',
  'appreciation',
  'rang',
  'moyenne',
  'autre',
]);
export type RoleColonne = z.infer<typeof roleColonneSchema>;

export const ecritureSchema = z.enum(['imprime', 'manuscrit']);
export type Ecriture = z.infer<typeof ecritureSchema>;

export const varianteSchema = z.object({ texte: z.string(), score: z.number().min(0).max(1) });
export type Variante = z.infer<typeof varianteSchema>;

/** Sortie de `reconnaitre(zone_image, type_attendu)`. */
export const reconnaissanceSchema = z.object({
  texte: z.string(),
  score: z.number().min(0).max(1),
  variantes: z.array(varianteSchema),
  bbox: bboxSchema,
  ecriture: ecritureSchema.optional(),
});
export type Reconnaissance = z.infer<typeof reconnaissanceSchema>;

export const colonneSchema = z.object({
  index: z.number().int().nonnegative(),
  role: roleColonneSchema,
  libelleEntete: z.string().optional(),
  scoreRole: z.number().min(0).max(1),
});

export const celluleReconnueSchema = z.object({
  ligne: z.number().int().nonnegative(),
  colonne: z.number().int().nonnegative(),
  reconnaissance: reconnaissanceSchema,
});

/** Sortie de `detecter_structure(image, gabarit?)`. */
export const structureSchema = z.object({
  zones: z.object({
    entete: bboxSchema.nullable(),
    tableau: bboxSchema.nullable(),
    piedDePage: bboxSchema.nullable(),
  }),
  nbLignes: z.number().int().nonnegative(),
  colonnes: z.array(colonneSchema),
  cellules: z.array(celluleReconnueSchema),
  entete: z
    .object({
      texteBrut: z.string(),
      matiere: z.string().optional(),
      date: z.string().optional(),
      evaluation: z.string().optional(),
    })
    .nullable(),
  scoreStructure: z.number().min(0).max(1),
  sansBordure: z.boolean(),
});
export type Structure = z.infer<typeof structureSchema>;

export const capacitesOcrSchema = z.object({
  imprime: z.boolean(),
  manuscrit: z.boolean(),
  horsLigne: z.boolean(),
  langues: z.array(z.string()),
});
export type CapacitesOcr = z.infer<typeof capacitesOcrSchema>;

export interface EntreeImage {
  readonly donnees: Uint8Array;
  readonly typeMime: string;
  readonly largeur?: number;
  readonly hauteur?: number;
}

/**
 * Contrat que doit implémenter tout fournisseur OCR (simulé, managé, open source, combinaison).
 */
export interface OcrProvider {
  readonly nom: string;
  readonly version: string;
  detecterStructure(image: EntreeImage, gabaritId?: string): Promise<Structure>;
  reconnaitre(zoneImage: EntreeImage, typeAttendu: TypeAttendu): Promise<Reconnaissance>;
  capacites(): CapacitesOcr;
}
