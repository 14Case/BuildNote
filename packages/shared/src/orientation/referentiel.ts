import { z } from 'zod';
import {
  etablissementReferenceIdSchema,
  filiereIdSchema,
  formationIdSchema,
  metierIdSchema,
} from './ids.js';

/**
 * Référentiels d'orientation (Reference Data), lus à une **version épinglée**
 * au moment de la demande. Voir architecture-detaillee.md §J.3.3 et §J.5.
 * Libellés bilingues (_fr / _en) — EF-M2 / ENF-I18N-05.
 */

const libelleBilingue = z.object({ fr: z.string().min(1), en: z.string().min(1) }).strict();

/**
 * Palier d'orientation charnière :
 * - primaire_vers_secondaire : fin de primaire (CM2 / Class 6) vers études secondaires
 * - premier_cycle_vers_second_cycle : fin de 1er cycle secondaire (3e / 4e année tech / Form 5) vers 2nd cycle
 * - terminale_vers_superieur : fin de 2nd cycle secondaire (Terminale / Upper Sixth) vers enseignement supérieur
 */
export const palierOrientationSchema = z.enum([
  'primaire_vers_secondaire',
  'premier_cycle_vers_second_cycle',
  'terminale_vers_superieur',
]);
export type PalierOrientation = z.infer<typeof palierOrientationSchema>;

/** Détermine le palier d'orientation à partir du code ou libellé d'un niveau d'enseignement. */
export const determinerPalierOrientation = (niveau: string): PalierOrientation | null => {
  const norm = niveau
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^a-z0-9]/g, '');

  if (/^(cm2|class6|primary6|classe6)/.test(norm)) {
    return 'primaire_vers_secondaire';
  }
  if (/^(3e|3eme|troisieme|4e|4eme|form5)/.test(norm)) {
    return 'premier_cycle_vers_second_cycle';
  }
  if (/^(terminale|tle|uppersixth|u6)/.test(norm)) {
    return 'terminale_vers_superieur';
  }
  return null;
};

export const filiereSchema = z
  .object({
    id: filiereIdSchema,
    libelle: libelleBilingue,
    /** Palier d'orientation ciblé par cette filière. */
    palier: palierOrientationSchema.optional(),
    /** Niveaux depuis lesquels la filière est accessible (codes canoniques). */
    accessible_depuis: z.array(z.string().min(1)).min(1),
    /** Prérequis exprimés en niveau minimal attendu par matière, dans [0,1]. */
    prerequis: z.array(z.object({ matiere: z.string().min(1), niveau_min: z.number().min(0).max(1) })),
  })
  .strict();
export type Filiere = z.infer<typeof filiereSchema>;

export const formationSchema = z
  .object({
    id: formationIdSchema,
    filiere_id: filiereIdSchema,
    libelle: libelleBilingue,
    /** Sélectivité estimée, dans [0,1] (1 = très sélectif). null si inconnue. */
    selectivite: z.number().min(0).max(1).nullable(),
    metiers: z.array(metierIdSchema),
  })
  .strict();
export type Formation = z.infer<typeof formationSchema>;

export const offreFormationSchema = z
  .object({
    formation_id: formationIdSchema,
    etablissement_reference_id: etablissementReferenceIdSchema,
    /** Internat proposé. */
    internat: z.boolean(),
    /** Capacité indicative (places), null si inconnue. */
    capacite: z.number().int().positive().nullable(),
  })
  .strict();
export type OffreFormation = z.infer<typeof offreFormationSchema>;

export const etablissementReferenceSchema = z
  .object({
    id: etablissementReferenceIdSchema,
    libelle: z.string().min(1),
    /** Position géographique pour le calcul de distance à l'élève (EF-M2-13). */
    localisation: z.object({ lat: z.number(), lon: z.number() }),
  })
  .strict();
export type EtablissementReference = z.infer<typeof etablissementReferenceSchema>;

export const metierSchema = z
  .object({
    id: metierIdSchema,
    libelle: libelleBilingue,
    competences_requises: z.array(z.string().min(1)),
    /** Diversité des débouchés, dans [0,1]. */
    perspectives: z.number().min(0).max(1),
  })
  .strict();
export type Metier = z.infer<typeof metierSchema>;

/**
 * Entrée du référentiel stratégique national. Chaque entrée est **sourcée et
 * datée** (EF-M2-41) et **pondère** sans rien verrouiller (EF-M2-19).
 */
export const entreeStrategiqueNationaleSchema = z
  .object({
    /** Cible : un métier, une compétence ou un secteur. */
    cible_type: z.enum(['metier', 'competence', 'secteur']),
    cible_ref: z.string().min(1),
    /** Intensité du besoin national, dans [0,1] (ex. métier en tension). */
    intensite: z.number().min(0).max(1),
    secteur_prioritaire: z.boolean(),
    source: z.object({
      reference: z.string().min(1),
      organisme: z.string().min(1),
      url: z.string().url().optional(),
      date_publication: z.string().date(),
      date_consultation: z.string().date(),
    }),
  })
  .strict();
export type EntreeStrategiqueNationale = z.infer<typeof entreeStrategiqueNationaleSchema>;

export const versionReferentielSchema = z
  .object({
    id: z.string().min(1),
    date_publication: z.string().date(),
    /** Ancienneté médiane des sources, en mois (KPI : ≤ 24). */
    anciennete_mediane_mois: z.number().nonnegative(),
  })
  .strict();
export type VersionReferentiel = z.infer<typeof versionReferentielSchema>;
