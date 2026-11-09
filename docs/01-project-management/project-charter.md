# B.1 Project Charter — BuildNote

> **Statut : En revue — Couche 2.** Date : 2026-09-08.
> Document fondateur du projet. Toute modification passe par la gestion des changements (§B.4).

## 1. Contexte et justification

Dans de nombreux établissements camerounais (primaire, secondaire, supérieur), les résultats
scolaires sont produits et conservés sur **support papier** ou dans des **outils hétérogènes et non
communicants** (cahiers, tableurs, applications anciennes, quelques SGBD). Il en résulte :

- une **recopie manuelle** chronophage et source d'erreurs de report ;
- une **donnée peu exploitable** pour le pilotage pédagogique et l'orientation ;
- une **orientation** souvent réduite à « moyenne → série », déconnectée du profil réel de l'élève,
  des aspirations familiales, de l'offre de formation accessible et des **besoins de développement du
  pays** ;
- une **impossibilité d'agréger** une vision territoriale des compétences en formation.

BuildNote répond à ce constat par une plateforme à **deux modules séparés** : fiabilisation de la
donnée académique (avec vérification humaine), et aide à l'orientation (explicable, incluant la
dimension stratégique nationale), le tout **interopérable** avec l'existant et utilisable en
**faible connectivité**.

## 2. Objectifs du projet (SMART)

| # | Objectif | Mesure | Échéance de référence |
|---|----------|--------|-----------------------|
| OP-1 | Disposer d'un corpus documentaire d'ingénierie complet et validé (cadrage → POC) | Tous les jalons J0–J6 franchis | Fin Phase 6 |
| OP-2 | Prouver la faisabilité des 4 points à risque | 4 rapports de POC avec critères atteints ou périmètre ajusté | J6 |
| OP-3 | Livrer une solution de production couvrant les 2 modules + interopérabilité | Recette prononcée (J9) | Fin Phase 9 |
| OP-4 | Mettre BuildNote en service dans 1 établissement pilote | Rapport d'évaluation du pilote positif (J10) | Fin Phase 10 |
| OP-5 | Généraliser à un premier groupe d'établissements | ≥ N établissements en service stable (N défini en Phase 0) | Phase 11 |
| OP-6 | Garantir la conformité (données de mineurs, souveraineté) | DPIA finalisée + plan de conformité exécuté, 0 non-conformité majeure | J2 puis continu |

> Les échéances calendaires précises et la valeur de N seront fixées à la fin de la Phase 0 selon
> l'équipe et le budget.

## 3. Périmètre

### Dans le périmètre (in scope)
- **Module 1** : capture (photo/vidéo/fichier) de fiches, pipeline OCR / CV / Document Understanding,
  formulaire prérempli, **workflow de vérification et validation humaine**, enregistrement en base
  normalisée, mode hors-ligne.
- **Module 2** : dashboard de situation (classe/établissement, à la demande) ; moteur d'orientation
  individuelle explicable ; référentiel stratégique national évolutif ; saisie des aspirations
  (élève) et avis (parents).
- **Socle** : identité & accès multi-tenant, référentiels normalisés, stockage tri-strates
  (Raw / Normalized / Intelligence), journalisation & audit, i18n **FR/EN**.
- **Interopérabilité** : modèle canonique, connecteurs, mapping, normalisation, validation, gestion
  des conflits, lineage, versioning de schéma, contrôle qualité, import/export, ETL.
- **Documentation** d'ingénierie, de conformité, d'exploitation et utilisateur.

### Hors périmètre (out of scope)
- Gestion complète de la scolarité (emploi du temps, finances, inscriptions administratives,
  ressources humaines) — BuildNote **s'y interconnecte** mais ne les remplace pas.
- Édition officielle de bulletins ou de diplômes.
- Décision d'affectation : BuildNote **n'affecte pas** un élève à une filière ou un établissement.
- Conseil en investissement / placement des élèves à l'insu des familles.
- Développement d'un **MVP jetable** : la V1 est la solution de production (avec pilote progressif).
- Support de langues autres que FR/EN en V1 (l'architecture i18n reste extensible).

## 4. Livrables majeurs

Voir [`../15-livrables-par-phase/livrables.md`](../15-livrables-par-phase/livrables.md) pour le
détail par phase. Livrables pivots : Project Charter (J0), Dossier d'analyse (J1), Étude de
faisabilité + décisions (J2), Cahier des charges (J3), Dossier d'architecture (J4), Design system +
prototypes (J5), Rapports de POC (J6), Décision de construction (J7), Incréments vérifiés (J8),
PV de recette (J9), Rapport de pilote (J10), Plan de généralisation (J11).

## 5. Jalons

`J0` Charter · `J1` Analyse · `J2` Faisabilité & décisions · `J3` Cahier des charges · `J4`
Architecture · `J5` UX/UI · `J6` POC · **`J7` GO/NO-GO construction** · `J8` Lots vérifiés · `J9`
Recette · `J10` Bilan pilote · `J11` Généralisation.

## 6. Hypothèses

- H1 — Au moins un établissement accepte d'être **pilote** et de fournir des **données réelles
  anonymisées** pour les POC et la recette.
- H2 — Le cadre juridique permet le traitement des données scolaires de mineurs avec **consentement
  parental** et une base légale identifiable.
- H3 — Les enseignants disposent (ou peuvent disposer) d'un **smartphone** ou d'un poste pour la
  capture.
- H4 — Un **hébergement** conforme (cloud régional, local ou hybride) est accessible dans le budget.
- H5 — Des **sources publiques** existent pour alimenter le référentiel stratégique national.
- H6 — Le financement couvre au minimum les Phases 0 → 7, puis 8 → 10.

> Toute hypothèse infirmée déclenche une revue de risque et, si nécessaire, une demande de
> changement.

## 7. Contraintes

| Type | Contrainte |
|---|---|
| Juridique | Loi camerounaise N° 2010/012 ; protection des données de mineurs ; souveraineté ; anticipation d'un socle type RGPD (multi-pays). |
| Technique | Faible connectivité ; matériel modeste ; hétérogénéité des SI existants ; pas de dépendance forcée à un fournisseur. |
| Organisationnelle | Initiative privée (pas de tutelle ministérielle actuelle) ; adoption reposant sur la valeur démontrée. |
| Produit | Deux modules **séparés** ; **vérification humaine OCR** obligatoire ; **non-recalcul automatique** du Module 2 ; recommandations **explicables** ; **bilinguisme FR/EN**. |
| Éthique | Aide à la décision, jamais prescription ; non-discrimination ; supervision humaine de l'orientation. |
| Budgétaire | Enveloppe à préciser en Phase 0 ; financement par jalons. |

## 8. Parties prenantes et gouvernance

Cartographie et plan d'engagement : [`../00-vision/vision-produit.md`](../00-vision/vision-produit.md) §A.6.
Instances et RACI : [`gouvernance.md`](gouvernance.md).

**Sponsor / porteur** : décisionnaire final, engage le budget à chaque porte.
**Directeur de projet** : pilote l'exécution, les jalons, les risques.
**Product Manager** : garant de la valeur et de la priorisation.

## 9. Budget macro (cadre)

À compléter en Phase 0. Structure :

| Poste | Build (Phases 0–9) | Run annuel (à partir de Phase 10) |
|---|---|---|
| Équipe projet (produit, archi, data, IA/OCR, UX, sécurité, QA, DevOps, gestion) | à chiffrer | maintenance & évolutions |
| Hébergement & infrastructure | environnements de dev/test/POC | production (selon scénario #1) |
| Services OCR/IA (si managés) | POC & développement | coût au volume |
| Accès aux données / partenariats référentiel | — | mise à jour du référentiel |
| Accompagnement, formation, support | — | support N1/N2 |
| Juridique & conformité (DPIA, contrats) | Phase 2 | veille réglementaire |

**Règle de financement** : chaque phase n'est engagée qu'après la porte de décision de la
précédente.

## 10. Risques majeurs

Voir [`../16-risques/risques.md`](../16-risques/risques.md). Les plus structurants : fiabilité OCR
manuscrit (R1), hétérogénéité des SI (R3), cadre juridique (R4), biais d'orientation (R7),
financement (R11), stratégie « pas de MVP » (R2).

## 11. Critères de succès du projet

- Les deux modules sont **utilisés en conditions réelles** dans l'établissement pilote.
- La saisie d'une fiche est **plus rapide et plus fiable** que la méthode manuelle (mesuré).
- Les dossiers d'orientation sont jugés **compréhensibles et utiles** par les conseillers et les
  familles (mesuré).
- Un établissement est **intégré** (import de l'existant ou saisie primaire) sans développement
  spécifique lourd.
- **Aucune** violation de cloisonnement entre établissements, **aucune** non-conformité majeure.
- Le produit est **maintenable et documenté** (reprise possible par une autre équipe).

## 12. Autorité du projet

Le présent Charter, une fois validé par le sponsor, **autorise l'ouverture de la Phase 1** et
engage le budget correspondant. Il constitue la référence en cas d'arbitrage sur le périmètre ou
les objectifs.
