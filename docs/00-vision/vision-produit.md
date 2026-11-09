# A. Vision produit — BuildNote

> **Statut : En revue — Couche 1.** Date : 2026-09-08.

## A.1 Vision

> **Faire de chaque donnée scolaire une donnée fiable, et de chaque décision d'orientation une
> décision éclairée, expliquée et alignée sur l'avenir du pays.**

BuildNote ambitionne de devenir l'infrastructure de confiance de la donnée académique et de
l'aide à l'orientation dans les établissements camerounais — écoles primaires (publiques et privées)
et établissements secondaires (collèges et lycées d'enseignement général et technique) — puis, par
conception, dans d'autres pays africains partageant les mêmes contraintes (systèmes d'information
hétérogènes, connectivité limitée, ressources contraintes, bilinguisme ou plurilinguisme).

## A.2 Mission

1. **Libérer la donnée académique** aujourd'hui bloquée sur papier ou éparpillée dans des tableurs
   et applications non communicantes, en la capturant simplement (photo/vidéo d'une fiche) et en la
   structurant automatiquement — **sans jamais faire aveuglément confiance à la reconnaissance
   automatique** : une vérification humaine est toujours exigée avant enregistrement.
2. **Interconnecter les systèmes existants** via une architecture professionnelle (modèle canonique,
   connecteurs, mapping, ETL, contrôle qualité) plutôt qu'une improbable « compatibilité universelle ».
3. **Outiller l'orientation** en croisant le parcours réel de l'élève, ses aspirations, l'avis de
   ses parents, l'offre de formation accessible, les débouchés professionnels et les **besoins
   stratégiques de développement du Cameroun**, pour produire des **recommandations explicables**.
4. **Rester un outil d'aide à la décision** : BuildNote éclaire, hiérarchise, explique — il n'impose
   aucune filière ni aucune carrière.

## A.3 Proposition de valeur

### Pour l'établissement
- Un patrimoine de données académiques **fiable, historisé, exploitable**, quel que soit son
  système d'information de départ (ou son absence).
- Des **tableaux de bord de situation** (les meilleurs élèves d'une matière, l'évolution d'une
  classe, les profils remarquables) rafraîchis **à la demande**, sans dépendre d'une saisie parfaite
  en continu.
- Une **interopérabilité** qui évite le remplacement brutal de l'existant.

### Pour l'enseignant
- La saisie des notes passe de la **recopie manuelle** à la **vérification assistée** : BuildNote
  pré-remplit, l'enseignant corrige et valide.
- Un **gain de temps** mesurable et une **réduction des erreurs de report**.

### Pour l'élève / l'étudiant et sa famille
- Une **orientation argumentée aux 3 paliers charnières** :
  - **Palier 1 (Fin de primaire — CM2 / Class 6)** : éclairer le choix de la voie secondaire (enseignement général en 6e vs enseignement technique/professionnel en 1re année).
  - **Palier 2 (Fin de 1er cycle secondaire — 3ème / 4ème année technique / Form 5)** : orienter vers la filière/série adaptée pour le second cycle (séries générales A, C, D, TI vs séries techniques F1–F4, SES, FIG...).
  - **Palier 3 (Fin de 2nd cycle secondaire — Terminale / Upper Sixth)** : proposer la meilleure trajectoire post-baccalauréat (universités, grandes écoles sur concours, BTS, filières courtes).
- Pas seulement « ta moyenne te permet telle filière », mais un **dossier explicable** reliant résultats, compétences, intérêts, aspirations, avis parental, formations accessibles près de chez soi, métiers et perspectives.
- La **décision reste à la famille et au conseiller**.

### Pour le système éducatif et le pays
- Une **vision agrégée** des compétences qui se forment, filière par filière, territoire par
  territoire.
- Un **rapprochement** entre les profils formés et les **besoins stratégiques nationaux**.

### Différenciateurs
| Différenciateur | Explication |
|---|---|
| Vérification humaine **par conception** | L'OCR ne déclenche jamais un enregistrement automatique. |
| Séparation stricte des deux modules | L'orientation ne perturbe pas la gestion des notes, et inversement. |
| Interopérabilité **par modèle canonique** | Pas de promesse irréaliste de « compatibilité toutes bases ». |
| Dimension **stratégique nationale** explicable | L'intérêt collectif est un critère *pondéré et transparent*, pas une contrainte cachée. |
| Conçu pour la **faible connectivité** | Module 1 utilisable hors-ligne, synchronisation différée. |
| **Bilingue FR/EN** dès l'accueil | Sélecteur de langue sur l'écran d'accueil ; i18n de bout en bout. |

## A.4 Objectifs

### Objectifs produit (qualitatifs)
- O1 — Rendre la capture d'une fiche de notes **plus rapide et plus sûre** que la saisie manuelle.
- O2 — Permettre l'intégration d'un établissement **quel que soit** son SGBD ou son absence de SI.
- O3 — Produire des dossiers d'orientation **explicables et contestables**.
- O4 — Garantir l'**isolation** des données entre établissements.
- O5 — Fonctionner en **environnement dégradé** (réseau faible, matériel modeste).

### Objectifs mesurables (cibles à confirmer en Phase 3 — Spécification)
> Ces valeurs sont des **hypothèses de cadrage** à valider avec les POC et le pilote.

| KPI | Cible indicative | Mesuré à partir de |
|---|---|---|
| Temps de saisie d'une fiche (30 élèves, imprimée) | ≤ 40 % du temps de saisie manuelle | Pilote |
| Taux de champs pré-remplis corrects (imprimé) | ≥ 90 % | POC OCR |
| Taux de champs pré-remplis corrects (manuscrit lisible) | ≥ 70 % | POC OCR |
| Taux d'erreur résiduel après validation humaine | ≤ 0,5 % des notes | Pilote |
| Établissements intégrés sans développement spécifique de connecteur | ≥ 80 % via connecteurs génériques + CSV/Excel | Phase 8-10 |
| Dossiers d'orientation jugés « compréhensibles » par les familles | ≥ 80 % | Pilote |
| Disponibilité du service (hors coupures réseau locales) | ≥ 99 % | Exploitation |

### Non-objectifs (hors périmètre explicite)
- BuildNote **n'est pas** un logiciel de gestion de scolarité complet (emploi du temps, finances,
  inscriptions) — il peut s'y **interconnecter**.
- BuildNote **ne délivre pas** de diplôme et **ne se substitue pas** aux décisions des conseils de
  classe ou d'orientation.
- BuildNote **ne fait pas** de conseil d'investissement ni de placement des élèves à l'insu des
  familles.
- Pas de **MVP** au sens « version jetable » : la V1 est la solution de production (voir le risque
  associé et la recommandation de pilote progressif).

## A.5 Utilisateurs cibles

| Persona (esquisse — détail en Phase 1) | Besoins principaux | Module |
|---|---|---|
| **Enseignant** | Saisir/valider vite les notes, corriger les erreurs de reconnaissance, consulter ses classes | 1 |
| **Responsable pédagogique / surveillant général** | Suivre la situation d'une classe, d'un niveau, d'une matière ; fiabilité des données | 1 & 2 (dashboard) |
| **Conseiller d'orientation** | Construire un dossier d'orientation argumenté, comparer des scénarios | 2 |
| **Chef d'établissement** | Vision d'ensemble, pilotage, reddition de comptes, sécurité des données | 1 & 2 |
| **Administrateur informatique de l'établissement** | Connecter/importer depuis le SI existant, gérer les comptes, sauvegardes | Socle & interopérabilité |
| **Élève / étudiant** | Comprendre les recommandations, exprimer ses aspirations | 2 |
| **Parent / tuteur** | Donner son avis, comprendre l'orientation proposée | 2 |
| **Administrateur BuildNote (éditeur)** | Exploiter la plateforme, superviser, maintenir les référentiels | Socle |
| **Gestionnaire du référentiel stratégique national** | Tenir à jour secteurs prioritaires, besoins en compétences, sources | 2 |

## A.6 Parties prenantes

| Partie prenante | Intérêt / rôle | Influence |
|---|---|---|
| **Porteur du projet (initiative privée)** | Vision, financement, arbitrages, propriété | Décisionnaire |
| **Établissements pilotes puis adhérents** | Utilisateurs, fournisseurs de données, prescripteurs | Forte |
| **Enseignants et personnels** | Adoption au quotidien, qualité de la donnée | Forte |
| **Élèves et familles** | Bénéficiaires de l'orientation, sujets des données | Moyenne, essentielle éthiquement |
| **Conseillers d'orientation** | Utilisateurs experts du Module 2 | Moyenne |
| **Autorités éducatives (MINEDUB, MINESEC, MINESUP)** | Cadre réglementaire, adoption institutionnelle future | Externe, potentiellement forte |
| **Autorité de protection des données / cadre légal** | Conformité (données de mineurs, N° 2010/012) | Contrainte |
| **Fournisseurs technologiques (cloud, OCR/IA, hébergement)** | Briques techniques, coûts récurrents, souveraineté | Moyenne |
| **Sources du référentiel stratégique** (INS, MINEPAT/SND30, ONEFOP, observatoires sectoriels…) | Données stratégiques nationales | Externe |
| **Financeurs / partenaires éventuels** | Pérennité économique | Variable |
| **Équipe projet (produit, archi, data, IA, OCR, UX, sécurité, QA, DevOps)** | Conception et réalisation | Forte |

> Cartographie détaillée (pouvoir/intérêt, plan d'engagement) : Phase 0 —
> [`01-project-management/`](../01-project-management/).

## A.7 Principes directeurs

1. **Humain dans la boucle** partout où une donnée ou une recommandation engage une personne.
2. **Séparation des préoccupations** : deux modules, un socle, des contrats explicites.
3. **La donnée dérivée n'est jamais une source** : l'Intelligence Data se recalcule.
4. **Interopérer plutôt que remplacer.**
5. **Explicable par défaut** : toute recommandation d'orientation est justifiable.
6. **Sobriété** : fonctionner sur réseau faible et matériel modeste.
7. **Souveraineté et minimisation** des données personnelles.
8. **Évolutivité multi-pays** : rien de spécifiquement câblé au Cameroun sans point d'extension.
9. **Aucune techno n'est imposée a priori** : les choix sont justifiés après faisabilité et POC.
