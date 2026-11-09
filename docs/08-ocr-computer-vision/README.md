# I. OCR / Computer Vision — Index

> **Statut : En revue — Couche 5.** Date : 2026-09-08.

| Document | Contenu |
|---|---|
| [`pipeline.md`](pipeline.md) | Pipeline complet en 10 étapes (capture → prétraitement → détection de structure → OCR → compréhension du document → extraction → structuration → score de confiance → **validation humaine** → stockage), boucle d'amélioration MLOps, métriques et cibles, modes dégradés, interface d'abstraction OCR |

Cadre fonctionnel : [`../04-architecture-fonctionnelle/architecture-fonctionnelle.md`](../04-architecture-fonctionnelle/architecture-fonctionnelle.md) §E.3.
Exigences : `EF-M1-*`, `ENF-PERF-01/02`, `ENF-CTX-*`.
Choix du moteur : décision [`../17-decisions/decisions-prealables.md`](../17-decisions/decisions-prealables.md) #3, tranchée en Phase 7 après [POC 1 & 2](../12-poc/README.md).
