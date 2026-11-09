# J. Moteur d'orientation — Index

> **Statut : En revue.** Vue d'ensemble en Couche 1, détail en Couche 5. Date : 2026-09-09.

| Document | Contenu |
|---|---|
| [`vue-ensemble.md`](vue-ensemble.md) | Principes fondateurs, ce que le moteur combine (6 catégories), chaîne de traitement, architecture logique cible, aperçu explicabilité / référentiel national / garde-fous |
| [`architecture-detaillee.md`](architecture-detaillee.md) | Architecture logique, **couche d'accès aux données** (déclenchement à la demande, snapshot cohérent, ordre de lecture, cloisonnement), profileur, générateur de scénarios, moteur de règles, **scoreur additif pondéré** (6 catégories), générateur d'explications, **dashboard de situation** (catalogue de requêtes, cache), gouvernance du référentiel national, garde-fous éthiques, extensibilité multi-pays |
| [`gabarits-presentation.md`](gabarits-presentation.md) | **Comment les résultats sont présentés** : règles de formulation (non-prescription), gabarits de texte FR/EN, format du dossier d'orientation, anatomie d'une carte de scénario, les 5 blocs d'explication, avertissement de fiabilité gradué, rendu du dashboard, export pour l'entretien famille, accessibilité / i18n |

Cadre fonctionnel : [`../04-architecture-fonctionnelle/architecture-fonctionnelle.md`](../04-architecture-fonctionnelle/architecture-fonctionnelle.md) §E.4.
Rendu UI : [`../11-ux-ui/architecture-ux-ui.md`](../11-ux-ui/architecture-ux-ui.md) §L.5.4–L.5.5.
Données : [`../06-architecture-donnees/modele-conceptuel-logique-physique.md`](../06-architecture-donnees/modele-conceptuel-logique-physique.md) §G.1.4–G.1.5, §G.2.4–G.2.5.
Exigences : `EF-M2-*`, `EF-M1-19`, `ENF-UX-06`, `ENF-I18N-02`.
Gouvernance du référentiel stratégique national : décision [`../17-decisions/decisions-prealables.md`](../17-decisions/decisions-prealables.md) #5, à arbitrer en Phase 2 ; validé en Phase 7 après [POC 4](../12-poc/README.md).
