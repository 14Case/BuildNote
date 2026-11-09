# D. Contraintes, critères d'acceptation, KPI, traçabilité — BuildNote

> **Statut : En revue — Couche 3.** Date : 2026-09-08.

## D.1 Contraintes

### D.1.1 Contraintes réglementaires et éthiques
| ID | Contrainte |
|---|---|
| C-REG-01 | Conformité à la loi camerounaise N° 2010/012 et aux textes applicables sur les données personnelles et le secteur éducatif. |
| C-REG-02 | Traitement de données de **mineurs** : base légale, consentement parental, minimisation, durées de conservation justifiées. |
| C-REG-03 | Souveraineté : la localisation des données suit la décision #1 (Phase 2). |
| C-REG-04 | Le système est un **outil d'aide à la décision** ; il ne prend aucune décision d'affectation automatique. |
| C-REG-05 | Non-discrimination : pas d'usage de critères sensibles prohibés dans le moteur d'orientation. |
| C-REG-06 | Anticipation d'un socle type RGPD pour l'extension multi-pays. |

### D.1.2 Contraintes techniques et opérationnelles
| ID | Contrainte |
|---|---|
| C-TEC-01 | Fonctionnement en **faible connectivité** et sur **matériel modeste**. |
| C-TEC-02 | Interopérabilité avec des SI hétérogènes ou inexistants, **sans** solution de « compatibilité SQL universelle ». |
| C-TEC-03 | Aucune technologie imposée a priori ; choix justifiés après faisabilité et POC. |
| C-TEC-04 | Pas de dépendance forte à un fournisseur unique (OCR/IA, SGBD, cloud) sans stratégie de sortie. |
| C-TEC-05 | Deux modules **séparés** partageant un socle, via contrats explicites. |
| C-TEC-06 | i18n FR/EN de bout en bout, extensible. |

### D.1.3 Contraintes projet
| ID | Contrainte |
|---|---|
| C-PRJ-01 | Aucune ligne de code avant la porte de décision de construction (J7). |
| C-PRJ-02 | Initiative privée, sans tutelle ministérielle actuelle : adoption fondée sur la valeur démontrée. |
| C-PRJ-03 | Financement par jalons ; chaque phase engagée après la porte précédente. |
| C-PRJ-04 | Pas de MVP jetable ; V1 = solution de production, avec pilote progressif (1 établissement d'abord). |
| C-PRJ-05 | Documentation = source de vérité, versionnée, revue. |

## D.2 Critères d'acceptation (par exigence clé)

> Format : chaque critère est vérifiable par un test. Les identifiants renvoient aux exigences
> fonctionnelles ([`exigences-fonctionnelles.md`](exigences-fonctionnelles.md)) et non fonctionnelles
> ([`exigences-non-fonctionnelles.md`](exigences-non-fonctionnelles.md)).

| Exigence | Critères d'acceptation |
|---|---|
| EF-SOC-01/02/03 | Sur l'écran d'accueil non authentifié, un sélecteur FR/EN est visible. Le changement bascule 100 % des textes de l'écran courant. Après reconnexion / réouverture, la langue choisie est conservée. Un export généré ensuite est dans la langue choisie. |
| EF-SOC-06 / EF-ADM-03 | Un utilisateur de l'établissement A, par tout moyen (UI, export, API, dashboard multi-établissements), ne peut obtenir aucune donnée de l'établissement B. Une tentative d'accès forcé est refusée (HTTP 403 ou équivalent) et journalisée comme alerte. Test d'isolation automatisé vert. |
| EF-M1-04/06/07 | Pour un jeu de fiches de référence, chaque cellule affiche un score de confiance. Les cellules sous le seuil sont visuellement distinctes et navigables en priorité. La zone d'image correspondant à une cellule s'ouvre en < 500 ms. |
| EF-M1-10/11/13 | Aucune écriture en Normalized Data n'est possible sans action de validation explicite. Un récapitulatif est présenté avant validation. Après validation, la note est en Normalized Data et l'image + l'extraction brute (scores, coordonnées) sont en Raw Data, liées par identifiant. |
| EF-M1-15/16 | En mode avion : capture, prétraitement, reconnaissance (au moins dégradée), correction et validation aboutissent ; l'enregistrement est mis en file. À la reconnexion, la synchronisation s'effectue ; en cas de doublon, une résolution est proposée sans écrasement. |
| EF-M1-19 / EF-M2-02 | Un test d'intégration vérifie qu'aucun événement « note enregistrée » ne déclenche de traitement du Module 2. Le dashboard n'affiche de nouvelles valeurs qu'après chargement ou rafraîchissement explicite, et affiche l'horodatage du calcul. |
| EF-M2-12/13/14/15 | Pour un élève de test, le dossier montre explicitement les catégories de données mobilisées, l'offre de formation accessible avec distances, les métiers associés, et la version datée du référentiel national. |
| EF-M2-18 | Chaque scénario du dossier comporte les 5 blocs d'explication (facteurs+poids, données+fraîcheur+fiabilité, alternatives+raison, incertitudes, répartition du score). Un scénario sans l'un des blocs est un échec. |
| EF-M2-19/26 | Aucune option n'est marquée « impossible » du seul fait du référentiel national. Aucune fonction ne réalise d'affectation. Vérifié par revue + test. |
| EF-M2-21 | En l'absence d'intérêts/aspirations/avis parents, le dossier porte un avertissement de fiabilité visible et une invitation à compléter. |
| EF-M2-25 | Un test vérifie qu'aucune génération de dossier n'écrit dans Normalized Data. |
| EF-IOP-01/06 | Une revue d'architecture confirme que le cœur n'accède qu'au canonique. Le POC 3 démontre l'import depuis ≥ 2 systèmes réels. |
| EF-IOP-06/08/09 | Un enregistrement non conforme apparaît en quarantaine avec motif. Chaque donnée canonique expose son lineage. Un import rejoué ne crée pas de doublon (compte d'enregistrements stable). |
| EF-IOP-11 / ENF-IOP-02 | Un export complet est produit pour un établissement de test, réimportable dans une instance vierge en reconstituant les mêmes entités. |
| ENF-UX-02 | Mesure au pilote : temps médian de traitement d'une fiche via BuildNote ≤ 40 % du temps médian de saisie manuelle équivalente. |
| ENF-SEC-03 | Test d'isolation multi-tenant automatisé exécuté à chaque release, résultat vert ; test d'intrusion sans faille critique avant mise en production. |
| ENF-I18N-01/02 | Le lint i18n ne détecte aucune chaîne codée en dur. La couverture de traduction FR et EN est de 100 % au moment de la release. |

## D.3 KPI — dictionnaire

> Chaque KPI : définition, formule, source de données, cible, fréquence, responsable.

### D.3.1 KPI produit — Module 1

| KPI | Définition | Formule | Source | Cible provisoire | Fréquence | Resp. |
|---|---|---|---|---|---|---|
| Taux de pré-remplissage correct (imprimé) | Part des cellules reconnues correctement avant correction, sur fiches imprimées | cellules correctes / cellules totales | jeu annoté / journal de corrections | ≥ 90 % | Par release + mensuel en prod | AI/OCR |
| Taux de pré-remplissage correct (manuscrit lisible) | Idem, fiches manuscrites lisibles | idem | idem | ≥ 70 % | idem | AI/OCR |
| Taux de correction post-OCR | Part des cellules modifiées par l'humain | cellules corrigées / cellules totales | journal de corrections | ≤ 10 % (imprimé) | Mensuel | Product |
| Taux d'erreur résiduel après validation | Part des notes erronées après validation humaine, détectées a posteriori | notes corrigées après enregistrement / notes enregistrées | UC-14 (corrections tracées), audits | ≤ 0,5 % | Trimestriel | QA |
| Temps de traitement d'une fiche | Durée capture → formulaire prérempli | horodatages | métriques applicatives | ≤ 20 s (en ligne) | Continu | DevOps |
| Temps de validation d'une fiche | Durée formulaire → validation | horodatages | métriques | ≤ 40 % du temps manuel | Pilote puis continu | Product |
| Taux de rapprochement élève automatique | Part des lignes rapprochées sans intervention | lignes auto-rapprochées / lignes totales | métriques | ≥ 90 % | Mensuel | AI/OCR |
| Taux de synchronisation réussie | Part des lots hors-ligne synchronisés sans intervention | lots synchronisés OK / lots créés hors-ligne | métriques | ≥ 98 % | Mensuel | DevOps |

### D.3.2 KPI produit — Module 2

| KPI | Définition | Formule | Source | Cible provisoire | Fréquence | Resp. |
|---|---|---|---|---|---|---|
| Complétude des données d'orientation | Part des dossiers générés avec intérêts + aspirations + avis parents renseignés | dossiers complets / dossiers générés | objets Module 2 | ≥ 70 % | Trimestriel | Conseiller / Product |
| Compréhension des recommandations | Part des familles déclarant comprendre le dossier | enquête | pilote puis enquêtes | ≥ 80 % | Semestriel | Product |
| Délai de génération d'un dossier | Durée déclenchement → dossier affiché | horodatages | métriques | ≤ 10 s | Continu | DevOps |
| Taux de contestation / révision | Part des dossiers révisés à la demande d'un utilisateur | dossiers révisés / dossiers générés | objets Module 2 | Suivi (pas de cible : indicateur d'usage) | Trimestriel | Product |
| Fraîcheur du référentiel national | Ancienneté médiane des entrées mobilisées | médiane(date du jour − date d'entrée) | référentiel | ≤ 24 mois | Semestriel | Gestionnaire référentiel |
| Écart de recommandation par profil (équité) | Comparaison des distributions de recommandations entre groupes, à profil académique comparable | analyse statistique | audit orientation | Pas d'écart significatif inexpliqué | Semestriel | Référent éthique |

### D.3.3 KPI interopérabilité & données

| KPI | Définition | Cible provisoire | Fréquence | Resp. |
|---|---|---|---|---|
| Taux de quarantaine à l'import | enregistrements en quarantaine / enregistrements traités | ≤ 5 % après stabilisation d'un mapping | Par import + mensuel | Admin SI |
| Taux de conflit | entités en conflit / entités traitées | ≤ 2 % | Mensuel | Admin SI |
| Complétude des données normalisées | champs obligatoires renseignés / attendus | ≥ 95 % | Mensuel | Data Architect |
| Couverture des établissements sans connecteur sur mesure | établissements intégrés via connecteurs génériques + CSV/Excel / total | ≥ 80 % | Par vague | Interop |
| Réussite de l'export de réversibilité | exports complets réimportables sans perte | 100 % | Par release | QA |

### D.3.4 KPI projet & exploitation

| KPI | Définition | Cible | Fréquence | Resp. |
|---|---|---|---|---|
| Respect des jalons | écart calendaire cumulé vs plan | ≤ 15 % | Par jalon | Dir. projet |
| Budget consommé vs engagé | consommé / engagé par phase | ≤ 100 % | Mensuel | Dir. projet |
| Couverture de tests (composants critiques) | lignes couvertes / lignes | ≥ 80 % | Par release | QA |
| Anomalies bloquantes ouvertes | nombre | 0 à la recette | Continu (Phase 8+) | QA |
| Disponibilité du service central | uptime mensuel | ≥ 99,0 % → 99,5 % | Mensuel | DevOps |
| Incidents de sécurité / cloisonnement | nombre | 0 | Continu | Cybersecurity |
| Délai de correction des vulnérabilités critiques | temps médian détection → correctif | ≤ 7 j | Mensuel | Cybersecurity |
| Adoption enseignants (pilote) | enseignants actifs / enseignants formés | ≥ 70 % | Mensuel (pilote) | Product |

## D.4 Matrice de traçabilité (extrait)

> La matrice complète est un artefact vivant maintenu en Phase 3 puis étendu en Phase 8 (colonne
> « éléments de backlog ») et Phase 9 (colonne « cas de test »).

| Besoin | Exigence(s) | Règle de gestion | Cas d'usage | KPI de contrôle | POC associé |
|---|---|---|---|---|---|
| B1-03 | EF-M1-04, EF-M1-06 | RG-01 | UC-01, UC-02 | Taux de pré-remplissage correct | POC 1 |
| B1-02 | EF-M1-03, EF-M1-17, EF-M1-18 | — | UC-01 | Structure reconstruite (POC) | POC 2 |
| B1-07 | EF-M1-10, EF-M1-11, EF-M1-13 | RG-01 | UC-01, UC-03 | Taux d'erreur résiduel | — |
| B1-11 | EF-M1-15, EF-M1-16 | — | UC-01 | Taux de synchronisation réussie | — |
| B2-01 | EF-M2-01, EF-M2-02, EF-M2-03 | RG-05, RG-06 | UC-06, UC-07 | Délai de calcul dashboard | POC 4 (partiel) |
| B2-15 | EF-M1-19, EF-M2-02 | RG-05 | UC-01, UC-06 | test d'intégration dédié | — |
| B2-08 | EF-M2-16, EF-M2-17 | RG-07 | UC-08 | Délai de génération | POC 4 |
| B2-09 | EF-M2-18, EF-M2-44 | RG-07 | UC-08, UC-11 | Compréhension des recommandations | POC 4 |
| B2-11 | EF-M2-15, EF-M2-19, EF-M2-40..44 | RG-08 | UC-08, UC-12 | Fraîcheur du référentiel ; équité | POC 4 |
| B0-01 | EF-SOC-01, EF-SOC-02, EF-SOC-03 | RG-12 | UC-14 | Couverture de traduction | — |
| B0-02 | EF-SOC-04..06, EF-ADM-01..03 | RG-09 | UC-13 | Incidents de cloisonnement | POC 3 (isolation) |
| B0-05..08 | EF-IOP-01..10 | RG-08, RG-10, RG-13 | UC-04 | Taux de quarantaine ; couverture connecteurs | POC 3 |
| B0-11 | EF-IOP-11, ENF-IOP-02 | RG-11 | UC-05 | Réussite export de réversibilité | POC 3 |
