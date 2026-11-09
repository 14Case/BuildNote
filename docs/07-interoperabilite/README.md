# H. Interopérabilité — Index

> **Statut : En revue — Couche 4.** Date : 2026-09-09.

L'interopérabilité BuildNote **n'essaie pas** de rendre une base « compatible avec toutes les bases
SQL ». Elle interpose un **modèle canonique** et une **couche d'abstraction**, et connecte chaque
système source par un **connecteur dédié**. Toute donnée externe est *traduite* vers le canonique ;
toute donnée exportée en *part*.

| Document | Contenu |
|---|---|
| [`vue-ensemble.md`](vue-ensemble.md) | Position du problème, chaîne cible, composants, modes d'intégration d'un établissement, principes non négociables |
| [`architecture-detaillee.md`](architecture-detaillee.md) | Spécification du **modèle canonique d'échange** (entités, clés de rapprochement, formats), **catalogue des connecteurs**, **moteur de mapping déclaratif** (grammaire), pipeline d'exécution, **gestion des conflits**, **lineage**, versioning du schéma, tableau de bord qualité, sécurité |
| [`etl-orchestration.md`](etl-orchestration.md) | **Spécification ETL / orchestration** : topologie des flux, ordonnancement, idempotence, reprise et *dead-letter*, fenêtres de synchronisation, débit et dimensionnement, observabilité des pipelines, isolation vis-à-vis de la saisie Module 1 |
| [`exemples-mapping.md`](exemples-mapping.md) | **Trois archétypes travaillés bout en bout** : (A) SGBD MySQL d'une application scolaire, (B) export CSV/Excel d'un établissement sans SI, (C) ancienne application fermée via *dump*. Fichiers de mapping complets, tables de valeurs, cas de quarantaine et de conflit |
| [`flux-et-sequences.md`](flux-et-sequences.md) | **Diagrammes de séquence** : import initial, synchronisation incrémentale, résolution de conflit, conflit import ↔ note validée Module 1, conflit import ↔ agent local hors-ligne, export de réversibilité |
| [`export-reversibilite.md`](export-reversibilite.md) | **Format de l'export de réversibilité** (`ENF-IOP-02`, `EF-IOP-11`) : structure de l'archive, manifeste, fichiers par entité, médias, lineage, procédure de ré-import et de vérification d'équivalence |

## Périmètre et frontières

- Le **modèle Normalized** (forme interne des données) est spécifié en
  [`../06-architecture-donnees/`](../06-architecture-donnees/README.md). Le **schéma canonique
  d'échange** décrit ici en est la **projection versionnée publiquement**.
- Le **dictionnaire de données** ([`../06-architecture-donnees/dictionnaire-donnees.md`](../06-architecture-donnees/dictionnaire-donnees.md))
  est la référence unique au niveau champ.
- La **synchronisation hors-ligne de l'agent local Module 1** (file, résolution de conflits de
  saisie) est un mécanisme **distinct** de l'interopérabilité, décrit en
  [`../08-ocr-computer-vision/pipeline.md`](../08-ocr-computer-vision/pipeline.md) ; leur point de
  rencontre (un import contredit une note validée localement) est traité en
  [`flux-et-sequences.md`](flux-et-sequences.md) §H-S.4.

## Rattachements

- Exigences : `EF-IOP-01..15`, `ENF-IOP-01..06`, `ENF-PERF-06` (débit d'import).
- Règles de gestion : `RG-09` (isolation), `RG-10` (quarantaine), `RG-11` (réversibilité),
  `RG-13` (idempotence).
- Architecture technique : composant « Services interopérabilité » et *workers* ETL du scénario C —
  [`../05-architecture-technique/scenarios-architecture.md`](../05-architecture-technique/scenarios-architecture.md) §F.4.
- POC : [POC 3 — interopérabilité](../12-poc/plans-poc.md).
- Décisions ouvertes : multi-tenant (#4), stack (#10) — [`../17-decisions/decisions-prealables.md`](../17-decisions/decisions-prealables.md).
- Risques : R3 (hétérogénéité / absence de SI), R12 (qualité des données importées),
  R14 (sur-ingénierie de l'interopérabilité).
