# ADR-0005 — Modèle multi-tenant et cible d'hébergement (v1 dev + pilote)

Date : 2026-09-09
Statut : **Accepté** (porteur, 2026-09-09)
Portée : tranche **décision #4** (modèle multi-tenant) et fixe une **cible de travail** pour
**décision #1** (hébergement) — dev et pilote. L'arbitrage souveraineté définitif (cloud régional,
hébergeur, chiffrement au repos géré) reste ouvert et fera l'objet d'un ADR avant la généralisation.
Complète [ADR-0004](ADR-0004-consolidation-flux-unique-developpement.md) et
[ADR-0002](ADR-0002-stack-technologique-v1.md).

## Contexte

Le contexte produit (SI scolaires hétérogènes ou absents, connectivité faible, souveraineté des
données de mineurs, matériel modeste) et les scénarios d'architecture
([`scenarios-architecture.md`](../05-architecture-technique/scenarios-architecture.md), choix =
monolithe modulaire / hybride) orientent vers un déploiement **au plus près de l'établissement**.

Le porteur choisit : **une instance BuildNote par établissement, hébergée sur site (on-premise)**.

## Décision

### 1. Unité de déploiement = un établissement

- Chaque établissement pilote exécute **sa propre instance** (API + web + SGBD + stockage objet),
  sur un serveur local ou un hébergement de proximité choisi par l'établissement.
- Conséquence directe : **une base PostgreSQL par établissement** ⇒ isolation physique **de fait**
  entre établissements pour le pilote.
- Packaging : **Docker Compose** (`postgres` + `api` + `web` + `minio` pour le stockage objet
  compatible S3). Un script d'installation et de mise à jour accompagne le pilote.
- Mode hors-ligne : le serveur local reste joignable même sans Internet ; le PWA du Module 1
  synchronise en LAN. La sortie Internet ne sert qu'aux mises à jour et à un éventuel référentiel
  national distant (sinon fixtures / import fichier).

### 2. `etablissement_id` reste obligatoire partout (non négociable)

Même avec une base par établissement, **toute donnée métier porte `etablissement_id`** et **toute
requête filtre dessus** (filtre injecté par la couche d'accès + politiques **Row-Level Security**
PostgreSQL). Raisons :

- garde-fou d'isolation testé en CI (cf. [ADR-0004 §3]) — indépendant du mode de déploiement ;
- **réversibilité** : une instance régionale/mutualisée multi-établissements reste possible plus
  tard (généralisation, petits établissements regroupés) **sans réécriture** ;
- cohérence du modèle canonique et de l'interopérabilité (un import peut concerner plusieurs
  établissements dans une instance mutualisée).

### 3. Frontières techniques

| Frontière | v1 (dev + pilote) | Derrière |
|---|---|---|
| SGBD | PostgreSQL (prod) / PGlite (dev, CI) | Drizzle (dialecte PostgreSQL) |
| Stockage média `RAW` | MinIO (S3-compatible) en pilote ; fichier local en dev | interface `BlobStore` |
| RLS | activée par défaut sur les tables métier ; contexte `SET app.etablissement_id` par requête | migration dédiée |
| Secrets | fichier `.env` protégé sur le serveur de l'établissement (pilote) | à remplacer par un coffre à la généralisation |
| Sauvegardes | `pg_dump` chiffré + copie du bucket objet, planifiés localement | runbook pilote (lot L6) |

### 4. Ce qui reste ouvert

- Souveraineté / hébergement **définitif** (cloud régional africain, hébergeur souverain,
  co-localisation) — ADR dédié avant la généralisation, éclairé par le cadre juridique (#2).
- Chiffrement au repos géré (KMS), rotation des secrets, PKI interne : lot L6 et ADR sécurité
  ultérieur.
- Modèle mutualisé (schéma par établissement vs base partagée + RLS) **si** la généralisation
  regroupe des établissements : tranché à ce moment-là ; le code y est déjà préparé (point 2).

## Conséquences

- `docs/06-architecture-donnees/modele-conceptuel-logique-physique.md` §G.4 et
  `docs/10-securite/architecture-securite.md` §K.6 : la **recommandation provisoire** (« schéma par
  établissement ») est remplacée pour la v1 par « **base par établissement (déploiement dédié) +
  `etablissement_id` + RLS partout** ». À réconcilier dans ces fichiers.
- `docs/14-deploiement/` : le scénario « on-premise établissement » devient le scénario de
  référence du pilote (packaging Docker Compose). À détailler quand la Couche 7 déploiement est
  produite.
- Nouveau code attendu (lot L0) : migrations PostgreSQL + activation RLS + injection du contexte
  `etablissement_id`, `docker-compose.yml`, script d'install/upgrade.
- Risque accepté : l'exploitation « une instance par établissement » est plus lourde à l'échelle ;
  mitigé par le packaging automatisé et la réversibilité vers un modèle mutualisé.
