# P. Déploiement — À produire en Couche 7

> **Statut : À produire.** Plan cadré avant la Phase 8, exécuté à partir de la Phase 10.

Six scénarios à spécifier (topologie, prérequis, installation, sauvegardes, mises à jour, support,
coûts) :

| Scénario | Description | Points d'attention |
|---|---|---|
| **Établissement unique** | Une instance dédiée à un seul établissement | Simplicité ; sauvegardes ; montée de version |
| **Plusieurs établissements** | Une plateforme multi-tenant partagée | Isolation stricte, montée en charge, onboarding industrialisé |
| **Cloud** | Hébergement chez un fournisseur (régional de préférence) | Souveraineté (décision #1), coût de run, connectivité requise |
| **Infrastructure locale (on-premise)** | Serveur dans l'établissement | Maintenance décentralisée, sécurité physique, compétences locales |
| **Hybride** | Traitement local (Module 1, offline) + cœur centralisé | Synchronisation, cohérence, gestion des conflits |
| **Faible connectivité** | Mode dégradé : capture/validation hors-ligne, synchronisation différée, empreinte réseau minimale | Priorité produit ; tests de performance réseau (Phase 9) |

Éléments à produire : architecture de déploiement par scénario, runbooks (installation,
sauvegarde/restauration, mise à jour, reprise), plan de bascule, plan de formation et
d'accompagnement, plan de support (N1/N2) et SLA, plan de continuité d'activité, estimation des
coûts de run par scénario.

Lié à [`../05-architecture-technique/`](../05-architecture-technique/) et aux décisions
[`../17-decisions/decisions-prealables.md`](../17-decisions/decisions-prealables.md) #1 et #8.
