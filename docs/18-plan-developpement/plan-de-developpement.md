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
| Module 1 API | Chaîne acquisition complète, 11 tests garde-fous | Durcissement, quotas d'upload, OcrProvider réel en option |
| Module 1 web (L2) | — | **Tout** (PWA capture + vérification humaine) |
| Module 2 API (L3) | Service orientation (gateway, profileur, scoreur, règles, explications), 14 tests | Intégration base réelle, endpoints HTTP |
| Module 2 web (L4) | — | Dashboard de situation + dossier d'orientation |
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
**Objectif** : la chaîne d'acquisition est de qualité production.
- Revue et durcissement des services existants (extraction, form-builder, patch, validation,
  conflit, empreinte, matching).
- File de synchronisation hors-ligne côté serveur (idempotence, résolution de conflit) consolidée.
- Contrats d'erreur stables et bilingues ; pagination ; quotas d'upload.
- `OcrProvider` : garder le simulé par défaut ; ajouter un adaptateur réel **optionnel** (candidat
  auto-hébergeable, ex. moteur open source) pour alimenter le bench POC 1/2 — non activé par défaut.
- Tests : compléter les garde-fous (`EF-M1-*`), tests de charge légers sur l'extraction.
**Porte de sortie** : parcours API complet capture → validation → écriture Normalized, tracé,
isolé, sans régression.

### L2 — Module 1, PWA web (capture + vérification humaine)
**Objectif** : l'écran que l'enseignant utilise réellement. *(fait)*
- `apps/web` : React + Vite, PWA installable, **IndexedDB** (`buildnote_offline_db`) pour la file hors-ligne.
- Écrans : connexion (`Connexion.tsx`) ; liste des lots (`ListeLots.tsx`) ; **capture** photo/multi-pages (`NouvelleCapture.tsx`) ; **formulaire prérempli** avec bandes de confiance (corriger / contrôler / vérifier) ; **écran de vérification et correction** (`TableauVerification.tsx` avec raccourcis clavier et document source en vis-à-vis) ; récapitulatif + accusé explicite (`ModalValidationRecapitulatif.tsx`, garde-fou `EF-M1-11`) ; gestion des conflits et synchronisation (`FileSynchroModal.tsx`).
- i18n FR/EN de bout en bout (catalogue `packages/shared/src/i18n`), sélecteur dès l'accueil (`Header.tsx`).
- Tests : garde-fou `EF-M1-11`, contrôle de barème, parité i18n FR/EN (`apps/web/test/verification.test.ts`).
**Porte de sortie validée** : un enseignant capture une fiche, corrige, valide **hors-ligne**, puis synchronise — 100% vert en tests, typecheck et lint i18n.

### L3 — Module 2, API orientation (intégration base réelle)
**Objectif** : le service d'orientation lit la vraie base et s'expose en HTTP.
- `OrientationDataGateway` : implémentation sur la base Normalized (instantané cohérent, lecture
  **à la demande**, aucun recalcul auto) en plus du `GatewayFixture`.
- Endpoints : `POST /orientation/dossiers` (avec garde consentement), `GET
  /orientation/dossiers/:id`, questionnaires (aspirations, avis parents, intérêts).
- `ReferentialProvider` : fixtures versionnées (offre de formation, métiers, référentiel national) ;
  interface prête pour une source réelle datée/sourcée (décision #5).
- Tests : garde-fous `EF-M2-*` (non-prescription, explicabilité = somme des contributions,
  aucune écriture Normalized, isolation), calibration POC 4.
**Porte de sortie** : un dossier d'orientation explicable est généré depuis des notes validées
réelles, sans déclencher aucun traitement automatique.

### L4 — Module 2, web (dashboard + dossier d'orientation)
- Dashboard de situation (classe / établissement), rafraîchi **à la demande**.
- Écran « dossier d'orientation » : scénarios scorés, 5 blocs d'explication, alternatives,
  incertitudes, gabarits FR/EN.
- Questionnaires élève / parents.
**Porte de sortie** : un conseiller ouvre le dashboard, génère et présente un dossier d'orientation.

### L5 — Interopérabilité
- Modèle canonique exécutable consolidé dans `packages/shared`.
- Connecteurs : **import CSV/Excel** d'abord (mode « BuildNote source unique » et reprise
  d'historique), puis adaptateurs SQL (lecture) selon besoins pilote.
- Moteur de mapping déclaratif, normalisation, validation, gestion des conflits, lineage,
  versioning du schéma canonique, tableau de bord qualité.
- Export de réversibilité.
**Porte de sortie** : un fichier d'établissement est importé, normalisé, tracé, et les doublons /
conflits sont gérés sans écrasement silencieux.

### L6 — Durcissement & pilote
- Revue de sécurité complète (`/security-review`), tests d'intrusion ciblés sur le cloisonnement.
- Performance, sauvegardes chiffrées + runbook, supervision.
- Chiffrement au repos, coffre à secrets (remplace `.env`).
- Packaging pilote finalisé, guide utilisateur & formation (FR/EN), rapport « prêt pour le pilote »
  → **revue J7**.

## Correspondance lots ↔ roadmap

Les lots L0→L6 réalisent la **Phase 8 (développement itératif)** de la
[roadmap](../01-project-management/roadmap.md), avec un recouvrement assumé des Phases 5 (UX/UI, dans
L2/L4), 6 (POC, contre le code réel) et 9 (recette, dans chaque porte de sortie + L6). La **revue
J7** (« prêt pour le pilote ») se tient à l'issue de L6.
