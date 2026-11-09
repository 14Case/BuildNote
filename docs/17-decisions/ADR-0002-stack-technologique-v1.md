# ADR-0002 — Stack technologique (périmètre acquisition Module 1)

Date : 2026-09-09
Statut : Accepté
Portée : périmètre ouvert par [ADR-0001](ADR-0001-derogation-code-avant-j7.md) — chaîne
d'acquisition du Module 1. Résout **partiellement** la décision préalable
[#10](decisions-prealables.md). Le moteur OCR (#3), l'hébergement (#1) et le modèle multi-tenant
physique (#4) restent hors de cet ADR.

## Contexte

Il faut un langage, un framework serveur, un client et un SGBD pour développer la chaîne
d'acquisition, en cohérence avec les orientations déjà documentées :

- client Module 1 = **PWA installable**, **offline-first**, parc Android bas de gamme
  ([`scenarios-architecture.md` §F.7](../05-architecture-technique/scenarios-architecture.md)) ;
- SGBD du cœur = **PostgreSQL** pressenti (JSON, contraintes, partitionnement, on-premise)
  ([même doc](../05-architecture-technique/scenarios-architecture.md)) ;
- **modèle canonique** partagé, contrats d'API explicites et versionnés
  ([`architecture-fonctionnelle.md` §E.6](../04-architecture-fonctionnelle/architecture-fonctionnelle.md)) ;
- bilinguisme FR/EN **de bout en bout**, lint i18n en CI (`ENF-I18N-01`).

## Options envisagées

| Élément | Option retenue | Alternatives écartées (pour ce périmètre) | Motif |
|---|---|---|---|
| Langage | **TypeScript** (front + back) | Python back + TS front ; Kotlin ; Go | Un seul langage → **types du modèle canonique partagés** (`packages/shared`), moindre coût pour une petite équipe, bon support PWA/offline |
| Client | **React + Vite**, PWA (service worker + IndexedDB) | React Native / Expo ; Flutter ; Vue | Pas de distribution via magasin ; installable ; réutilise l'écosystème TS ; le natif reste possible plus tard sans changer l'API |
| Serveur | **Fastify** | Express ; NestJS ; Hono | Léger, rapide, validation de schéma intégrée, faible cérémonie |
| Validation / contrats | **Zod** (schémas partagés front/back) | JSON Schema seul ; io-ts | Schémas = source unique, inférence de types, messages d'erreur exploitables |
| Accès données | **Drizzle ORM** (dialecte PostgreSQL) | Prisma ; Knex ; SQL brut | SQL explicite, migrations versionnées, typage fort, léger |
| SGBD | **PostgreSQL** ; en dev/CI **PGlite** (Postgres embarqué, même dialecte) | SQLite (dialecte différent) ; MySQL | Aligne dev et prod sur le dialecte cible sans imposer Docker en poste de dev |
| Stockage média (Raw) | Interface `BlobStore` ; impl. **fichier local** en dev | S3/MinIO direct | Le binaire reste **hors base** (orientation MPD §G.3) ; impl. objet ajoutée au déploiement |
| OCR | Interface **`OcrProvider`** + fournisseur **simulé** (fixtures) | Choix d'un moteur | Décision #3 non préemptée (cf. ADR-0001) |
| i18n | catalogues FR/EN dans `packages/shared`, `lint i18n` en CI | libs lourdes | Aucun texte en dur ; extensible à d'autres langues |
| Tests | `node:test` (API, garde-fous non négociables) + Vitest (front) | Jest | Natif Node 20, rapide |
| Monorepo | **npm workspaces** | pnpm ; turborepo ; nx | Fourni avec Node, zéro dépendance de tooling |

## Décision

Monorepo TypeScript :

```
packages/shared     modèle canonique + contrats Zod (acquisition, OcrProvider) + i18n FR/EN
apps/api            Fastify + Drizzle (PostgreSQL / PGlite) + BlobStore + OcrProvider
apps/web            React + Vite (PWA offline-first) consommant les contrats partagés
```

Node 20 LTS. Toutes les frontières à risque (OCR, stockage objet, SGBD, auth/tenant) sont derrière
une interface.

## Conséquences

- Ce qui est **fermé** pour le périmètre acquisition : langage, framework serveur, ORM, dialecte
  SGBD, type de client. Modifiable par un ADR ultérieur si les POC ou le pilote l'exigent.
- Ce qui reste **ouvert** : moteur OCR (#3), hébergement (#1), mise en œuvre physique du
  multi-tenant (#4 — le code impose déjà `etablissement_id` partout), fournisseur de stockage
  objet, IdP/SSO.
- Le `packages/shared` devient la **projection exécutable** du modèle Normalized et du schéma
  canonique documentés en [`../06-architecture-donnees/`](../06-architecture-donnees/) ; tout écart
  est réconcilié dans `docs/`.
- CI à mettre en place : build TS, lint, lint i18n, tests API (garde-fous), tests front.
