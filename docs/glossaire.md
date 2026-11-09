# Glossaire — BuildNote

> **Statut : Vivant — ouvert en Couche 1.** Date : 2026-09-08.
> Terminologie française avec équivalents anglais (le produit est bilingue FR/EN).

## Métier — éducation & orientation

| Terme FR | Équivalent EN | Définition dans BuildNote |
|---|---|---|
| Établissement | School / Institution | Unité scolaire ou universitaire, tenant d'isolation des données. |
| Établissement primaire | Primary school | École primaire (publique ou privée, SIL au CM2 / Class 1 to Class 6), tenant d'isolation des données du primaire. |
| Établissement secondaire | Secondary school | Collège ou lycée (public ou privé, général, technique ou polyvalent), tenant d'isolation des données du secondaire. |
| Année scolaire | Academic year | Dimension temporelle de rattachement des classes, inscriptions et notes. |
| Classe | Class / Grade group | Groupe d'élèves suivant un programme sur une année scolaire. |
| Niveau | Level / Grade | Palier du cursus (ex. CM2, 3ᵉ, 4ᵉ année technique, Terminale). |
| Palier d'orientation | Orientation milestone / Transition tier | Étape charnière de décision d'orientation : Palier 1 (CM2/Class 6 → 6e générale ou 1re année technique) ; Palier 2 (3e/4e année/Form 5 → séries 2nd cycle) ; Palier 3 (Terminale/Upper Sixth → post-bac). |
| Matière | Subject | Discipline enseignée, associée à un coefficient. |
| Évaluation | Assessment | Contrôle, devoir, composition produisant des notes. |
| Note / Résultat | Grade / Mark / Result | Valeur chiffrée ou appréciation obtenue par un élève à une évaluation. |
| Barème | Grading scale | Échelle de notation (ex. /20, /100, mentions). |
| Fiche (de notes) | Grade sheet | Document physique saisi via le Module 1. |
| Bulletin | Report card | Synthèse périodique des résultats (BuildNote peut la fournir en données, pas l'éditer officiellement). |
| Conseiller d'orientation | Guidance counselor | Utilisateur expert du Module 2, superviseur humain des recommandations. |
| Orientation | Guidance / Academic & career guidance | Processus d'aide au choix de filière, formation, métier. |
| Filière | Track / Stream / Pathway | Voie d'études (ex. série scientifique, littéraire, professionnelle). |
| Formation | Programme / Course of study | Cursus menant à un diplôme ou une qualification. |
| Métier | Occupation / Job | Activité professionnelle cible, reliée à des compétences. |
| Compétence | Skill / Competency | Capacité détectée ou requise, reliée aux résultats, aux métiers et aux besoins nationaux. |
| Aspiration de l'élève | Student aspiration | Souhait exprimé par l'élève quant à son avenir. |
| Avis / ambition des parents | Parental input / expectation | Position de la famille, prise en compte comme critère pondéré. |
| Dossier d'orientation | Guidance report | Livrable explicable du Module 2 : scénarios scorés + explications. |
| Dashboard de situation | Situation dashboard | Vue de classements et d'insights par classe/établissement, rafraîchie à la demande. |
| Référentiel stratégique national | National strategic framework/repository | Base évolutive et sourcée des secteurs prioritaires, besoins en compétences, tendances du marché. |
| Établissement de référence | Reference institution | Établissement accessible offrant une filière donnée, selon la position géographique. |

## Technique — architecture & données

| Terme FR | Équivalent EN | Définition |
|---|---|---|
| Module 1 | Module 1 — Academic data capture & management | Capture et structuration des données académiques avec validation humaine. |
| Module 2 | Module 2 — Guidance | Dashboard de situation + moteur d'orientation individuel. |
| Socle commun | Common core / Shared platform | Identité, référentiels, stockage tri-strates, journalisation, i18n, bus d'événements. |
| Raw Data | Raw data | Strate des données originales immuables (images, fichiers, extractions brutes, sorties OCR). |
| Normalized Data | Normalized data | Strate canonique, seule source de vérité métier. |
| Intelligence Data | Intelligence data | Strate dérivée et recalculable (profils, tendances, recommandations, indicateurs). |
| Modèle canonique | Canonical model | Schéma pivot BuildNote vers lequel toute donnée externe est traduite. |
| Couche d'abstraction des données | Data abstraction layer | Isole le cœur BuildNote des schémas externes. |
| Connecteur / Adaptateur | Connector / Adapter | Composant reliant une source externe donnée au pipeline d'interopérabilité. |
| Mapping | Mapping | Correspondance déclarative champ source ↔ champ canonique (+ règles). |
| Normalisation | Normalization | Mise en cohérence des types, formats, unités, référentiels, doublons. |
| Validation | Validation | Contrôle de conformité au schéma canonique et aux règles métier. |
| Quarantaine | Quarantine | Zone d'isolement des données non conformes, en attente de revue. |
| Conflit (de données) | Data conflict | Divergence entre sources sur une même entité/champ ; résolu par règles de préséance ou revue. |
| Traçabilité / Lineage | Data lineage | Historique d'origine et de transformation de chaque donnée canonique. |
| Versioning de schéma | Schema versioning | Gestion des versions du modèle canonique et des migrations. |
| ETL | ETL (Extract-Transform-Load) | Orchestration des flux batch d'intégration. |
| Multi-tenant | Multi-tenancy | Hébergement de plusieurs établissements sur une même plateforme avec isolation. |
| Score de confiance | Confidence score | Indice de fiabilité d'une valeur reconnue par l'OCR/CV. |
| Document Understanding | Document understanding | Compréhension de la structure et du sens d'un document au-delà du texte brut. |
| Détection de tableaux | Table detection / extraction | Reconnaissance des lignes/colonnes/cellules d'un tableau dans une image. |
| CER / WER | CER / WER | Character / Word Error Rate — métriques de qualité de l'OCR. |
| Vérité terrain | Ground truth | Transcription/annotation de référence (validée par l'humain) contre laquelle on mesure les sorties d'un moteur. |
| Harnais de mesure | Evaluation harness | Outil (jetable, en POC) qui compare les prédictions à la vérité terrain et produit les métriques. |
| Exactitude cellule | Cell accuracy | Part de cellules dont la valeur reconnue est correcte, sur les cellules comparables. |
| Matrice de confusion | Confusion matrix | Tableau croisant valeurs attendues et prédites (ici : confusions entre chiffres). |
| Calibration (du score de confiance) | Confidence calibration | Adéquation entre le score annoncé et l'exactitude réellement observée (mesurée par l'ECE, courbe de fiabilité). |
| Accord inter-annotateur | Inter-annotator agreement | Degré de concordance entre deux annotateurs indépendants (ex. kappa de Cohen). |
| Pseudonymisation | Pseudonymization | Remplacement des identifiants directs par des valeurs fictives réversibles via une table conservée à part. |
| Magicien d'Oz | Wizard of Oz | Test où une fonction non développée (ici l'OCR) est simulée par un facilitateur, pour évaluer l'ergonomie en amont. |
| SUS / NASA-TLX | SUS / NASA-TLX | Questionnaires standard d'utilisabilité perçue (SUS) et de charge de travail perçue (NASA-TLX). |
| Explicabilité | Explainability (XAI) | Capacité à justifier une recommandation (facteurs, poids, alternatives, incertitudes). |
| Offline-first | Offline-first | Conception privilégiant le fonctionnement sans connexion, avec synchronisation différée. |
| i18n | i18n (internationalization) | Internationalisation : ici, bilinguisme FR/EN de bout en bout, extensible. |

## Gestion de projet

| Terme FR | Équivalent EN | Définition |
|---|---|---|
| Project Charter | Project charter | Document de cadrage fondateur (contexte, objectifs, périmètre, gouvernance, budget). |
| Jalon | Milestone | Point de contrôle marquant la fin d'une phase (J0 → J11). |
| Porte de décision (go/no-go) | Decision gate | Décision formelle de passer / itérer / arrêter à un jalon. |
| POC | PoC — Proof of Concept | Prototype jetable prouvant la faisabilité d'un point à risque. |
| MVP | MVP — Minimum Viable Product | Version minimale viable. **Non retenu** ici : la V1 est la solution de production, avec pilote progressif. |
| DPIA | DPIA — Data Protection Impact Assessment | Analyse d'impact relative à la protection des données. |
| ADR | ADR — Architecture Decision Record | Fiche traçant une décision d'architecture et sa justification. |
| RACI | RACI | Matrice Responsable / Approbateur / Consulté / Informé. |
| AS-IS / TO-BE | AS-IS / TO-BE | Processus actuel / processus cible. |
| Definition of Done | Definition of Done | Critères qu'un incrément doit satisfaire pour être considéré terminé. |
| Recette | Acceptance testing / UAT | Vérification formelle de conformité au cahier des charges par les utilisateurs. |

## Acronymes institutionnels (contexte camerounais)

| Acronyme | Signification | Rôle potentiel |
|---|---|---|
| MINEDUB | Ministère de l'Éducation de Base | Tutelle du primaire (adoption future). |
| MINESEC | Ministère des Enseignements Secondaires | Tutelle des collèges et lycées (adoption future). |
| MINESUP | Ministère de l'Enseignement Supérieur | Tutelle des universités (adoption future). |
| MINEPAT | Ministère de l'Économie, de la Planification et de l'Aménagement du Territoire | Source du référentiel stratégique (SND30). |
| SND30 | Stratégie Nationale de Développement 2020-2030 | Source stratégique majeure. |
| INS | Institut National de la Statistique | Source de données statistiques et de marché. |
| ONEFOP | Observatoire National de l'Emploi et de la Formation Professionnelle | Source sur les besoins en compétences et l'emploi. |

> Les rôles institutionnels sont indicatifs : BuildNote est une **initiative privée** ; ces entités
> sont des **sources** et de **futurs partenaires potentiels**, pas des tutelles actuelles.
