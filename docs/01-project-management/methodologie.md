# B.3 Méthodologie de gestion — BuildNote

> **Statut : En revue — Couche 2.** Date : 2026-09-08.

## 1. Cadre général : hybride à portes de décision

BuildNote combine deux régimes :

| Régime | Phases | Pourquoi |
|---|---|---|
| **Séquentiel à portes** (phase-gate) | 0 → 7 (cadrage, analyse, faisabilité, spécification, conception, UX/UI, POC, décision) | Les fondations (besoin, faisabilité, architecture, conformité) doivent être stables et validées **avant** tout code. Chaque phase produit des livrables évalués à une porte go/no-go. |
| **Itératif et incrémental** | 8 → 11 (développement, recette, pilote, généralisation) | La construction avance par **lots livrables et vérifiables** (L0–L5), avec démonstrations régulières et ajustements, tout en visant directement la solution de production. |

```mermaid
flowchart LR
    subgraph GATE["Phase-gate (sans code)"]
        P0 --> P1 --> P2 --> P3 --> P4 --> P5 --> P6 --> P7
    end
    P7 -->|GO| subgraph ITER["Itératif (avec code)"]
        L0 --> L1 --> L2 --> L3 --> L4 --> L5
    end
    ITER --> REC["Recette"] --> PIL["Pilote"] --> GEN["Généralisation"]
```

## 2. Gestion des exigences et du backlog

- **Source de vérité des exigences** : le cahier des charges (Phase 3), sous baseline gelée ;
  évolutions via gestion des changements.
- **Backlog de réalisation** (Phase 8) : dérivé du cahier des charges, organisé en **épopées →
  fonctionnalités → tâches**, priorisé par le comité produit (valeur, risque, dépendances).
- **Priorisation** : MoSCoW en analyse ; valeur/effort + risque en réalisation.
- **Traçabilité** maintenue de bout en bout : besoin → exigence → élément de backlog → test.

## 3. Definition of Ready (DoR) — un élément est prêt à être développé si :

- il est rattaché à une exigence tracée et à un critère d'acceptation ;
- ses dépendances sont identifiées et disponibles ;
- l'impact sur les règles non négociables (validation humaine OCR, non-recalcul Module 2,
  explicabilité, isolation établissements, i18n FR/EN) est analysé ;
- la maquette UX correspondante existe (si écran) ;
- l'effort est estimé.

## 4. Definition of Done (DoD) — un incrément est terminé si :

- le code satisfait les critères d'acceptation ;
- tests unitaires + d'intégration écrits et **verts** ;
- revue de code effectuée ;
- exigences de sécurité et de confidentialité applicables vérifiées ;
- **i18n FR/EN complète** (aucune chaîne codée en dur) ;
- documentation technique et, si besoin, utilisateur et d'exploitation mises à jour ;
- pas de régression sur le modèle canonique ni sur les métriques OCR de référence ;
- déployable via la chaîne CI/CD sur l'environnement de test.

## 5. Cadence et rituels (Phase 8+)

| Rituel | Fréquence | Objet |
|---|---|---|
| Planification de lot | Début de lot | Sélection et découpage des éléments de backlog |
| Point quotidien | Quotidien | Avancement, obstacles |
| Revue de lot (démo) | Fin de lot | Démonstration aux parties prenantes, feedback |
| Rétrospective | Fin de lot | Amélioration du processus |
| Revue d'architecture | Fin de lot + à la demande | Cohérence, dette technique, ADR |
| Revue de risques | Mensuelle + à chaque jalon | Mise à jour du registre |

## 6. Estimation et suivi

- Estimation **relative** (points) pour le backlog ; suivi de la **vélocité** par lot.
- Suivi visuel de l'avancement (tableau de flux) ; limite du travail en cours.
- Indicateurs : voir [`gouvernance.md`](gouvernance.md) §7.

## 7. Qualité intégrée

- Tests automatisés dès le premier lot ; intégration continue.
- **Contrôles automatiques** des règles non négociables lorsque possible (ex. test vérifiant
  qu'aucun événement « note écrite » ne déclenche un calcul d'orientation ; test d'isolation
  multi-tenant ; lint i18n).
- Revue de code obligatoire ; analyse statique ; revue de sécurité périodique.
- Stratégie de test complète : [`../13-tests/`](../13-tests/).

## 8. Gestion des environnements

| Environnement | Usage |
|---|---|
| Développement | Travail quotidien, données synthétiques |
| Intégration / Test | Tests automatisés et manuels, données anonymisées |
| POC | Isolé, dédié aux prototypes jetables (Phase 6) |
| Pré-production | Recette, tests de performance et de sécurité, image fidèle de la production |
| Production | Service réel (pilote puis généralisation) |

## 9. Documentation

Gérée comme du code (Markdown versionné, revue par les pairs). Règles :
[`gestion-changements-versions-documentaire.md`](gestion-changements-versions-documentaire.md).

## 10. Adaptation

La méthodologie est révisable en rétrospective de fin de lot et à chaque jalon. Toute évolution
significative est consignée en ADR.
