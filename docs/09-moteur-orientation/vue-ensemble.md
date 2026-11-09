# J. Moteur d'orientation — Vue d'ensemble

> **Statut : En revue — Couche 1.** Date : 2026-09-08.
> Architecture détaillée (sources, calcul du profil, moteur de règles + scoring, référentiel
> stratégique national, génération d'explications, garde-fous éthiques, gouvernance) en Couche 5.

## J.1 Principes fondateurs

1. **Indépendance du Module 1.** Le moteur ne se déclenche **jamais** automatiquement à
   l'enregistrement d'une note. Il fonctionne **à la demande**.
2. **Deux usages** : le **dashboard de situation** (classements/insights par classe et établissement,
   rafraîchis à la demande) et l'**orientation individuelle** (dossier explicable pour un élève).
3. **Aide à la décision, pas prescription.** Le moteur propose des scénarios hiérarchisés et
   argumentés ; il n'affecte personne à une filière ni à un métier.
4. **Explicabilité obligatoire.** Toute recommandation est justifiable, traçable et contestable.
5. **La dimension stratégique nationale est un critère pondéré et transparent**, pas une contrainte
   cachée : l'utilisateur voit sa part dans le score.

### J.1.1 Les 3 Paliers d'orientation charnières

Le moteur cible 3 moments clés de décision éducative :
- **Palier 1 (Fin de primaire — CM2 / Class 6)** : Propose la meilleure voie vers les études secondaires (Enseignement secondaire général en 6e/Form 1 vs Enseignement secondaire technique/professionnel en 1re année/Form 1 Technical).
- **Palier 2 (Fin de 1er cycle secondaire — 3ème / 4ème année technique / Form 5)** : Propose la série du second cycle (séries générales A, C, D, TI vs séries techniques F1–F4, SES, FIG...).
- **Palier 3 (Fin de 2nd cycle secondaire — Terminale / Upper Sixth)** : Propose la meilleure trajectoire post-baccalauréat (universités, filières technologiques, grandes écoles d'ingénieurs/médecine, BTS, IPES).

## J.2 Ce que le moteur combine

```mermaid
flowchart TB
    subgraph ELEVE["Côté élève"]
        A1["Parcours académique · résultats · matières · examens"]
        A2["Évolution des performances (tendances)"]
        A3["Compétences & aptitudes détectées"]
        A4["Intérêts & préférences (si disponibles)"]
        A5["Aspirations de l'élève"]
    end
    subgraph FAMILLE["Côté famille"]
        B1["Avis / ambition des parents"]
    end
    subgraph OFFRE["Offre & débouchés"]
        C1["Formations accessibles · filières"]
        C2["Établissements de référence accessibles\n(filières disponibles + position géographique)"]
        C3["Métiers associés · perspectives professionnelles"]
    end
    subgraph NATION["Stratégie nationale"]
        D1["Secteurs stratégiques · domaines prioritaires"]
        D2["Besoins en compétences · métiers en tension"]
        D3["Tendances et évolutions du marché"]
    end

    A1 & A2 & A3 & A4 & A5 --> PROF["Construction du PROFIL\n(Intelligence Data)"]
    PROF --> FUSION
    B1 --> FUSION
    C1 & C2 & C3 --> FUSION
    D1 & D2 & D3 --> FUSION
    FUSION["MOTEUR DE FUSION\nrègles + scoring pondéré multi-critères"] --> SCEN["Scénarios d'orientation scorés\n(filière → formations → établissements → métiers)"]
    SCEN --> XAI["GÉNÉRATEUR D'EXPLICATIONS"]
    XAI --> DOSSIER["DOSSIER D'ORIENTATION\n(FR/EN, exportable, contestable)"]
```

## J.3 Chaîne de traitement (orientation individuelle)

```mermaid
flowchart LR
    R["1. Demande d'orientation\n(déclenchée explicitement)"] --> G["2. Collecte de l'ensemble\ndes données pertinentes disponibles"]
    G --> P["3. Construction / rafraîchissement\ndu profil (Intelligence)"]
    P --> C["4. Génération des scénarios candidats\n(filières / formations / établissements / métiers)"]
    C --> S["5. Scoring pondéré multi-critères\n(profil · aspirations · avis parents · offre ·\ndébouchés · besoins nationaux)"]
    S --> F["6. Filtres de faisabilité\n(prérequis, géographie, capacité)"]
    F --> E["7. Génération des explications\n(facteurs, poids, alternatives, incertitudes)"]
    E --> D["8. Dossier d'orientation\n(revu par le conseiller, partagé à la famille)"]
```

## J.4 Architecture logique cible

```mermaid
flowchart TB
    subgraph SOURCES["Sources (lecture à la demande)"]
        NDB[("Normalized Data")]
        IDB[("Intelligence Data")]
        REFF["Référentiel offre de formation\n(filières, formations, établissements, géodonnées)"]
        REFM["Référentiel métiers\n(métiers, compétences, débouchés)"]
        REFN["Référentiel stratégique national\n(évolutif, sourcé, daté, versionné)"]
        SAISIE["Saisies : intérêts élève, aspirations, avis parents"]
    end

    subgraph MOTEUR["Moteur d'orientation"]
        PROFILER["Profileur\n(compétences, tendances, profil académique)"]
        CANDIDATS["Générateur de scénarios candidats"]
        SCORER["Scoreur pondéré\n(pondérations paramétrables + valeurs par défaut transparentes)"]
        RULES["Moteur de règles\n(prérequis, faisabilité, garde-fous éthiques)"]
        EXPLAINER["Générateur d'explications"]
    end

    SOURCES --> PROFILER --> CANDIDATS --> SCORER --> RULES --> EXPLAINER --> OUT["Dossier d'orientation"]
    REFN --> SCORER
    SAISIE --> SCORER
```

## J.5 Rendre les recommandations explicables

Chaque dossier d'orientation expose :

| Élément d'explication | Contenu |
|---|---|
| **Facteurs déterminants** | Les critères qui ont fait remonter chaque scénario, avec leur **poids** et leur **valeur** pour cet élève (ex. « aptitude scientifique : forte (poids 25 %) », « métier en tension au niveau national : oui (poids 15 %) »). |
| **Données utilisées** | Liste des données mobilisées, leur **source**, leur **fraîcheur** et un **indice de fiabilité** (ex. notes validées vs partiellement importées). |
| **Scénarios alternatifs** | Les options écartées et **pourquoi** (score plus faible, prérequis non atteint, éloignement géographique…). |
| **Zones d'incertitude** | Ce qui manque (pas d'intérêts renseignés, historique court, avis parents absent) et l'effet sur la fiabilité. |
| **Répartition du score** | Part respective de **profil élève**, **aspirations**, **avis parents**, **offre/faisabilité**, **débouchés**, **besoins nationaux**. |
| **Contestation** | Comment demander une révision, ajuster les pondérations, compléter les données. |

**Approche technique** (à confirmer en Couche 5) : privilégier un **modèle interprétable par
conception** (règles + scoring additif pondéré, type score-cards) plutôt qu'un modèle boîte noire.
Si des composants d'apprentissage sont introduits (ex. détection de compétences), ils sont
accompagnés de méthodes d'explication (contributions par facteur) et restent **sous supervision
humaine**.

## J.6 Référentiel stratégique national (évolutif)

- Représente : **secteurs stratégiques, métiers, compétences, formations, filières, besoins en
  compétences, domaines prioritaires, tendances et évolutions du marché, autres indicateurs
  pertinents**.
- **Chaque entrée est sourcée et datée** (référence à un document officiel, une étude, une
  statistique) et **versionnée**.
- **Sources candidates** (à valider en Phase 2) : Stratégie Nationale de Développement (SND30),
  Institut National de la Statistique (INS), MINEPAT, observatoires de l'emploi et de la formation
  (ex. ONEFOP), études sectorielles, partenaires. → Décision
  [`17-decisions/decisions-prealables.md`](../17-decisions/decisions-prealables.md) #5.
- **Gouvernance** : un rôle « gestionnaire du référentiel » ; processus de proposition → validation →
  publication ; fréquence de revue ; mention explicite de l'ancienneté d'une donnée.
- **Neutralité** : le référentiel **informe** le scoring, il ne **verrouille** aucune option. Un
  élève peut être orienté à l'encontre d'un « besoin national » si son profil et ses aspirations le
  justifient — l'explication le dira.

## J.7 Dashboard de situation (rappel)

- Répond à des questions concrètes : « le plus brillant en mathématiques du collège », « l'élève le
  plus athlétique de la classe de 5ᵉ », « les 5 meilleurs en philosophie de toutes les terminales du
  lycée de Japoma ».
- **Interroge les bases à la demande** (chargement ou rafraîchissement explicite) — pas de mise à
  jour déclenchée par la saisie des notes.
- Périmètres : élève, classe, niveau, matière, établissement, groupe d'établissements (dans le
  respect du cloisonnement).
- Les indicateurs « non académiques » (ex. « athlétique ») supposent des données correspondantes
  (EPS, observations) : leur disponibilité conditionne l'indicateur.

## J.8 Garde-fous éthiques (aperçu — détail Couche 5 & Couche 6)

- **Supervision humaine** systématique (conseiller d'orientation).
- **Non-discrimination** : audit régulier des recommandations par profil ; pas d'usage de critères
  sensibles interdits.
- **Transparence des pondérations** ; valeurs par défaut publiées.
- **Consentement** de l'élève et des parents pour l'usage des données du Module 2.
- **Droit de rectification** et de contestation.
- **Journalisation** de chaque dossier produit (pour audit).

## J.9 Ce qui vient en Couche 5

- Modèle de calcul du **profil** (compétences, tendances) et ses données d'entrée exactes.
- **Barème de scoring** : critères, échelles, pondérations par défaut, paramétrage autorisé.
- **Catalogue de règles** (prérequis, faisabilité, garde-fous).
- **Format du dossier d'orientation** et gabarits d'explication FR/EN.
- **Schéma de données** des référentiels offre / métiers / stratégique national.
- **Processus de gouvernance** du référentiel stratégique.
- Lien avec le **POC moteur d'orientation** (Couche 7).
