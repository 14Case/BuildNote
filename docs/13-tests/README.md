# O. Tests — À produire en Couche 7

> **Statut : À produire.** Stratégie définie avant la Phase 8 ; exécution en Phase 8 (continu) et
> Phase 9 (recette).

Types de tests prévus :

| Type | Objet | Quand |
|---|---|---|
| **Unitaires** | Logique de chaque composant isolé | En continu (Phase 8) |
| **Intégration** | Contrats entre composants et modules ; socle ↔ Module 1 ↔ interopérabilité | En continu |
| **Système** | Bout en bout, scénarios métier complets | Phase 8 fin de lot + Phase 9 |
| **OCR** | Jeux annotés ; métriques CER/WER, exactitude par cellule, taux de correction ; non-régression des modèles | Phase 8 + Phase 9 |
| **Données** | Qualité, migrations, non-régression du modèle canonique, idempotence des imports, dédoublonnage | Phase 8 + Phase 9 |
| **Sécurité** | Tests d'intrusion, revue de code sécurité, **tests d'isolation multi-tenant**, gestion des secrets | Phase 9 |
| **Performance** | Charge, volumétrie, **réseau dégradé / hors-ligne**, temps de validation d'une fiche, temps de calcul du dashboard | Phase 9 |
| **Utilisateurs (recette / UAT)** | Conformité au besoin, ergonomie, compréhension des dossiers d'orientation | Phase 9 |
| **Interopérabilité** | Connecteurs, mappings, gestion des conflits, quarantaine, lineage, réversibilité (export/réimport) | Phase 8 + Phase 9 |

Éléments à produire : stratégie de test, plans par type, jeux de données de test (dont données
réelles anonymisées), critères d'entrée/sortie, gestion des anomalies, modèle de PV de recette,
matrice de couverture exigences → tests (reliée à [`../03-cahier-des-charges/`](../03-cahier-des-charges/)).
