# O. Stratégie et plans de test — BuildNote

> **Statut : En revue — Couche 7.** Date : 2026-09-08.
> Stratégie définie avant la Phase 8 ; exécution en continu (Phase 8) et en recette (Phase 9).

## O.1 Objectifs

- Prouver que BuildNote satisfait le [cahier des charges](../03-cahier-des-charges/) de façon
  **reproductible**.
- Détecter les défauts **au plus tôt** (tests automatisés dès le lot L0).
- Garantir les **règles non négociables** par des tests dédiés.
- Fournir des preuves objectives pour les portes **J8.x** et **J9**.

## O.2 Principes

1. **Automatisation d'abord** : tout test répétable est automatisé et exécuté en intégration
   continue.
2. **Pyramide** : beaucoup d'unitaires, moins d'intégration, peu de bout-en-bout — complétée par des
   campagnes spécialisées (OCR, sécurité, performance, interopérabilité, utilisateurs).
3. **Traçabilité** : chaque exigence critique est reliée à au moins un cas de test (matrice
   [`../03-cahier-des-charges/contraintes-kpi-tracabilite.md`](../03-cahier-des-charges/contraintes-kpi-tracabilite.md) §D.4).
4. **Données de test pseudonymisées** ; aucune donnée réelle identifiante hors production.
5. **Critères d'entrée/sortie** définis par type de test.

## O.3 Types de test

### O.3.1 Tests unitaires
| | |
|---|---|
| Cible | Logique de chaque composant isolé (règles de gestion, normalisation, scoring, mapping, calculs Intelligence) |
| Quand | En continu (Phase 8), bloquant en CI |
| Critère de sortie | ≥ 80 % lignes / ≥ 70 % branches sur les composants critiques (`ENF-MAINT-02`) |
| Points d'attention | Barèmes et plages de notes, conversions de dates/valeurs, scoring additif (contributions, bornes), clés de rapprochement |

### O.3.2 Tests d'intégration
| | |
|---|---|
| Cible | Contrats entre composants et modules ; socle ↔ Module 1 ↔ interopérabilité ; bus d'événements ; couche d'accès aux données (filtre tenant) |
| Cas clés | **Aucun événement « note enregistrée » ne déclenche un traitement du Module 2** (`EF-M1-19`, `EF-M2-02`) ; écriture Raw + Normalized liées à la validation ; synchro hors-ligne → cœur |
| Quand | En continu |

### O.3.3 Tests système / bout-en-bout
| | |
|---|---|
| Cible | Scénarios métier complets des cas d'usage (UC-01 à UC-14) |
| Exemples | Capturer → corriger → valider → retrouver la note ; générer une orientation → exporter FR/EN ; importer un établissement → exporter (réversibilité) |
| Quand | Fin de lot + Phase 9 |

### O.3.4 Tests OCR
| | |
|---|---|
| Cible | Qualité de reconnaissance et de structuration, non-régression des modèles |
| Jeux | Jeux annotés issus des POC 1 & 2, enrichis ; `imprime_bon/degrade`, `manuscrit_lisible/difficile`, gabarits variés, barèmes variés |
| Métriques | Exactitude cellule (imprimé ≥ 90 %, manuscrit lisible ≥ 70 %), CER/WER, reconstruction de structure ≥ 85 %, rapprochement élève ≥ 90 %, temps, taux de correction |
| Règle | Toute publication de modèle/réglage exige la **non-régression** sur les jeux de référence (bloquant) |
| Quand | À chaque évolution du pipeline + Phase 9 + périodiquement en production |

### O.3.5 Tests de données
| | |
|---|---|
| Cible | Qualité, migrations, non-régression du modèle canonique, idempotence des imports, dédoublonnage, lineage |
| Cas clés | Rejouer un import → aucun doublon (`EF-IOP-09`) ; migration de schéma vN→vN+1 réversible ; quarantaine tracée ; export → réimport sans perte ; note validée jamais écrasée par import |
| Quand | En continu + Phase 9 |

### O.3.6 Tests de sécurité
| | |
|---|---|
| Cible | Contrôle d'accès, **isolation multi-tenant**, chiffrement, secrets, audit, résistance aux attaques courantes |
| Types | Tests automatisés d'isolation (à chaque release, résultat vert obligatoire) ; analyse statique de sécurité (CI) ; analyse de dépendances ; **tests d'intrusion** avant 1re mise en production et à chaque évolution majeure (périmètre incluant cloisonnement + agent local) ; tests des règles RBAC/ABAC |
| Critère de sortie J9 | Aucune faille critique ou élevée ouverte ; 0 fuite inter-établissements |
| Réf. | [`../10-securite/architecture-securite.md`](../10-securite/architecture-securite.md) |

### O.3.7 Tests de performance
| | |
|---|---|
| Cible | Temps de réponse, charge, volumétrie, **réseau dégradé / hors-ligne** |
| Scénarios | Traitement OCR d'une fiche (`ENF-PERF-01`) ; validation d'un lot ; calcul dashboard établissement (`ENF-PERF-04`) ; génération d'un dossier d'orientation (`ENF-PERF-05`) ; import volumineux ; pics simultanés (période de composition, campagne d'orientation) ; synchro d'une journée hors-ligne sur connexion lente |
| Mesures | Latence (p50/p95), débit, ressources, comportement sous coupure |
| Critère de sortie | Cibles `ENF-PERF-*` et `ENF-CTX-*` atteintes ou écarts acceptés |

### O.3.8 Tests utilisateurs (recette / UAT)
| | |
|---|---|
| Cible | Conformité au besoin, ergonomie, **compréhension des dossiers d'orientation** |
| Participants | Enseignants, responsables, conseillers, admins SI, élèves/parents |
| Méthode | Scénarios de recette dérivés des cas d'usage ; grille de mesure (réussite 1er essai, temps, erreurs, satisfaction, compréhension) |
| Critère de sortie | Scénarios de recette passés ; `ENF-UX-01/02/06` atteints ; PV de recette signé |

### O.3.9 Tests d'interopérabilité
| | |
|---|---|
| Cible | Connecteurs, mappings, normalisation, validation, quarantaine, conflits, lineage, réversibilité, versioning de schéma |
| Méthode | Bibliothèque de mappings de référence (POC 3 + établissements) rejouée à chaque version du canonique (CI d'interopérabilité) ; jeux de sources simulées + 2–3 sources réelles ; injection de doublons/incohérences |
| Critère de sortie | Taux de quarantaine maîtrisé ; 100 % lineage ; export→réimport sans écart ; règle « note validée non écrasée » vérifiée ; couverture connecteurs ≥ 80 % |

### O.3.10 Tests d'accessibilité et i18n
| | |
|---|---|
| Cible | Contraste AA, navigation clavier, information non portée par la couleur seule ; **lint i18n** (0 chaîne codée en dur), couverture de traduction FR/EN = 100 % |
| Quand | En continu (CI) + revue à chaque release |

### O.3.11 Tests de continuité (sauvegarde/restauration, PRA)
| | |
|---|---|
| Cible | RPO/RTO, restauration par établissement, scénarios de sinistre |
| Méthode | Test de restauration **mensuel** ; exercice PRA avant généralisation |

## O.4 Environnements et données

| Environnement | Tests |
|---|---|
| Développement | Unitaires, intégration rapides |
| Intégration/Test | Intégration, système, données, i18n/accessibilité, OCR (jeux de référence) |
| Pré-production | Performance, sécurité (intrusion), recette utilisateurs, interopérabilité (sources réelles), continuité |
| Production | Surveillance continue des métriques OCR, synchro, disponibilité ; tests de restauration |

Données : jeux pseudonymisés issus des POC et des établissements pilotes ; jeux synthétiques pour
les cas limites ; référentiel minimal réel pour l'orientation.

## O.5 Gestion des anomalies

- Sévérités : bloquante / majeure / mineure / cosmétique.
- Cycle : détection → qualification → correction → vérification → clôture.
- **Critère de recette (J9)** : 0 anomalie **bloquante** ouverte ; anomalies majeures avec plan de
  traitement accepté.

## O.6 Rôles

| Rôle | Responsabilité |
|---|---|
| QA Engineer | Stratégie, plans, automatisation, coordination de la recette |
| Développeurs | Tests unitaires et d'intégration de leur code |
| Cybersecurity Architect | Tests de sécurité et d'intrusion |
| Expert OCR/CV + AI/ML | Jeux et métriques OCR, non-régression des modèles |
| Expert interopérabilité + Data Architect | Tests d'interopérabilité et de données |
| DevOps | Tests de performance, de continuité, tuyauterie CI/CD |
| Utilisateurs métier | Recette (UAT) |

## O.7 Livrables (Phases 7 & 9)

Stratégie de test (ce document) · plans détaillés par type · jeux de données de test · matrice de
couverture exigences → tests · rapports d'exécution par type · registre d'anomalies · **PV de
recette** (J9).
