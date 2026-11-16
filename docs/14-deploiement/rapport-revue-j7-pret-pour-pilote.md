# Rapport de Revue de Jalon J7 — « Prêt pour le pilote »

> **Statut : Validé — Couche 7.** Date : 2026-11-16.  
> Contexte : Clôture du développement itératif (Phase 8, Lots L0→L6) et prononcé de la décision Go / No-Go pour le déploiement du pilote dans le premier établissement scolaire (Cameroun).

---

## 1. Synthèse exécutive et Décision de la Porte J7

La revue de jalon **J7 (« Prêt pour le pilote »)** s'est tenue à l'issue de l'achèvement des six lots de développement opérationnel définis dans le plan directeur ([ADR-0004](../17-decisions/ADR-0004-consolidation-flux-unique-developpement.md)).

| Critère d'évaluation | Statut | Constat technique |
|---|---|---|
| **Règles produit non négociables** | **100% Conforme** | Les 3 règles inviolables sont scellées et vérifiées par des tests automatisés bloquants. |
| **Périmètre fonctionnel (Modules 1 & 2)** | **Complet** | Acquisition et vérification humaine (M1) + Orientation explicable et dashboard (M2). |
| **Interopérabilité & Réversibilité** | **Complet** | Import tableur avec dé-pivotage (Archétype B) + Export de réversibilité canonique `v1`. |
| **Sécurité & Cloisonnement multi-tenant** | **Validé** | Isolation `etablissement_id` + RLS PostgreSQL + Brute-force protection + En-têtes HTTP. |
| **Résilience & Sauvegardes (PCA / PRA)** | **Validé** | Sauvegardes chiffrées AES-256-CBC, contrôle SHA-256 et runbook de restauration éprouvé. |
| **Bilinguisme intégral FR / EN** | **Validé** | 178 clés i18n en parité stricte, 0 libellé en dur, documentation bilingue. |
| **Packaging de production on-premise** | **Opérationnel** | Docker Compose unifié (PostgreSQL, MinIO, API Fastify, Web PWA Nginx). |

> [!IMPORTANT]
> **Décision du Comité de pilotage : GO PILOTE FERME**.  
> Le système logiciel BuildNote est déclaré apte et qualifié pour un déploiement en conditions réelles d'exploitation sur le premier établissement pilote.

---

## 2. Vérification des 3 Règles Produit Non Négociables

### Règle 1 : Aucun recalcul automatique par le Module 2 (`EF-M1-19`, `EF-M2-02`)
- **Vérification** : Le Module 2 lit la base normalisée et le référentiel national **strictement à la demande**. L'insertion ou la validation d'une note dans le Module 1 ne déclenche aucun traitement ni recalcul d'orientation en arrière-plan.
- **Preuve technique** : Test d'intégration [`apps/api/test/acquisition.test.ts`](file:///Users/MrCase/Desktop/BuildNote-main/apps/api/test/acquisition.test.ts) validant l'absence totale d'événements Module 2 dans le journal d'audit après validation d'un lot de notes.

### Règle 2 : Aucune écriture dans Normalized sans revue humaine obligatoire (`EF-M1-10`, `EF-M1-11`)
- **Vérification** : Une sortie OCR ou un import ne peut jamais créer directement une note officielle. L'enseignant doit obligatoirement contrôler les données sur l'écran de vérification interactive, signer l'accusé de récapitulatif (`EF-M1-11`), ce qui déclenche l'écriture atomique en base avec empreinte SHA-256 anti-écrasement.
- **Preuve technique** : Tests de garde-fous dans [`apps/api/test/acquisition.test.ts`](file:///Users/MrCase/Desktop/BuildNote-main/apps/api/test/acquisition.test.ts) et [`apps/web/test/verification.test.ts`](file:///Users/MrCase/Desktop/BuildNote-main/apps/web/test/verification.test.ts).

### Règle 3 : Orientation explicable et éthique de non-prescription (`EF-M2-18`, `EF-M2-19/26`)
- **Vérification** : Chaque recommandation est accompagnée de ses 5 blocs d'explications mathématiques transparents (facteurs déterminants, fiabilité des données, décomposition proportionnelle du score, alternatives écartées avec motif, zones d'incertitude). Le système affiche systématiquement la mention d'aide à la décision sans prescription contraignante. Double consentement élève + parents obligatoire (`EF-M2-11`).
- **Preuve technique** : Tests [`apps/api/test/orientation/routes.test.ts`](file:///Users/MrCase/Desktop/BuildNote-main/apps/api/test/orientation/routes.test.ts) et [`apps/web/test/orientation-web.test.ts`](file:///Users/MrCase/Desktop/BuildNote-main/apps/web/test/orientation-web.test.ts).

---

## 3. Bilan des réalisations par Lot de développement

| Lot | Intitulé | Principaux composants livrés | Statut |
|---|---|---|:---:|
| **L0** | Socle, sécurité v1 & Docker | Session HttpOnly, hachage Scrypt, RBAC, RLS PostgreSQL, MinIO, Docker Compose, observabilité (`/health`, `/ready`). | **Validé** |
| **L1** | Durcissement API acquisition M1 | Quotas d'upload (15 Mo / 10 docs), pagination, anti-écrasement SHA-256, gestion des conflits, test de charge 10x. | **Validé** |
| **L2** | PWA Web Capture & Vérification | PWA offline-first IndexedDB, caméra, codes couleur de confiance, raccourcis clavier, modal de récapitulatif. | **Validé** |
| **L3** | API orientation M2 base réelle | `DatabaseOrientationGateway`, normalisation des niveaux, questionnaire élève/parents, consentement obligatoire. | **Validé** |
| **L4** | Web Module 2 Dashboard & Dossier | Dashboard de situation à la demande, vue détaillée 5 blocs d'explication, questionnaire & consentement, i18n FR/EN. | **Validé** |
| **L5** | Interopérabilité & Réversibilité | Modèle canonique `v1`, parser tabulaire, dé-pivotage Archétype B, protection anti-écrasement des notes M1, export de réversibilité. | **Validé** |
| **L6** | Durcissement & Déploiement pilote | Protection anti-bruteforce, tests d'intrusion multi-tenant, coffre à secrets, sauvegarde chiffrée AES-256, runbook PCA/PRA. | **Validé** |

---

## 4. Métriques de qualité et couverture de tests

```
======================================================================
RÉSULTAT DE LA VALIDATION QUALITÉ GLOBALE (CI AUTOMATISÉE)
======================================================================
1. Contrôle des types statiques (TypeScript NodeNext strict) :
   ✓ @buildnote/shared : 0 erreur
   ✓ @buildnote/api    : 0 erreur
   ✓ @buildnote/web    : 0 erreur

2. Parité internationale i18n (scripts/lint-i18n.mjs) :
   ✓ 178 clés synchronisées à 100% entre fr.ts et en.ts
   ✓ 15 composants web inspectés : 0 libellé ou texte en dur détecté

3. Suite de tests automatisés (Vitest) :
   ✓ @buildnote/shared : 19 / 19 tests passés (100%)
   ✓ @buildnote/api    : 56 / 56 tests passés (100%)
   ✓ @buildnote/web    :  8 /  8 tests passés (100%)
   -------------------------------------------------------------------
   TOTAL : 83 / 83 tests automatisés verts
======================================================================
```

---

## 5. Livrables documentaires de la Porte J7

1. **Architecture de sécurité durcie** : [`docs/10-securite/architecture-securite.md`](../10-securite/architecture-securite.md)
2. **Plan de déploiement et packaging** : [`docs/14-deploiement/plan-deploiement.md`](plan-deploiement.md)
3. **Runbook d'exploitation et PCA/PRA** : [`docs/14-deploiement/runbook-sauvegarde-restauration.md`](runbook-sauvegarde-restauration.md)
4. **Manuel utilisateur et formation bilingue** : [`docs/14-deploiement/guide-utilisateur-pilote.md`](guide-utilisateur-pilote.md)
5. **Scripts d'exploitation automatisés** :
   - [`scripts/install-etablissement.sh`](../../scripts/install-etablissement.sh) : Installation et démarrage Docker Compose.
   - [`scripts/backup-etablissement.sh`](../../scripts/backup-etablissement.sh) : Sauvegarde chiffrée AES-256 quotidienne avec rotation 30 jours.
   - [`scripts/restore-etablissement.sh`](../../scripts/restore-etablissement.sh) : Restauration vérifiée par empreinte SHA-256.

---

## 6. Prochaines étapes (Phase Pilote sur le Terrain)

1. **Déploiement sur site** : Installation du serveur physique dans l'établissement pilote via `install-etablissement.sh`.
2. **Session de formation** : Formation de l'équipe pédagogique (enseignants de 3e, responsables, conseiller d'orientation) à partir du manuel utilisateur.
3. **Période d'observation (4 semaines)** : Numérisation des évaluations du trimestre en cours, recueil des retours d'expérience et métrologie de performance.
