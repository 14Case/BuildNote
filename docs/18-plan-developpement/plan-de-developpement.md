# Plan de développement — lots de code BuildNote

> **Statut : Vivant.** Date : 2026-09-09.
> Cadre : [ADR-0004](../17-decisions/ADR-0004-consolidation-flux-unique-developpement.md) (flux
> unique, tout le code ouvert, garde-fous testés). Ce document ordonne le **code** ; la production
> **documentaire par couches** garde son rythme propre (conception) et est réconciliée au fil de
> l'eau.

## Principes

1. **Un tronc `main`**, des **branches de fonctionnalité courtes**, des **PR revues** une à la fois.
2. Chaque lot se termine par une **porte de sortie** : CI verte (typecheck, lint, lint i18n,
   tests), garde-fous non négociables couverts, doc réconciliée, démo exécutable.
3. **Vertical avant horizontal** : on privilégie une tranche utilisable de bout en bout (API + web)
   plutôt que d'empiler des couches techniques non démontrables.
4. Frontières à risque **derrière interfaces** (cf. [ADR-0004 §4]) : OCR, stockage objet, SGBD,
   identité, gateway d'orientation, référentiels, pondérations, gabarits, connecteurs.
5. Les **POC** (OCR 1 & 2, POC-VH, POC 4 orientation) sont branchés sur le **code réel** et peuvent
   déclencher des retouches bornées par les interfaces.

## État au 2026-11-09

| | Fait | Reste |
|---|---|---|
| Socle monorepo & L0 | Scaffolding, CI, `packages/shared`, identité/session (ADR-0006), RLS (ADR-0005), MinIO/S3, observabilité, docker-compose | Packaging web pilote |
| Module 1 API (L1) | Chaîne acquisition complète durcie, idempotence, quotas, pagination, erreurs bilingues, 16 tests garde-fous | — |
| Module 1 web (L2) | PWA capture + vérification humaine offline-first, IndexedDB, raccourcis, i18n FR/EN | — |
| Module 2 API (L3) | Service orientation branché sur Normalized réelle, endpoints HTTP, questionnaires & consentement, DDL/RLS, 18 tests | — |
| Module 2 web (L4) | Dashboard de situation à la demande, écran dossier d'orientation (5 blocs d'explication, non-prescription), questionnaire élève/parents, 8 tests | — |
| Interopérabilité (L5) | — | Connecteurs, mapping, qualité |

## Lots

### L0 — Socle *(Terminé)*
**Objectif** : un squelette exploitable et sûr, commun aux deux modules.
- Consolidation du code sur `main` *(fait)*.
- DDL PostgreSQL + table `session` + politiques Row-Level Security (RLS) *(fait)*.
- **Identité / session** ([ADR-0006](../17-decisions/ADR-0006-socle-securite-v1.md)) :
  `IdentityProvider`, `SessionIdentityProvider`, hachage mémoire-dur (Scrypt/Argon2id), `POST /auth/login`, `POST /auth/logout`, `GET /auth/moi`, protection CSRF sur mutations, en-têtes de sécurité HTTP, garde-fou anti-`DevIdentityProvider` en prod *(fait, 7 tests)*.
- **Multi-tenant** ([ADR-0005](../17-decisions/ADR-0005-multi-tenant-et-hebergement.md)) : RLS activée sur les tables métier + isolation établissement testée *(fait)*.
- `BlobStore` implémentation S3/MinIO (en plus du local) *(fait)*.
- Observabilité : logs structurés Fastify, `/health`, `/ready` avec vérification base *(fait)*.
- Packaging on-premise : `docker-compose.yml` (`postgres` + `minio` + `api`), `apps/api/Dockerfile`, script `scripts/install-etablissement.sh` *(fait)*.
**Porte de sortie validée** : tests d'auth, d'isolation et d'observabilité 100% verts.

### L1 — Module 1, API acquisition (durcissement)
**Objectif** : la chaîne d'acquisition est de qualité production. *(fait)*
- Revue et durcissement des services d'acquisition (extraction, form-builder, patch, validation, conflit, empreinte, matching).
- File de synchronisation hors-ligne côté serveur consolidée avec **idempotence** de bout en bout (`X-Idempotency-Key` sur la création de lot, le téléversement de documents et la validation).
- Contrats d'erreur stables, normalisés et bilingues FR/EN (`Accept-Language`).
- Quotas stricts d'upload (taille maximale 15 Mo, maximum 10 documents par lot) et pagination complète sur `GET /lots` (`items`, `total`, `page`, `limit`, `totalPages` + en-têtes HTTP `X-Total-Count`, etc.).
- `OcrProvider` : `MockOcrProvider` conservé par défaut ; ajout de l'adaptateur HTTP réel optionnel `HttpOcrProvider` (`apps/api/src/ocr/http-provider.ts`) et de la fabrique `creerOcrProvider` prêts pour le bench POC 1/2.
- Tests : 16 garde-fous validés (`EF-M1-*`), multi-tenant, détection des notes hors barème, anti-écrasement par empreinte SHA-256, conflits sans écrasement silencieux, et test de charge léger (10 extractions consécutives stables).
**Porte de sortie validée** : parcours API complet capture → validation → écriture Normalized, tracé, isolé, sans régression — 100% vert en tests unitaires (40/40 sur l'API, 56/56 global), typecheck et lint i18n.

### L2 — Module 1, PWA web (capture + vérification humaine)
**Objectif** : l'écran que l'enseignant utilise réellement. *(fait)*
- `apps/web` : React + Vite, PWA installable, **IndexedDB** (`buildnote_offline_db`) pour la file hors-ligne.
- Écrans : connexion (`Connexion.tsx`) ; liste des lots (`ListeLots.tsx`) ; **capture** photo/multi-pages (`NouvelleCapture.tsx`) ; **formulaire prérempli** avec bandes de confiance (corriger / contrôler / vérifier) ; **écran de vérification et correction** (`TableauVerification.tsx` avec raccourcis clavier et document source en vis-à-vis) ; récapitulatif + accusé explicite (`ModalValidationRecapitulatif.tsx`, garde-fou `EF-M1-11`) ; gestion des conflits et synchronisation (`FileSynchroModal.tsx`).
- i18n FR/EN de bout en bout (catalogue `packages/shared/src/i18n`), sélecteur dès l'accueil (`Header.tsx`).
- Tests : garde-fou `EF-M1-11`, contrôle de barème, parité i18n FR/EN (`apps/web/test/verification.test.ts`).
**Porte de sortie validée** : un enseignant capture une fiche, corrige, valide **hors-ligne**, puis synchronise — 100% vert en tests, typecheck et lint i18n.

### L3 — Module 2, API orientation (intégration base réelle)
**Objectif** : le service d'orientation lit la vraie base et s'expose en HTTP. *(fait)*
- `OrientationDataGateway` : implémentation `DatabaseOrientationGateway` branchée sur la base Normalized réelle (instantané cohérent, lecture **à la demande**, aucun recalcul automatique `EF-M1-19`, aucune écriture dans Normalized `EF-M2-25`) *(fait)*.
- Endpoints HTTP : `POST /api/v1/orientation/dossiers` (avec garde consentement `EF-M2-11`), `GET /api/v1/orientation/dossiers/:id`, `GET /api/v1/orientation/eleves/:eleveId/dossiers`, `GET/PUT /api/v1/orientation/eleves/:eleveId/questionnaire` (aspirations, avis parents, centres d'intérêt, consentement élève & parents) *(fait)*.
- Tables PostgreSQL DDL et schémas Drizzle : `consentement_orientation`, `questionnaire_orientation`, `dossier_orientation` avec RLS par établissement et index multi-tenant *(fait)*.
- Normalisation robuste du niveau de classe (`normaliserNiveau`) reconnaissant les formats usuels des établissements (ex. `"3e 2"`, `"CM2 B"`, `"Terminale C"`) *(fait)*.
- Tests : 18 tests Module 2 (14 garde-fous et scoring + 4 tests d'intégration réels avec base de données et Fastify) validant `EF-M2-10/11/16/18/25`, non-prescription, isolation multi-tenant et traçabilité de l'explicabilité *(fait)*.
**Porte de sortie validée** : un dossier d'orientation explicable est généré depuis des notes validées réelles, sans déclencher aucun traitement automatique — 100% vert en tests unitaires et intégration (44/44 sur l'API, 60/60 global), typecheck et lint i18n.

### L4 — Module 2, web (dashboard + dossier d'orientation)
**Objectif** : l'interface d'orientation complète pour le conseiller et l'équipe pédagogique. *(fait)*
- Dashboard de situation (classe / établissement) rafraîchi **à la demande** (`DashboardSituation.tsx`), KPIs agrégés (effectifs, consentements, questionnaires, dossiers), filtres et recherche d'élèves *(fait)*.
- Écran « dossier d'orientation » (`DossierOrientationView.tsx`) : scénarios classés par score/rang, verdicts, badges contextuels, formations et établissements avec distance en km et internat, débouchés métiers *(fait)*.
- Les **5 blocs d'explication structurés** (`EF-M2-18`) : facteurs déterminants, données utilisées avec indice de fiabilité, répartition du score en barres proportionnelles, alternatives écartées avec motif, zones d'incertitude *(fait)*.
- Bannière d'éthique et de **non-prescription (`EF-M2-19/26`)** : aide à la décision, orientation indicative non contraignante *(fait)*.
- Modal de questionnaire élève / parents (`ModalQuestionnaire.tsx`) avec **garde-fou de consentement obligatoire élève + parents (`EF-M2-11`)**, centres d'intérêt, matières préférées, métiers aspirés, avis parents et degré de priorité *(fait)*.
- Intégration bilingue FR/EN stricte (177 clés) et bascule fluide Module 1 / Module 2 dans le Header *(fait)*.
- Tests : 8 tests automatisés de logique et de rendu de dashboard et dossier (`apps/web/test/orientation-web.test.ts`) *(fait)*.
**Porte de sortie validée** : un conseiller ouvre le dashboard de situation, renseigne les questionnaires/consentements, génère et consulte un dossier d'orientation complet et explicable — 100% vert en tests (65/65 global), typecheck et lint i18n.

### L5 — Interopérabilité
**Objectif** : modèle canonique, connecteurs d'import, gestion des conflits et export de réversibilité. *(fait)*
- Modèle canonique d'échange `v1` consolidé dans `packages/shared/src/interop/` (`CanoniqueLotImport`, `CanoniqueEleve`, `CanoniqueClasse`, `CanoniqueMatiere`, `CanoniqueEvaluation`, `CanoniqueNote`) *(fait)*.
- Normaliseurs de données robustes (`normaliserNom`, `normaliserDate`, `parserNombreDecimal`, `estValeurAbsence`) et support des variantes typographiques (apostrophes, accents) *(fait)*.
- Parser tabulaire (`apps/api/src/interop/parser.ts`) avec auto-détection des délimiteurs (`;`, `,`, `\t`) et gestion des guillemets *(fait)*.
- Moteur de mapping déclaratif (`apps/api/src/interop/mapping-engine.ts`) avec dé-pivotage automatique des tableaux croisés (Archétype B : élèves en lignes, matières en colonnes) *(fait)*.
- Service d'exécution transactionnel (`apps/api/src/interop/importer.ts`) avec tables PostgreSQL dédiées (`import_lot`, `import_quarantaine`, `donnee_lineage`), isolation multi-tenant et mise en quarantaine des lignes invalides *(fait)*.
- **Garde-fou non négociable anti-écrasement (`EF-M1-16` / `H.5.3`)** : arbitrage strict des conflits de notes (`arbitrerConflitNote`). Une note validée par le Module 1 (`origine = 'ocr'` ou `'manuel'`) n'est **jamais** écrasée silencieusement par un import externe ; elle est mise en quarantaine pour revue humaine manuelle *(fait)*.
- Traçabilité et lineage (table `donnee_lineage`) liant chaque note insérée à son lot source et ses transformations successives *(fait)*.
- Endpoints API v1 (`apps/api/src/routes/interop.ts`) : `POST /interop/import/apercu`, `POST /interop/import/executer`, `GET /interop/rapports/:id`, `GET /interop/qualite` (KPIs qualité, taux de quarantaine, taux de conflits), `GET /interop/export/reversibilite` *(fait)*.
- Export de réversibilité complet (`apps/api/src/interop/exporter.ts`) générant le patrimoine intégral de l'établissement sous schéma canonique Zod `v1` *(fait)*.
- Tests : 14 tests automatisés dédiés (6 dans `packages/shared`, 8 dans `apps/api`) validant le parsing tabulaire, le mapping cross-table, l'idempotence, la quarantaine, l'export et le garde-fou non négociable anti-écrasement *(fait)*.
**Porte de sortie validée** : un fichier d'établissement est importé, normalisé, tracé, et les doublons / conflits sont gérés sans écrasement silencieux — 100% vert en tests (79/79 global : 19 shared, 52 api, 8 web), typecheck et lint i18n.

### L6 — Durcissement & pilote
**Objectif** : durcissement de sécurité, résilience opérationnelle et qualification pour le pilote. *(fait)*
- Revue de sécurité complète et tests d'intrusion automatisés sur le cloisonnement multi-tenant (`apps/api/test/security-hardening.test.ts`) *(fait)*.
- Protection anti-force brute et verrouillage temporaire de compte après 5 échecs (`TraqueurBruteForce` sur `POST /auth/login`) avec journalisation d'audit `auth.bruteforce_bloque` *(fait)*.
- Durcissement des en-têtes de sécurité HTTP (`X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`, `Referrer-Policy`, `Permissions-Policy`, HSTS en production) *(fait)*.
- Coffre à secrets & gestionnaire de configuration sécurisé (`chargerConfig` supportant `/run/secrets/` et fichiers `*_FILE`, fonction `masquerSecretsConfig` pour éviter toute fuite de secrets dans les journaux) *(fait)*.
- Procédure et scripts de sauvegardes chiffrées quotidiennes AES-256-CBC avec intégrité SHA-256 et rotation 30 jours (`scripts/backup-etablissement.sh`, `scripts/restore-etablissement.sh`) *(fait)*.
- Runbook d'exploitation PCA / PRA complet avec RPO $\le$ 24h et RTO $\le$ 4h (`docs/14-deploiement/runbook-sauvegarde-restauration.md`) *(fait)*.
- Packaging pilote conteneurisé : Dockerfile Web Nginx (`apps/web/Dockerfile`, `apps/web/nginx.conf`), `docker-compose.yml` multi-services complet (PostgreSQL, MinIO, API Fastify, Web PWA) et script d'installation clé en main (`scripts/install-etablissement.sh`) *(fait)*.
- Manuel utilisateur & formation bilingue FR/EN pour les 3 rôles clés (`docs/14-deploiement/guide-utilisateur-pilote.md`) *(fait)*.
- Rapport officiel de revue de jalon **J7 (« Prêt pour le pilote »)** prononçant le **GO Pilote** (`docs/14-deploiement/rapport-revue-j7-pret-pour-pilote.md`) *(fait)*.
**Porte de sortie validée** : le système est durci, résilient, entièrement testé (83/83 tests verts : 19 shared, 56 api, 8 web), conteneurisé et officiellement qualifié pour son déploiement pilote.

## Correspondance lots ↔ roadmap

Les lots L0→L6 réalisent la **Phase 8 (développement itératif)** de la
[roadmap](../01-project-management/roadmap.md), avec un recouvrement assumé des Phases 5 (UX/UI, dans
L2/L4), 6 (POC, contre le code réel) et 9 (recette, dans chaque porte de sortie + L6). La **revue
J7** (« prêt pour le pilote ») se tient à l'issue de L6.
