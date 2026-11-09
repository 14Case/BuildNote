/**
 * Schéma Drizzle (miroir de `ddl.ts`). Sert au typage des requêtes.
 * Toute table de données métier porte `etablissementId` (isolation multi-tenant).
 */
import {
  bigint,
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const etablissement = pgTable('etablissement', {
  id: uuid('id').primaryKey(),
  nom: text('nom').notNull(),
  type: text('type').notNull(),
  pays: text('pays').notNull().default('CM'),
  code: text('code').notNull(),
  statut: text('statut').notNull().default('actif'),
  creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
});

export const utilisateur = pgTable('utilisateur', {
  id: uuid('id').primaryKey(),
  etablissementId: uuid('etablissement_id').notNull(),
  nom: text('nom').notNull(),
  email: text('email').notNull(),
  role: text('role').notNull(),
  actif: boolean('actif').notNull().default(true),
  jetonDev: text('jeton_dev'),
});

export const anneeScolaire = pgTable('annee_scolaire', {
  id: uuid('id').primaryKey(),
  etablissementId: uuid('etablissement_id').notNull(),
  libelle: text('libelle').notNull(),
  active: boolean('active').notNull().default(true),
});

export const classe = pgTable('classe', {
  id: uuid('id').primaryKey(),
  etablissementId: uuid('etablissement_id').notNull(),
  anneeScolaireId: uuid('annee_scolaire_id').notNull(),
  libelle: text('libelle').notNull(),
  effectif: integer('effectif').notNull().default(0),
});

export const personne = pgTable('personne', {
  id: uuid('id').primaryKey(),
  etablissementId: uuid('etablissement_id').notNull(),
  nom: text('nom').notNull(),
  prenoms: text('prenoms').notNull(),
  nomNormalise: text('nom_normalise').notNull(),
  dateNaissance: date('date_naissance'),
});

export const eleve = pgTable('eleve', {
  id: uuid('id').primaryKey(),
  matricule: text('matricule'),
  codeNational: text('code_national'),
});

export const enseignant = pgTable('enseignant', {
  id: uuid('id').primaryKey(),
});

export const matiere = pgTable('matiere', {
  id: uuid('id').primaryKey(),
  etablissementId: uuid('etablissement_id').notNull(),
  libelleFr: text('libelle_fr').notNull(),
  libelleEn: text('libelle_en').notNull(),
});

export const enseignement = pgTable('enseignement', {
  id: uuid('id').primaryKey(),
  etablissementId: uuid('etablissement_id').notNull(),
  classeId: uuid('classe_id').notNull(),
  matiereId: uuid('matiere_id').notNull(),
  enseignantId: uuid('enseignant_id').notNull(),
  coefficient: numeric('coefficient').notNull().default('1'),
});

export const inscription = pgTable('inscription', {
  id: uuid('id').primaryKey(),
  etablissementId: uuid('etablissement_id').notNull(),
  eleveId: uuid('eleve_id').notNull(),
  classeId: uuid('classe_id').notNull(),
  anneeScolaireId: uuid('annee_scolaire_id').notNull(),
  statut: text('statut').notNull().default('active'),
});

export const bareme = pgTable('bareme', {
  id: uuid('id').primaryKey(),
  etablissementId: uuid('etablissement_id').notNull(),
  type: text('type').notNull(),
  min: numeric('min').notNull(),
  max: numeric('max').notNull(),
  pas: numeric('pas'),
});

export const evaluation = pgTable('evaluation', {
  id: uuid('id').primaryKey(),
  etablissementId: uuid('etablissement_id').notNull(),
  enseignementId: uuid('enseignement_id').notNull(),
  baremeId: uuid('bareme_id').notNull(),
  type: text('type').notNull(),
  date: date('date'),
  libelle: text('libelle').notNull(),
});

export const lotSaisie = pgTable('lot_saisie', {
  id: uuid('id').primaryKey(),
  etablissementId: uuid('etablissement_id').notNull(),
  enseignementId: uuid('enseignement_id').notNull(),
  evaluationId: uuid('evaluation_id').notNull(),
  statut: text('statut').notNull().default('ouvert'),
  formulaireJson: jsonb('formulaire_json'),
  creePar: uuid('cree_par').notNull(),
  creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  modifieLe: timestamp('modifie_le', { withTimezone: true }).notNull().defaultNow(),
});

export const documentSource = pgTable('document_source', {
  id: uuid('id').primaryKey(),
  etablissementId: uuid('etablissement_id').notNull(),
  lotSaisieId: uuid('lot_saisie_id').notNull(),
  typeMedia: text('type_media').notNull(),
  uriStockage: text('uri_stockage').notNull(),
  hash: text('hash').notNull(),
  taille: bigint('taille', { mode: 'number' }).notNull(),
  captureLe: timestamp('capture_le', { withTimezone: true }).notNull().defaultNow(),
  capturePar: uuid('capture_par').notNull(),
});

export const pageDocument = pgTable('page_document', {
  id: uuid('id').primaryKey(),
  documentSourceId: uuid('document_source_id').notNull(),
  numero: integer('numero').notNull(),
  uriImage: text('uri_image').notNull(),
  largeur: integer('largeur'),
  hauteur: integer('hauteur'),
});

export const extractionOcr = pgTable('extraction_ocr', {
  id: uuid('id').primaryKey(),
  etablissementId: uuid('etablissement_id').notNull(),
  lotSaisieId: uuid('lot_saisie_id').notNull(),
  pageDocumentId: uuid('page_document_id').notNull(),
  moteur: text('moteur').notNull(),
  versionMoteur: text('version_moteur').notNull(),
  horodatage: timestamp('horodatage', { withTimezone: true }).notNull().defaultNow(),
  statut: text('statut').notNull(),
  scoreGlobal: numeric('score_global').notNull(),
  payloadJson: jsonb('payload_json').notNull(),
});

export const celluleReconnue = pgTable('cellule_reconnue', {
  id: uuid('id').primaryKey(),
  extractionOcrId: uuid('extraction_ocr_id').notNull(),
  ligne: integer('ligne').notNull(),
  colonne: integer('colonne').notNull(),
  roleColonne: text('role_colonne').notNull(),
  texteReconnu: text('texte_reconnu').notNull(),
  scoreConfiance: numeric('score_confiance').notNull(),
  bbox: jsonb('bbox'),
  noteId: uuid('note_id'),
});

export const note = pgTable('note', {
  id: uuid('id').primaryKey(),
  etablissementId: uuid('etablissement_id').notNull(),
  evaluationId: uuid('evaluation_id').notNull(),
  inscriptionId: uuid('inscription_id').notNull(),
  valeur: numeric('valeur'),
  valeurTexte: text('valeur_texte'),
  statut: text('statut'),
  lotSaisieId: uuid('lot_saisie_id'),
  origine: text('origine').notNull(),
  creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  creePar: uuid('cree_par').notNull(),
});

export const appreciation = pgTable('appreciation', {
  id: uuid('id').primaryKey(),
  etablissementId: uuid('etablissement_id').notNull(),
  noteId: uuid('note_id').notNull(),
  texte: text('texte').notNull(),
  auteurId: uuid('auteur_id').notNull(),
});

export const validationTable = pgTable('validation', {
  id: uuid('id').primaryKey(),
  etablissementId: uuid('etablissement_id').notNull(),
  lotSaisieId: uuid('lot_saisie_id').notNull(),
  utilisateurId: uuid('utilisateur_id').notNull(),
  roleValidation: text('role_validation').notNull(),
  horodatage: timestamp('horodatage', { withTimezone: true }).notNull().defaultNow(),
});

export const idempotence = pgTable('idempotence', {
  cle: text('cle').primaryKey(),
  etablissementId: uuid('etablissement_id').notNull(),
  lotSaisieId: uuid('lot_saisie_id').notNull(),
  resultatJson: jsonb('resultat_json').notNull(),
  creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
});

export const evenementAudit = pgTable('evenement_audit', {
  id: uuid('id').primaryKey(),
  etablissementId: uuid('etablissement_id').notNull(),
  acteurId: uuid('acteur_id'),
  action: text('action').notNull(),
  objetType: text('objet_type').notNull(),
  objetId: text('objet_id'),
  resultat: text('resultat').notNull(),
  detailsJson: jsonb('details_json'),
  horodatage: timestamp('horodatage', { withTimezone: true }).notNull().defaultNow(),
});

export const schema = {
  etablissement,
  utilisateur,
  anneeScolaire,
  classe,
  personne,
  eleve,
  enseignant,
  matiere,
  enseignement,
  inscription,
  bareme,
  evaluation,
  lotSaisie,
  documentSource,
  pageDocument,
  extractionOcr,
  celluleReconnue,
  note,
  appreciation,
  validationTable,
  idempotence,
  evenementAudit,
};
