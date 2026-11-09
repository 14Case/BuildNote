# Décisions préalables au développement — BuildNote

> **Statut : Vivant — ouvert en Couche 1.** Date : 2026-09-08.
> Ces décisions doivent être **instruites et arbitrées en Phase 2 (Faisabilité)**, avant toute
> conception d'architecture définitive et **avant toute ligne de code**.
> Chaque décision arbitrée devient un **ADR** dans ce dossier (`ADR-000x-titre.md`).
>
> **2026-09-09 — le gel du code est levé** ([ADR-0004](ADR-0004-consolidation-flux-unique-developpement.md)) :
> tout le périmètre de code est ouvert (socle, Module 1, Module 2, interopérabilité), en **flux de
> développement unique** (fin des sessions parallèles). J7 devient une revue « prêt pour le pilote ».
> Décisions **tranchées ce jour** : #4 et cible d'hébergement dev/pilote ([ADR-0005](ADR-0005-multi-tenant-et-hebergement.md)),
> socle sécurité v1 ([ADR-0006](ADR-0006-socle-securite-v1.md)), #10 confirmée pour tout le produit
> ([ADR-0002](ADR-0002-stack-technologique-v1.md) via ADR-0004 §7).
> Restent ouvertes : #1 (souveraineté définitive), #2 (juridique / DPIA), #3 (moteur OCR — choix
> après bench), #5 (gouvernance du référentiel national), #6/#7/#9/#11/#12. Le code les tient
> derrière des interfaces ou des fixtures versionnées.

## ADR produits

| ADR | Objet | Statut |
|---|---|---|
| [ADR-0001](ADR-0001-derogation-code-avant-j7.md) | Dérogation « pas de code avant J7 » — acquisition Module 1 | Accepté — **absorbé par ADR-0004** |
| [ADR-0002](ADR-0002-stack-technologique-v1.md) | Stack technologique — monorepo TypeScript (résout #10) | Accepté (étendu à tout le produit par ADR-0004) |
| [ADR-0003](ADR-0003-extension-derogation-module-2-orientation.md) | Extension de la dérogation au Module 2 | Accepté — **absorbé par ADR-0004** (§Sessions abrogé) |
| [ADR-0004](ADR-0004-consolidation-flux-unique-developpement.md) | Consolidation, flux unique, levée du gel — **régime de développement actuel** | Accepté |
| [ADR-0005](ADR-0005-multi-tenant-et-hebergement.md) | Multi-tenant (#4) : une base PostgreSQL par établissement, on-premise ; `etablissement_id` + RLS | Accepté |
| [ADR-0006](ADR-0006-socle-securite-v1.md) | Socle sécurité v1 : session serveur + Argon2id + RBAC par établissement | Accepté |

| # | Décision | Impact si non tranchée | Phase d'arbitrage |
|---|----------|------------------------|-------------------|
| 1 | Hébergement & souveraineté | Bloque l'architecture technique et la conformité | 2 |
| 2 | Cadre juridique & rétention | Bloque le traitement des données personnelles | 2 |
| 3 | Stratégie OCR | Bloque le choix du pipeline Module 1 | 2 (cadrage) → 7 (choix final après POC) |
| 4 | Modèle multi-tenant | Bloque le modèle de données physique et la sécurité | 2 → 4 |
| 5 | Gouvernance du référentiel stratégique national | Bloque le Module 2 | 2 |
| 6 | Périmètre de la V1 | Bloque la spécification | 0 (macro) → 2 (fin) |
| 7 | « Pas de MVP » vs pilote progressif | Impacte la roadmap et le budget | 0 → 2 |
| 8 | Cible de connectivité & exigence hors-ligne | Impacte l'architecture du Module 1 | 2 |
| 9 | Modèle économique & structure porteuse | Impacte la pérennité | 0 → 2 |
| 10 | Stack technologique | À figer après faisabilité + POC | 4 (candidats) → 7 (final) — **partiellement tranchée** : [ADR-0002](ADR-0002-stack-technologique-v1.md) pour l'acquisition |
| 11 | Politique linguistique | Impacte l'i18n et le multi-pays | 2 |
| 12 | Propriété intellectuelle & licence | Impacte la diffusion et les partenariats | 0 → 2 |

---

## #1 — Hébergement & souveraineté des données

**Question** : où sont physiquement stockées et traitées les données (élèves mineurs, notes, images
de fiches) ?

**Options** :
| Option | Avantages | Inconvénients |
|---|---|---|
| **On-premise établissement** (serveur local) | Souveraineté maximale, fonctionne hors-ligne | Maintenance décentralisée, sauvegardes difficiles, sécurité inégale, mises à jour lourdes |
| **Cloud régional / national** | Exploitation centralisée, sauvegardes, scalabilité | Dépendance fournisseur, question de la localisation légale des données, coût récurrent, besoin de connectivité |
| **Hybride** (traitement local + synchronisation centrale) | Concilie hors-ligne et exploitation centralisée | Complexité de synchronisation et de cohérence, coût de conception |

**Éléments de décision** : cadre légal (#2), connectivité réelle des établissements (#8), budget de
run (#9), attentes des établissements.
**Recommandation provisoire** : **hybride** (Module 1 opérationnel localement, synchronisation vers
un cœur centralisé), à confirmer par la faisabilité.

---

## #2 — Cadre juridique & rétention des données

**Questions** : base légale du traitement ? consentement parental (élèves mineurs) ? durées de
conservation (Raw = images de fiches ; Normalized ; données du Module 2) ? droits des personnes
(accès, rectification, opposition) ? transferts éventuels ?

**Cadre applicable** : loi camerounaise **N° 2010/012** relative à la cybersécurité et à la
cybercriminalité, textes sur la protection des données personnelles, réglementation du secteur
éducatif ; anticiper un **socle type RGPD** pour la portée multi-pays.

**Livrables liés** : DPIA préliminaire (Phase 2), plan de conformité, registre des traitements.
**Recommandation provisoire** : minimisation stricte ; consentement explicite pour le Module 2 ;
conservation du Raw limitée et justifiée (ex. le temps de l'année scolaire + délai de contestation),
à valider juridiquement.

---

## #3 — Stratégie OCR / Computer Vision

**Question** : construire, s'appuyer sur des services managés, ou une approche mixte ? Support du
manuscrit ?

**Options** :
| Option | Avantages | Inconvénients |
|---|---|---|
| **Services managés** (ex. Google Document AI, Azure AI Document Intelligence, AWS Textract) | Qualité élevée sur imprimé et tableaux, time-to-market | Coût récurrent au volume, dépendance, souveraineté, connectivité requise |
| **Open source auto-hébergé** (ex. Tesseract, PaddleOCR, docTR + modèles de détection de tableaux) | Souveraineté, coût maîtrisé, hors-ligne possible | Qualité variable, effort d'intégration et d'entraînement, MLOps |
| **Mixte** (open source par défaut, managé en repli/haute exigence) | Flexibilité, résilience | Double intégration, complexité |

**Éléments de décision** : résultats du **POC OCR** et du **POC extraction de tableaux**, #1, budget
de run.
**Recommandation provisoire** : **abstraction du moteur** (interface interne stable) + benchmark
multi-fournisseurs au POC ; choix final en **Phase 7**.

---

## #4 — Modèle multi-tenant (isolation des établissements)

**Options** :
| Option | Isolation | Exploitation | Coût |
|---|---|---|---|
| **Base de données par établissement** | Forte | Lourde à grande échelle | Élevé |
| **Schéma par établissement** (même instance) | Bonne | Intermédiaire | Moyen |
| **Base partagée + cloisonnement applicatif** (clé établissement obligatoire, politiques d'accès) | Dépend de la rigueur applicative | Simple | Faible |

**Éléments de décision** : #1, exigences de sécurité (Couche 6), volumétrie cible, coût.
**Recommandation provisoire** : **schéma par établissement** ou **base partagée avec cloisonnement
strict imposé au niveau du socle** + tests d'isolation dédiés ; à trancher en Phase 4.

---

## #5 — Gouvernance du référentiel stratégique national

**Questions** : quelles **sources officielles** ? qui **maintient** le référentiel ? à quelle
**fréquence** ? quel **processus de validation** ? comment gérer l'obsolescence ?

**Sources candidates** : Stratégie Nationale de Développement (SND30), Institut National de la
Statistique (INS), MINEPAT, observatoires emploi-formation (ex. ONEFOP), études sectorielles,
partenaires techniques et économiques.

**Recommandation provisoire** : un **rôle dédié** « gestionnaire du référentiel » ; chaque entrée
**sourcée + datée + versionnée** ; revue au moins annuelle ; affichage de l'ancienneté ; le
référentiel **pondère** le scoring sans **verrouiller** d'option.

---

## #6 — Périmètre de la V1

**Questions** : quels **niveaux** couverts en V1 (primaire ? secondaire ? supérieur ? tous ?) ;
combien d'**établissements pilotes** ; quel **périmètre fonctionnel minimal réellement exploitable**
(les deux modules ? le Module 1 d'abord ?).

**Recommandation provisoire** : cadrer un périmètre V1 **resserré mais complet** (les deux modules,
sur un niveau ou deux, un petit nombre d'établissements pilotes), la solution restant de production.
À finaliser en Phase 2 sur la base de l'analyse (Phase 1).

---

## #7 — « Pas de MVP » vs déploiement pilote progressif

**Position du porteur** : pas de MVP, développement direct de la solution utilisée en production.

**Risque** : effet tunnel, écart au besoin (voir [`16-risques/risques.md`](../16-risques/risques.md) R2).

**Recommandation** : conserver l'objectif « solution de production » **mais** :
- développer **par lots vérifiables** (L0–L5),
- **déployer d'abord dans 1 établissement** (Phase 10) avant généralisation,
- maintenir les **portes de validation** et les **démonstrations régulières**.
Cet arbitrage doit être **explicitement acté** par le porteur.

---

## #8 — Cible de connectivité & exigence hors-ligne

**Questions** : quel est le pire scénario de connectivité à supporter (aucune connexion pendant N
jours ? connexion lente intermittente ?) ; quelles fonctions doivent marcher **hors-ligne** (capture
et validation Module 1 ? consultation ?) ; volume de synchronisation acceptable.

**Recommandation provisoire** : **Module 1 pleinement opérationnel hors-ligne** (capture +
validation + file d'attente de synchronisation) ; Module 2 en ligne (consultation possible en
cache). À préciser en Phase 2 avec des données terrain.

---

## #9 — Modèle économique & structure porteuse

**Questions** : qui **finance** le développement ? qui **finance l'exploitation** (hébergement, OCR,
support) ? modèle de **revenu** (abonnement établissement, subvention, partenariat, gratuité +
financement externe) ? qui **possède** la donnée (l'établissement, dans tous les cas) ? quelle
**entité juridique** porte le produit ?

**Recommandation provisoire** : formaliser en Phase 0 une note de modèle économique avec au moins
un scénario de financement du **run** sur 3 ans.

---

## #10 — Stack technologique

**Principe** : **aucune technologie n'est imposée a priori.** Les candidats sont proposés en
**Phase 4** (scénarios d'architecture comparés sur avantages / inconvénients / coûts / complexité /
scalabilité) et le choix est **figé en Phase 7**, après les POC, avec un ADR par choix majeur
(langage(s), framework(s), SGBD du cœur, moteur OCR, orchestration, mobile/web, hébergement).

---

## #11 — Politique linguistique

**Acté** : interface **bilingue FR/EN**, **sélecteur de langue sur l'écran d'accueil**, i18n de bout
en bout (UI, messages, exports, explications d'orientation).
**À décider** : langue par défaut ; gestion des contenus de référentiel bilingues ; anticipation
d'autres langues pour l'extension multi-pays (l'architecture i18n ne doit pas se limiter à deux
langues).

---

## #12 — Propriété intellectuelle & modèle de licence

**Questions** : le logiciel est-il propriétaire, open source, ou mixte ? quelles conditions pour les
établissements et d'éventuels partenaires ? propriété des connecteurs développés pour un
établissement ?
**Recommandation provisoire** : trancher en Phase 0/2 ; par défaut, **propriété du porteur** avec
licence d'utilisation aux établissements, **export des données garanti** (réversibilité).

---

## Modèle d'ADR (à utiliser lors de l'arbitrage)

```
# ADR-000X — <Titre de la décision>
Date : AAAA-MM-JJ
Statut : Proposé | Accepté | Remplacé par ADR-000Y | Déprécié

## Contexte
<Le problème, les contraintes, les éléments de décision.>

## Options envisagées
<Option A / B / C — avantages, inconvénients, coûts, complexité, scalabilité.>

## Décision
<L'option retenue et la justification.>

## Conséquences
<Ce que cela implique, ce que cela ferme, les risques induits, les actions de suivi.>
```
