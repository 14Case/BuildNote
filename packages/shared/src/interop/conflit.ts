import { z } from 'zod';

export const strategieConflitSchema = z.enum([
  'source_prioritaire',
  'dernier_horodatage',
  'non_vide',
  'revue_manuelle',
]);
export type StrategieConflit = z.infer<typeof strategieConflitSchema>;

export const detectionConflitSchema = z.object({
  id: z.string().uuid(),
  entiteType: z.enum(['note', 'eleve', 'classe', 'matiere']),
  cleRapprochement: z.string(),
  valeurExistante: z.any(),
  sourceExistante: z.string(),
  valeurImportee: z.any(),
  sourceImportee: z.string(),
  resolu: z.boolean().default(false),
  strategieAppliquee: strategieConflitSchema.optional(),
  valeurRetenue: z.any().optional(),
  motif: z.string().optional(),
  horodatage: z.string(),
});
export type DetectionConflit = z.infer<typeof detectionConflitSchema>;

/**
 * Garde-fou strict H.5.3 / EF-M1-16 :
 * Une note validée par le Module 1 ne peut JAMAIS être écrasée silencieusement
 * par une valeur importée d'une source externe.
 */
export const arbitrerConflitNote = (
  valeurExistante: number | null,
  origineExistante: string, // ex: 'module1_valide', 'manuel', 'import'
  valeurImportee: number | null,
  strategieParDefaut: StrategieConflit = 'revue_manuelle',
): {
  enConflit: boolean;
  valeurRetenue: number | null;
  doitAllerEnRevue: boolean;
  motif: string;
} => {
  // Même valeur ou valeurs nulles identiques : pas de conflit réel
  if (valeurExistante === valeurImportee) {
    return {
      enConflit: false,
      valeurRetenue: valeurExistante,
      doitAllerEnRevue: false,
      motif: 'valeurs_identiques',
    };
  }

  // Si l'existant a été validé par le Module 1 (revue humaine obligatoire)
  if (origineExistante === 'module1_valide' || origineExistante === 'ocr') {
    return {
      enConflit: true,
      valeurRetenue: valeurExistante, // La valeur Module 1 fait foi par défaut
      doitAllerEnRevue: true,
      motif: 'protection_note_module1_validee',
    };
  }

  // Autres cas selon stratégie
  if (strategieParDefaut === 'source_prioritaire') {
    return {
      enConflit: false,
      valeurRetenue: valeurExistante ?? valeurImportee,
      doitAllerEnRevue: false,
      motif: 'source_existante_prioritaire',
    };
  }

  return {
    enConflit: true,
    valeurRetenue: valeurExistante,
    doitAllerEnRevue: true,
    motif: 'divergence_a_arbitrer',
  };
};
