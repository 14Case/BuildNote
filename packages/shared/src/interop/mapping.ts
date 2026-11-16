import { z } from 'zod';

export type TransformationFonction =
  | 'trim'
  | 'upper'
  | 'lower'
  | 'normaliser_nom'
  | 'format_date'
  | 'virgule_vers_point'
  | 'convertir_nombre';

/** Normalise un nom de personne (retrait accents, espaces doubles, majuscules, apostrophes standard). */
export const normaliserNom = (val: string): string => {
  return val
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
};

/** Convertit une date hétérogène (DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY) vers le format canonique ISO YYYY-MM-DD. */
export const normaliserDate = (val: string): string | null => {
  const s = val.trim();
  if (!s || s === '0000-00-00' || s === '00/00/0000') return null;

  // Format DD/MM/YYYY ou DD-MM-YYYY
  const mDmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (mDmy) {
    const [, d, m, y] = mDmy;
    const jour = d!.padStart(2, '0');
    const mois = m!.padStart(2, '0');
    return `${y}-${mois}-${jour}`;
  }

  // Format YYYY-MM-DD
  const mYmd = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (mYmd) {
    const [, y, m, d] = mYmd;
    const mois = m!.padStart(2, '0');
    const jour = d!.padStart(2, '0');
    return `${y}-${mois}-${jour}`;
  }

  return null;
};

/** Parse un nombre avec virgule ou point décimal (ex: "14,5" -> 14.5). */
export const parserNombreDecimal = (val: any): number | null => {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const s = String(val).trim().replace(',', '.');
  if (!s) return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
};

/** Détecte si la valeur indique une absence ou dispense. */
export const estValeurAbsence = (val: any): boolean => {
  if (val === null || val === undefined) return false;
  const s = String(val).trim().toLowerCase();
  return /^(abs|absent|absente|ab|-|disp|dispense|\/)$/.test(s);
};

export const regleMappingChampSchema = z.object({
  colonneSource: z.string().min(1),
  champCible: z.string().min(1),
  transformations: z.array(z.string()).default([]),
  tableValeurs: z.record(z.string(), z.string()).optional(),
  valeurDefaut: z.any().optional(),
  requis: z.boolean().default(false),
});
export type RegleMappingChamp = z.infer<typeof regleMappingChampSchema>;

export const configurationMappingSchema = z.object({
  version: z.string().default('1.0'),
  sourceType: z.enum(['csv', 'excel', 'json', 'sql']),
  referenceSource: z.string().min(1),
  separateur: z.string().default(';'),
  anneeScolaireDefaut: z.string().min(1),
  classeLibelleDefaut: z.string().optional(),
  niveauDefaut: z.string().optional(),
  champs: z.array(regleMappingChampSchema).default([]),
  tableauCroise: z
    .object({
      actif: z.boolean().default(false),
      colonnesEleve: z.array(z.string()).default(['Nom & Prénom', 'Nom', 'Prénom', 'Sexe', 'Né(e) le', 'Matricule']),
      colonnesIgnorées: z.array(z.string()).default(['Moyenne', 'Rang', 'Moy', 'Rg', 'Total', 'Observation']),
      baremeParDefaut: z.number().default(20),
      periodeParDefaut: z.enum(['T1', 'T2', 'T3', 'Semestre1', 'Semestre2']).default('T1'),
      typeEvalParDefaut: z.enum(['devoir', 'composition', 'interrogation']).default('composition'),
    })
    .optional(),
  tableSynonymesMatieres: z.record(z.string(), z.string()).default({
    MATHS: 'MATHS',
    MATH: 'MATHS',
    MATHEMATIQUES: 'MATHS',
    MATHEMATICS: 'MATHS',
    PC: 'PC',
    PCT: 'PC',
    PHYSIQUE: 'PC',
    PHYSICS: 'PC',
    CHIMIE: 'PC',
    CHEMISTRY: 'PC',
    SVT: 'SVT',
    BIOLOGIE: 'SVT',
    BIOLOGY: 'SVT',
    FR: 'FR',
    FRANCAIS: 'FR',
    FRENCH: 'FR',
    ANG: 'ANG',
    ANGLAIS: 'ANG',
    ENGLISH: 'ANG',
    HG: 'HG',
    HISTOIRE: 'HG',
    GEOGRAPHIE: 'HG',
    HISTORY: 'HG',
    GEOGRAPHY: 'HG',
    INFO: 'INFO',
    INFORMATIQUE: 'INFO',
    COMPUTER: 'INFO',
    EPS: 'EPS',
    SPORT: 'EPS',
  }),
});
export type ConfigurationMapping = z.infer<typeof configurationMappingSchema>;
