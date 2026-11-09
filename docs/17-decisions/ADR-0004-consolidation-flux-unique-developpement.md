# ADR-0004 — Consolidation du code, flux de développement unique, levée du gel

Date : 2026-09-09
Statut : **Accepté** (porteur, 2026-09-09)
Portée : mode de production du **code** pour tout le produit BuildNote.
Remplace le §Sessions d'[ADR-0003](ADR-0003-extension-derogation-module-2-orientation.md) et
étend [ADR-0001](ADR-0001-derogation-code-avant-j7.md) / [ADR-0003] à **l'ensemble** des périmètres
de code (socle, Module 1, Module 2, interopérabilité).

## Contexte

Trois ADR successifs (0001, 0002, 0003) ont ouvert le code par petits périmètres, en gardant un
**gel** partiel (« rien avant J7 ») et en organisant le travail en **plusieurs sessions Claude
parallèles** (acquisition / orientation / intégration) réparties sur des worktrees Git, avec une
session « intégratrice » propriétaire des fichiers communs et un protocole manuel de synchronisation.

Constat au 2026-09-09 :

- Le modèle multi-sessions a produit **plus de coordination que de valeur** : scaffolding dupliqué,
  divergences (`tsconfig`, `test/helpers.ts`, barrel d'exports), et **aucun code fusionné sur `main`**.
- Du code réel et de qualité correcte existait mais **non intégré** : chaîne d'acquisition du
  Module 1 (~2 500 lignes) jamais commitée ; moteur d'orientation du Module 2 sur une branche
  isolée. Les deux arbres étaient **quasi disjoints** — l'intégration ne posait pas de difficulté
  technique réelle, seulement un défaut de processus.
- Le porteur a **supprimé toutes les sessions parallèles** et demande de « passer au codage complet
  du projet sans blocus ».

Le gel « rien avant J7 » n'a plus d'objet : l'architecture des couches 1→7 est stabilisée et
documentée, les frontières à risque sont derrière des interfaces, et les POC apportent désormais
**plus de valeur exécutés contre le code réel** qu'en préalable au code.

Décision **critique** au sens de
[`gestion-changements-versions-documentaire.md`](../01-project-management/gestion-changements-versions-documentaire.md).

## Décision

### 1. Flux de développement unique

- **Une seule ligne de développement.** Branche d'intégration `main` (tronc). Le travail se fait par
  **branches de fonctionnalité courtes** (`feat/…`, `fix/…`, `chore/…`) fusionnées dans `main` par
  petites PR revues, une à la fois.
- **Fin du modèle multi-sessions et des worktrees parallèles.** Les worktrees
  `../BuildNote-m1-acquisition` et `../BuildNote-m2-orientation` et les branches `feat/m1-*`,
  `feat/m2-*`, `feat/socle-integration`, `docs/couche-*` sont supprimés après consolidation.
- Une session de travail à la fois sur un périmètre donné. Si le porteur lance ponctuellement
  plusieurs sessions, elles se répartissent des **lots disjoints** (cf. plan de développement) et
  passent par des **PR courtes**, jamais par un arbre partagé non commité.

### 2. Levée du gel — tout le périmètre de code est ouvert

- **Socle, Module 1, Module 2 et interopérabilité** sont ouverts au développement.
- **J7 n'est plus une barrière au code.** J7 devient une **revue « prêt pour le pilote »** (revue de
  dérisquage : résultats des POC/bench, sécurité, budget, adéquation au besoin) — un jalon de
  décision, pas un interdit de production.
- Les **POC deviennent des activités menées contre le code réel** : POC 1 & 2 = bancs de mesure OCR
  branchés sur l'interface `OcrProvider` ; POC-VH = tests d'utilisabilité de l'écran de vérification
  réel ; POC 4 = calibration du scoring d'orientation sur le service réel. Ils peuvent toujours
  invalider des hypothèses — d'où le maintien des interfaces (point 4).

### 3. Règles produit non négociables — inchangées, vérifiées par des tests

Reprise intégrale d'[ADR-0001 §1] et [ADR-0003 §1]. La CI échoue si un garde-fou manque ou casse :

| Garde-fou | Réf. exigence |
|---|---|
| Aucune écriture Normalized sans validation humaine explicite | `EF-M1-10`, `EF-M1-11` |
| `RAW` immuable (aucun `UPDATE`/`DELETE` applicatif) | archi données §G |
| Aucun enregistrement de note ne déclenche le Module 2 | `EF-M1-19` |
| Dashboard / orientation lisent **à la demande**, aucun recalcul automatique | `EF-M2-02` |
| Aide à la décision, jamais prescription (filtre lexical sur les explications) | `EF-M2-19`, `EF-M2-26` |
| Explicabilité : somme des contributions == score, 5 blocs présents | `EF-M2-18` |
| Génération d'orientation conditionnée au consentement | `EF-M2-11` |
| Le Module 2 n'écrit **rien** dans Normalized | `EF-M2-25` |
| Isolation par `etablissement_id` sur toute lecture/écriture métier | archi fonctionnelle §E |
| Bilinguisme FR/EN de bout en bout (aucun libellé en dur) | `ENF-I18N-01` |

### 4. Frontières à risque derrière des interfaces (maintenu)

`OcrProvider`, `BlobStore`, accès SGBD (Drizzle), `IdentityProvider` (auth/tenant),
`OrientationDataGateway`, `ReferentialProvider`, `ScoringWeights`,
`ExplanationTemplateCatalog`, **connecteurs d'interopérabilité**. Aucun choix de moteur OCR ni de
fournisseur externe n'est figé par cet ADR.

### 5. Séparation stricte des modules (maintenu)

Module 1 et Module 2 ne partagent que `packages/shared` et lisent la base via des contrats. Aucune
dépendance directe M1 ↔ M2 (`architecture-fonctionnelle.md` §E.6). Un test de dépendance le vérifie.

### 6. Pas de MVP jetable

Le code vise la **V1 de production**, avec un **déploiement pilote progressif** (établissement par
établissement) tenant lieu de palier de dérisquage.

### 7. Stack

Celle d'[ADR-0002](ADR-0002-stack-technologique-v1.md) — monorepo TypeScript — **confirmée et
étendue à tout le produit** (elle ne couvrait que l'acquisition). Elle reste modifiable par un ADR
ultérieur si un POC ou le pilote l'exige. Complétée par :
[ADR-0005](ADR-0005-multi-tenant-et-hebergement.md) (multi-tenant + hébergement) et
[ADR-0006](ADR-0006-socle-securite-v1.md) (socle de sécurité v1).

### 8. La doc reste la référence d'ingénierie

`docs/` reste la source de vérité de conception. Tout écart code ↔ doc est **réconcilié dans
`docs/`** (en priorité `06-architecture-donnees/`, `08-ocr-computer-vision/`,
`09-moteur-orientation/`, `10-securite/`). La production **par couches documentaires** garde son sens
pour la conception ; elle ne conditionne plus le code, qui avance par **lots** (cf. plan de
développement).

## Conséquences

- Consolidation effectuée : le code non commité de l'acquisition + la branche `feat/m2-orientation`
  sont réunis sur `main` (typecheck vert, 31 tests, lint i18n OK). Correctif inclus : gestionnaire
  d'erreurs Fastify posé avant l'enregistrement des routes.
- `CLAUDE.md` / `AGENTS.md` §2 : le régime « gel + dérogations + sessions » est remplacé par
  « **flux unique, tout le code ouvert, garde-fous testés en CI, POC contre le code réel** ».
- Nouveau document : [`docs/18-plan-developpement/plan-de-developpement.md`](../18-plan-developpement/plan-de-developpement.md)
  (lots L0→L6, ordre de priorité, critères de sortie).
- `roadmap.md` (Phase 8) : le développement itératif est **en cours** ; les phases documentaires
  0→7 restent à faire valider par le porteur, en parallèle et sans bloquer le code.
- Risque accepté : un POC tardif (OCR, scoring) peut imposer une retouche ; l'impact est borné par
  les interfaces du point 4. Les décisions #1/#3/#5 restent partiellement ouvertes (cf. ADR-0005).
- Suivi : revue à J7 (« prêt pour le pilote »). ADR dédiés à créer pour la gouvernance du
  référentiel stratégique national (#5) et le cadre juridique / DPIA (#2) avant le pilote.

## ADR remplacés / amendés

- [ADR-0001] et [ADR-0003] : leur **restriction de périmètre** (« acquisition seule », puis
  « + orientation, interop gelée ») est levée. Leurs **conditions** (règles produit testées,
  interfaces, pas de MVP jetable, stack ADR-0002) sont **reprises et maintenues** ci-dessus.
- [ADR-0003] §Sessions (tableau sessions/worktrees) : **abrogé**.
