# P. Déploiement — Documentation et outillage opérationnel

> **Statut : Validé — Couche 7 (Lot L6).** Date : 2026-11-16.

Le dossier déploiement regroupe la stratégie de déploiement progressif, les procédures d'exploitation, les runbooks de résilience (PCA/PRA) et la qualification du jalon J7 (« Prêt pour le pilote »).

## Documents de la section

| Document | Contenu | Statut |
|---|---|:---:|
| [`plan-deploiement.md`](plan-deploiement.md) | Stratégie pilote → généralisation par vagues, topologie on-premise Docker Compose, composants et réversibilité | **Validé** |
| [`runbook-sauvegarde-restauration.md`](runbook-sauvegarde-restauration.md) | Procédures pas-à-pas de sauvegarde chiffrée quotidienne (AES-256-CBC), test de restauration mensuel et fiches réflexes PCA/PRA (RPO $\le$ 24h, RTO $\le$ 4h) | **Validé** |
| [`guide-utilisateur-pilote.md`](guide-utilisateur-pilote.md) | Manuel d'utilisation et de formation bilingue FR/EN pour les 3 rôles clés (Enseignant, Responsable pédagogique, Conseiller d'orientation) | **Validé** |
| [`rapport-revue-j7-pret-pour-pilote.md`](rapport-revue-j7-pret-pour-pilote.md) | Rapport officiel de passage de la porte J7 attestant de la conformité aux règles produit, de la couverture de tests (83/83) et du GO Pilote | **Validé** |

## Scripts d'exploitation automatisés

- [`../../scripts/install-etablissement.sh`](../../scripts/install-etablissement.sh) : Installation clé en main d'une instance établissement avec Docker Compose.
- [`../../scripts/backup-etablissement.sh`](../../scripts/backup-etablissement.sh) : Sauvegarde chiffrée quotidienne (base de données + médias Raw) scellée SHA-256 avec rotation 30 jours.
- [`../../scripts/restore-etablissement.sh`](../../scripts/restore-etablissement.sh) : Restauration sécurisée avec vérification d'intégrité et déchiffrement.

