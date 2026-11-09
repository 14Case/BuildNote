# ADR-0003 — Extension de la dérogation « code avant J7 » au Module 2 (orientation)

Date : 2026-09-09
Statut : **Accepté** (porteur, 2026-09-09)
Portée : Module 2 — moteur d'orientation (dashboard de situation + orientation individuelle).
Étend [ADR-0001](ADR-0001-derogation-code-avant-j7.md), qui ne couvrait que la chaîne d'acquisition
du Module 1. N'ouvre **pas** l'interopérabilité (connecteurs).

## Contexte

[ADR-0001](ADR-0001-derogation-code-avant-j7.md) a autorisé le démarrage du code sur le **seul**
périmètre acquisition du Module 1 et précise explicitement qu'il « n'ouvre pas le développement du
Module 2 ». Le porteur décide d'étendre la dérogation au **Module 2**, en parallèle de la
préparation du POC 4 (moteur d'orientation) et de la validation documentaire de la Couche 5.

Le corpus de la Couche 5 pour l'orientation est produit (statut « En revue ») :
- [`vue-ensemble.md`](../09-moteur-orientation/vue-ensemble.md),
  [`architecture-detaillee.md`](../09-moteur-orientation/architecture-detaillee.md) (couche d'accès
  aux données, scoreur additif pondéré, moteur de règles, générateur d'explications, dashboard),
  [`gabarits-presentation.md`](../09-moteur-orientation/gabarits-presentation.md) (format du dossier,
  gabarits FR/EN).

Décision **critique** au sens de
[`gestion-changements-versions-documentaire.md`](../01-project-management/gestion-changements-versions-documentaire.md)
(règle non négociable de méthode). Tracée ici, à répercuter dans `CLAUDE.md` / `AGENTS.md`.

## Décision

Le développement du **Module 2 (orientation)** démarre, sous conditions :

1. **Règles produit non négociables inchangées et vérifiées par des tests** :
   - aucun recalcul automatique — dashboard et orientation lisent à la demande (`EF-M1-19`,
     `EF-M2-02`) ; test : l'écriture d'une note ne déclenche aucun job Module 2 ;
   - aide à la décision, jamais prescription (`EF-M2-19`, `EF-M2-26`) ; test : aucune sortie
     d'« affectation », filtre lexical sur les explications ;
   - explicabilité obligatoire (`EF-M2-18`) ; test : tout scénario porte ses 5 blocs et la somme
     des contributions reconstitue le score ;
   - génération conditionnée au consentement (`EF-M2-11`) ;
   - isolation par établissement sur toute lecture ;
   - le Module 2 n'écrit **rien** dans Normalized (`EF-M2-25`).
2. **Frontières à risque derrière interfaces** :
   - `OrientationDataGateway` (lecture instantané cohérent — cf. §J.3.1) ;
   - `ReferentialProvider` (offre de formation, métiers, référentiel stratégique national —
     versionné, cf. décision #5 non tranchée : fournisseur **fixtures** en attendant) ;
   - `ScoringWeights` (jeu de pondérations versionné, valeurs par défaut publiées) ;
   - `ExplanationTemplateCatalog` (gabarits FR/EN versionnés).
3. **Le POC 4 reste au programme** (Phase 6) et peut invalider des hypothèses de scoring /
   d'explication : la logique de fusion reste isolée et paramétrable.
4. **Pas de MVP jetable** : code visant la V1 de production.
5. **Stack** : celle de [ADR-0002](ADR-0002-stack-technologique-v1.md) — monorepo TypeScript.
   Ajout : `apps/api` accueille le service `orientation` ; `packages/shared` reçoit les contrats
   Zod du Module 2 (demande, scénario, facteur d'explication, catégories de score).
6. **Séparation stricte des modules** conservée dans le code : Module 1 et Module 2 ne partagent que
   `packages/shared` et lisent la base via des contrats ; aucune dépendance directe M1 ↔ M2
   (`architecture-fonctionnelle.md` §E.6).

## Conséquences

- `CLAUDE.md` / `AGENTS.md` : le régime devient « code autorisé sur *acquisition Module 1*
  **et Module 2 orientation**, derrière abstractions ; interopérabilité toujours gelée ».
- Roadmap : le lot Module 2 de la Phase 8 démarre en anticipation ; J7 reste la porte GO/NO-GO
  global et le point de revue de ces dérogations.
- Arborescence de code (complète ADR-0002) :
  ```
  packages/shared     + contrats orientation (Zod) + catalogues de gabarits FR/EN
  apps/api            + service orientation (gateway lecture, profileur, scoreur, explications)
  apps/web            + écrans Dashboard de situation, Dossier d'orientation, questionnaires
  ```
- Risque accepté : le référentiel stratégique national (#5) et l'hébergement (#1) restent ouverts ;
  le code impose déjà `version_referentiel_id` et `etablissement_id` partout.
- Suivi : revue à J7 ; ADR dédiés pour #1, #4, #5 avant le déploiement pilote.

## Sessions / répartition

| Session | Périmètre code | Branche | Worktree |
|---|---|---|---|
| Acquisition (Module 1) | `apps/web` capture/vérification, `apps/api` acquisition, `packages/shared` M1 | `feat/m1-acquisition` | `../BuildNote-m1-acquisition` |
| Orientation (Module 2) | `apps/api` service orientation, `apps/web` dashboard/dossier, `packages/shared` M2 | `feat/m2-orientation` | `../BuildNote-m2-orientation` |
| Interopérabilité / intégration | `packages/shared` modèle canonique, CI, **intégrateur** (merge vers `main`, fichiers partagés) | `feat/socle-integration` | `/Users/applenation/Desktop/BuildNote` |

Règles : chaque session ne `git add` que ses fichiers ; les fichiers partagés (`CLAUDE.md`,
`AGENTS.md`, `docs/README.md`, `docs/glossaire.md`, `packages/shared/**`, config racine) sont
modifiés via l'intégrateur ou une PR courte annoncée.
