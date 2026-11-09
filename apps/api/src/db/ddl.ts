/**
 * DDL de la tranche « acquisition Module 1 ».
 * Miroir SQL de `schema.ts` (Drizzle). Réf. docs/06-architecture-donnees/modele-conceptuel-logique-physique.md §G.2.
 *
 * Règles structurelles :
 *  - `etablissement_id` NON NUL sur toute table de données métier (isolation multi-tenant, §G.4) ;
 *  - Raw = append-only (aucun UPDATE/DELETE applicatif) ;
 *  - unicité (evaluation_id, inscription_id) sur `note` (EF-M1 : une note par élève et par évaluation).
 *
 * Le dialecte cible est PostgreSQL ; en dev/CI on exécute ce DDL sur PGlite (même dialecte).
 */
export const DDL = /* sql */ `
CREATE TABLE IF NOT EXISTS etablissement (
  id            uuid PRIMARY KEY,
  nom           text NOT NULL,
  type          text NOT NULL,
  pays          text NOT NULL DEFAULT 'CM',
  code          text NOT NULL,
  statut        text NOT NULL DEFAULT 'actif',
  cree_le       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS utilisateur (
  id                uuid PRIMARY KEY,
  etablissement_id  uuid NOT NULL REFERENCES etablissement(id),
  nom               text NOT NULL,
  email             text NOT NULL,
  role              text NOT NULL CHECK (role IN ('enseignant','responsable','admin')),
  actif             boolean NOT NULL DEFAULT true,
  jeton_dev         text UNIQUE
);

CREATE TABLE IF NOT EXISTS annee_scolaire (
  id                uuid PRIMARY KEY,
  etablissement_id  uuid NOT NULL REFERENCES etablissement(id),
  libelle           text NOT NULL,
  active            boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS classe (
  id                 uuid PRIMARY KEY,
  etablissement_id   uuid NOT NULL REFERENCES etablissement(id),
  annee_scolaire_id  uuid NOT NULL REFERENCES annee_scolaire(id),
  libelle            text NOT NULL,
  effectif           integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS personne (
  id                uuid PRIMARY KEY,
  etablissement_id  uuid NOT NULL REFERENCES etablissement(id),
  nom               text NOT NULL,
  prenoms           text NOT NULL,
  nom_normalise     text NOT NULL,
  date_naissance    date
);

CREATE TABLE IF NOT EXISTS eleve (
  id             uuid PRIMARY KEY REFERENCES personne(id),
  matricule      text,
  code_national  text
);

CREATE TABLE IF NOT EXISTS enseignant (
  id  uuid PRIMARY KEY REFERENCES personne(id)
);

CREATE TABLE IF NOT EXISTS matiere (
  id                uuid PRIMARY KEY,
  etablissement_id  uuid NOT NULL REFERENCES etablissement(id),
  libelle_fr        text NOT NULL,
  libelle_en        text NOT NULL
);

CREATE TABLE IF NOT EXISTS enseignement (
  id                uuid PRIMARY KEY,
  etablissement_id  uuid NOT NULL REFERENCES etablissement(id),
  classe_id         uuid NOT NULL REFERENCES classe(id),
  matiere_id        uuid NOT NULL REFERENCES matiere(id),
  enseignant_id     uuid NOT NULL REFERENCES enseignant(id),
  coefficient       numeric(4,2) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS inscription (
  id                 uuid PRIMARY KEY,
  etablissement_id   uuid NOT NULL REFERENCES etablissement(id),
  eleve_id           uuid NOT NULL REFERENCES eleve(id),
  classe_id          uuid NOT NULL REFERENCES classe(id),
  annee_scolaire_id  uuid NOT NULL REFERENCES annee_scolaire(id),
  statut             text NOT NULL DEFAULT 'active',
  UNIQUE (eleve_id, classe_id, annee_scolaire_id)
);

CREATE TABLE IF NOT EXISTS bareme (
  id                uuid PRIMARY KEY,
  etablissement_id  uuid NOT NULL REFERENCES etablissement(id),
  type              text NOT NULL CHECK (type IN ('sur_20','sur_10','sur_100','mention')),
  min               numeric(6,2) NOT NULL,
  max               numeric(6,2) NOT NULL,
  pas               numeric(6,3)
);

CREATE TABLE IF NOT EXISTS evaluation (
  id                uuid PRIMARY KEY,
  etablissement_id  uuid NOT NULL REFERENCES etablissement(id),
  enseignement_id   uuid NOT NULL REFERENCES enseignement(id),
  bareme_id         uuid NOT NULL REFERENCES bareme(id),
  type              text NOT NULL,
  date              date,
  libelle           text NOT NULL
);

CREATE TABLE IF NOT EXISTS lot_saisie (
  id                uuid PRIMARY KEY,
  etablissement_id  uuid NOT NULL REFERENCES etablissement(id),
  enseignement_id   uuid NOT NULL REFERENCES enseignement(id),
  evaluation_id     uuid NOT NULL REFERENCES evaluation(id),
  statut            text NOT NULL DEFAULT 'ouvert'
                    CHECK (statut IN ('ouvert','extraction_faite','en_revue','valide','en_conflit')),
  formulaire_json   jsonb,
  cree_par          uuid NOT NULL REFERENCES utilisateur(id),
  cree_le           timestamptz NOT NULL DEFAULT now(),
  modifie_le        timestamptz NOT NULL DEFAULT now()
);

-- Raw : append-only
CREATE TABLE IF NOT EXISTS document_source (
  id                uuid PRIMARY KEY,
  etablissement_id  uuid NOT NULL REFERENCES etablissement(id),
  lot_saisie_id     uuid NOT NULL REFERENCES lot_saisie(id),
  type_media        text NOT NULL CHECK (type_media IN ('image','pdf','video')),
  uri_stockage      text NOT NULL,
  hash              text NOT NULL,
  taille            bigint NOT NULL,
  capture_le        timestamptz NOT NULL DEFAULT now(),
  capture_par       uuid NOT NULL REFERENCES utilisateur(id)
);

CREATE TABLE IF NOT EXISTS page_document (
  id                  uuid PRIMARY KEY,
  document_source_id  uuid NOT NULL REFERENCES document_source(id),
  numero              integer NOT NULL,
  uri_image           text NOT NULL,
  largeur             integer,
  hauteur             integer
);

CREATE TABLE IF NOT EXISTS extraction_ocr (
  id                uuid PRIMARY KEY,
  etablissement_id  uuid NOT NULL REFERENCES etablissement(id),
  lot_saisie_id     uuid NOT NULL REFERENCES lot_saisie(id),
  page_document_id  uuid NOT NULL REFERENCES page_document(id),
  moteur            text NOT NULL,
  version_moteur    text NOT NULL,
  horodatage        timestamptz NOT NULL DEFAULT now(),
  statut            text NOT NULL CHECK (statut IN ('ok','structure_non_reconnue','echec')),
  score_global      numeric(4,3) NOT NULL,
  payload_json      jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS cellule_reconnue (
  id                uuid PRIMARY KEY,
  extraction_ocr_id uuid NOT NULL REFERENCES extraction_ocr(id),
  ligne             integer NOT NULL,
  colonne           integer NOT NULL,
  role_colonne      text NOT NULL,
  texte_reconnu     text NOT NULL,
  score_confiance   numeric(4,3) NOT NULL,
  bbox              jsonb,
  note_id           uuid
);

-- Normalized : écrit UNIQUEMENT après validation humaine
CREATE TABLE IF NOT EXISTS note (
  id                uuid PRIMARY KEY,
  etablissement_id  uuid NOT NULL REFERENCES etablissement(id),
  evaluation_id     uuid NOT NULL REFERENCES evaluation(id),
  inscription_id    uuid NOT NULL REFERENCES inscription(id),
  valeur            numeric(6,2),
  valeur_texte      text,
  statut            text,
  lot_saisie_id     uuid REFERENCES lot_saisie(id),
  origine           text NOT NULL CHECK (origine IN ('ocr','manuel','import')),
  cree_le           timestamptz NOT NULL DEFAULT now(),
  cree_par          uuid NOT NULL REFERENCES utilisateur(id),
  UNIQUE (evaluation_id, inscription_id)
);

CREATE TABLE IF NOT EXISTS appreciation (
  id                uuid PRIMARY KEY,
  etablissement_id  uuid NOT NULL REFERENCES etablissement(id),
  note_id           uuid NOT NULL REFERENCES note(id),
  texte             text NOT NULL,
  auteur_id         uuid NOT NULL REFERENCES utilisateur(id)
);

CREATE TABLE IF NOT EXISTS validation (
  id                uuid PRIMARY KEY,
  etablissement_id  uuid NOT NULL REFERENCES etablissement(id),
  lot_saisie_id     uuid NOT NULL REFERENCES lot_saisie(id),
  utilisateur_id    uuid NOT NULL REFERENCES utilisateur(id),
  role_validation   text NOT NULL CHECK (role_validation IN ('enseignant','responsable')),
  horodatage        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS idempotence (
  cle               text PRIMARY KEY,
  etablissement_id  uuid NOT NULL REFERENCES etablissement(id),
  lot_saisie_id     uuid NOT NULL REFERENCES lot_saisie(id),
  resultat_json     jsonb NOT NULL,
  cree_le           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evenement_audit (
  id                uuid PRIMARY KEY,
  etablissement_id  uuid NOT NULL REFERENCES etablissement(id),
  acteur_id         uuid,
  action            text NOT NULL,
  objet_type        text NOT NULL,
  objet_id          text,
  resultat          text NOT NULL,
  details_json      jsonb,
  horodatage        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_note_eval ON note (evaluation_id);
CREATE INDEX IF NOT EXISTS idx_note_tenant ON note (etablissement_id);
CREATE INDEX IF NOT EXISTS idx_lot_tenant ON lot_saisie (etablissement_id, statut);
CREATE INDEX IF NOT EXISTS idx_inscription_classe ON inscription (classe_id);
CREATE INDEX IF NOT EXISTS idx_cellule_extraction ON cellule_reconnue (extraction_ocr_id);
`;
