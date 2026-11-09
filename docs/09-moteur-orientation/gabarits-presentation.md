# J. Moteur d'orientation — Gabarits de présentation (FR/EN)

> **Statut : En revue — Couche 5.** Date : 2026-09-09.
> Spécifie **comment les résultats sont présentés** : dossier d'orientation, carte de scénario,
> blocs d'explication, rendu du dashboard, export. Complète
> [`architecture-detaillee.md`](architecture-detaillee.md) §J.3.6–J.3.7 (génération) et §J.4
> (dashboard). Le rendu à l'écran relève de
> [`../11-ux-ui/architecture-ux-ui.md`](../11-ux-ui/architecture-ux-ui.md) §L.5.4–L.5.5 ; ce
> document fixe le **contenu, l'ordre et la formulation**.

## J.P.1 Règles de formulation (transverses)

| Règle | Application |
|---|---|
| **Aide à la décision, jamais prescription** (`EF-M2-26`) | Vocabulaire autorisé : « scénario », « piste », « à explorer », « sous condition ». **Proscrits** : « impossible », « vous devez », « affecté à », « recalé », « interdit ». Contrôle de sortie : toute chaîne générée passe un filtre lexical avant assemblage. |
| **Explicabilité** (`EF-M2-18`) | Aucune valeur affichée sans son origine (donnée source + fraîcheur) ni sa contribution au score. |
| **Bilinguisme strict** (`EF-SOC-02`, `ENF-I18N-02`) | Un dossier est rendu **dans une seule langue** (FR **ou** EN), choisie à la génération ou à l'export. FR et EN produisent un contenu équivalent, pas une traduction automatique à la volée. |
| **Lisible par une famille non spécialiste** (`ENF-UX-06`) | Phrases courtes, une idée par ligne, pas de jargon statistique (« régularité » et non « écart-type »), unités explicitées. |
| **Neutralité du référentiel national** (`EF-M2-19`) | La catégorie « besoins stratégiques nationaux » est présentée **comme les cinq autres** : même format, même visibilité, jamais mise en avant ni masquée. |
| **Proportionnalité de l'avertissement** (`EF-M2-21`) | Le ton de l'avertissement de fiabilité suit le niveau (voir §J.P.6), sans dramatiser ni minimiser. |

## J.P.2 Génération de texte — gabarits paramétrés, pas de boîte noire

- Chaque phrase d'explication provient d'un **gabarit nommé** avec emplacements typés, décliné
  **FR et EN**. Exemple :
  - `facteur.aspiration.metier_couvert` →
    FR : « Métiers visés par l'élève ({metiers}) : cohérents avec cette filière — contribution {contribution:+0.2f}. »
    EN : « Careers the student is aiming for ({metiers}): consistent with this pathway — contribution {contribution:+0.2f}. »
- Les **libellés métier** (filières, formations, métiers, secteurs) viennent des colonnes `_fr` /
  `_en` des référentiels (MPD §G.3) ou de la table `traduction` ; ils ne sont jamais reconstruits.
- Le **catalogue de gabarits** est versionné et revu (revue linguistique FR + EN). Le numéro de
  version du catalogue est journalisé avec le dossier.
- **Aucun modèle génératif** n'écrit le texte du dossier. Si un composant d'apprentissage estime un
  sous-critère, il fournit une **valeur + une contribution** ; la phrase reste produite par gabarit.

## J.P.3 Gabarit du dossier d'orientation

Ordre **fixe**. Le dossier est l'objet `dossier_orientation_version` (§G.2.4).

| # | Section | Contenu | Réf. |
|---|---|---|---|
| 1 | **En-tête** | Élève (nom, classe, établissement), date de génération, conseiller déclencheur, **niveau de fiabilité** (badge + phrase), **versions** citées : référentiel national, jeu de pondérations, identifiant d'instantané. | `EF-M2-22`, `EF-M2-44` |
| 2 | **Synthèse** | 3 à 5 lignes : profil académique en une phrase (domaines forts, style régulier/irrégulier), 2–3 pistes de tête nommées, rappel « document d'aide à la décision, la décision revient au conseil d'orientation et à la famille ». | `EF-M2-16` |
| 3 | **Scénarios classés** | Liste ordonnée du plus au moins recommandé — une **carte** par scénario (§J.P.4). | `EF-M2-16` |
| 4 | **Explication par scénario** | Les 5 blocs (§J.P.5), repliés par défaut sous chaque carte, dépliables. | `EF-M2-18` |
| 5 | **Alternatives écartées** | Tableau transverse : filière/scénario, raison (score plus faible / prérequis non atteint / éloignement / capacité), score obtenu. Une option « sous condition » n'est **pas** une alternative écartée : elle reste dans la liste 3 avec son badge. | `EF-M2-17` |
| 6 | **Zones d'incertitude** | Données manquantes + effet sur la fiabilité + **invitation ciblée à compléter** (questionnaire élève, avis parent, historique). | `EF-M2-21` |
| 7 | **Contester / réviser** | Comment demander une régénération (données complétées, pondérations réajustées dans les bornes), qui peut le faire, conservation de l'historique des versions. | `EF-M2-24` |
| — | **Pied de page** | Version du référentiel national + **ancienneté médiane** des données mobilisées ; horodatage de l'instantané ; catalogue de gabarits `vN`. | `EF-M2-44` |

### Bilingue

Le dossier est généré en FR ou EN d'un bout à l'autre. L'export dans l'autre langue **régénère**
depuis les mêmes données/versions (résultat identique, texte dans l'autre langue) — il ne traduit
pas le PDF.

## J.P.4 Anatomie d'une carte de scénario

```
┌───────────────────────────────────────────────────────────────┐
│ Rang 2 · [■■■■■■■□□□] score relatif                            │
│ Filière : Série C (sciences)                                   │
│   Formations : Licence Maths-Info · Licence Physique           │
│   Établissements : Lycée de Japoma (3 km) · … (12 km, internat)│
│   Métiers ouverts : ingénieur data · enseignant · …           │
│ Badges : [sous condition : maths] [métier en tension]         │
└───────────────────────────────────────────────────────────────┘
```

- **Score** affiché en **barre relative** avec l'échelle indiquée (« score relatif entre scénarios,
  0–100 »), **jamais un nombre nu isolé**. Le score n'est pas une probabilité de réussite.
- **Chaîne** `filière → formations → établissements → métiers` toujours dans cet ordre.
- **Établissement** : nom + **distance** à l'élève (`EF-M2-13`) + mention internat si pertinent +
  indication de sélectivité / probabilité d'accès quand elle existe (`EF-M2-17`).
- **Badges** possibles : `sous condition (<prérequis>)`, `offre éloignée (<distance>)`,
  `capacité limitée`, `métier en tension`, `secteur prioritaire`. Les deux derniers correspondent à
  la catégorie « besoins nationaux » et sont **informatifs**, pas valorisants.

## J.P.5 Les 5 blocs d'explication (`EF-M2-18`)

### 1 · Facteurs déterminants
Liste triée par **valeur absolue de contribution décroissante**. Une ligne =
`libellé en langage naturel` + `contribution signée` (`+0,18` / `−0,07`).
Regroupée visuellement par catégorie mais **triée globalement**.

### 2 · Données utilisées
| Donnée | Source | Fraîcheur | Fiabilité |
|---|---|---|---|
| Notes validées (24) | Normalized — saisie établissement | dernière : 2026-06-14 | élevée |
| Aspirations élève | Questionnaire élève | 2026-05-02 | déclarative |
| Avis des parents | — | absent | — |
| Métiers en tension | Référentiel national `v2026-03` | publication 2026-03 | sourcée (SND30) |

### 3 · Alternatives écartées
Reprend la section 5 du dossier filtrée sur le scénario courant : chaque option de rang inférieur
liée, avec **la raison** (score, prérequis, distance, capacité) et le score.

### 4 · Zones d'incertitude
Phrases gabarit, une par manque :
« Avis des parents non renseigné : la catégorie correspondante est **neutralisée** (poids
redistribué proportionnellement), la fiabilité globale passe à *moyenne*. »
« Historique court (1 année scolaire) : les tendances de performance sont indicatives. »

### 5 · Répartition du score
- **6 catégories** : profil élève · aspirations · avis parents · offre & faisabilité ·
  perspectives professionnelles · besoins stratégiques nationaux.
- Rendu : **barres empilées horizontales à 100 %** (ou histogramme court), **avec les valeurs
  numériques affichées à côté du graphe** — le graphe n'est jamais la seule source d'information
  (`ENF-UX-06`, accessibilité).
- Une catégorie **neutralisée** (donnée absente) est montrée à 0 % avec la mention « neutralisée ».
- La part « besoins nationaux » est un segment identique aux autres.

## J.P.6 Avertissement de fiabilité — présentation graduée (`EF-M2-21`)

| Niveau | Déclencheurs typiques | Formulation (FR) | Effet visuel |
|---|---|---|---|
| **Élevée** | Notes validées suffisantes + historique ≥ 2 ans + intérêts/aspirations renseignés | « Dossier établi sur des données complètes et récentes. » | Badge discret. |
| **Moyenne** | Une catégorie clé absente (avis parents **ou** aspirations) **ou** historique = 1 an | « Certaines informations manquent ({liste}). Les recommandations restent exploitables ; les compléter les affinera. » | Bandeau neutre + lien « compléter ». |
| **À consolider** | Deux catégories clés absentes **ou** moins de ~8 notes validées **ou** historique < 1 an | « Données insuffisantes pour un dossier robuste. À utiliser comme point de départ d'entretien uniquement. » | Bandeau appuyé, non bloquant. |

- L'avertissement est **toujours non bloquant** : le dossier est produit dans tous les cas où le
  consentement existe.
- Il n'emploie **jamais** de vocabulaire d'échec visant l'élève ; il qualifie les **données**, pas
  la personne.

## J.P.7 Rendu du dashboard de situation (`EF-M2-01`–`EF-M2-06`)

### Bandeau permanent
`Données au JJ/MM/AAAA à HH:MM · couverture : {n} classes · {m} élèves · {p} % de notes validées ·
[ Rafraîchir ]`
Aucun rafraîchissement automatique ; entre deux clics, la date affichée ne bouge pas (`EF-M2-02`,
`EF-M2-03`).

### Formats par type d'indicateur
| Indicateur | Rendu | Règles |
|---|---|---|
| **Classement (top N)** | Tableau : rang, élève/classe, valeur, effectif pris en compte. | Ex æquo explicites (« rang 3 = 2 élèves »). Périmètre rappelé en titre. |
| **Évolution dans le temps** | Courbe : période en abscisse, valeur en ordonnée. | Points de rupture annotés ; nombre d'observations par point accessible. |
| **Comparaison entre classes / niveaux** | Barres. | Même échelle pour toutes les barres ; effectifs affichés. |
| **Régularité d'un élève** | Indicateur + mini-série. | Terme « régularité » (pas « variance ») ; légende « plus la valeur est élevée, plus les résultats sont stables ». |
| **Indicateur non disponible** | Ligne « Non disponible » + raison. | Aucune estimation de substitution (`EF-M2-05`) ; on nomme la donnée manquante (« aucune donnée EPS pour ce périmètre »). |

### Export
FR ou EN (`EF-M2-06`), même contenu que l'écran, avec le bandeau de date/couverture reporté en
en-tête.

## J.P.8 Export du dossier pour l'entretien famille (`EF-M2-23`)

- **PDF paginé**, une seule langue, mise en page sobre (palette bleu clair / orange / blanc).
- Contient : synthèse, cartes de scénario, graphe de répartition du score, avertissement de
  fiabilité, alternatives écartées, chemin de contestation.
- **Pied de chaque page** : « Aide à la décision — ne vaut pas décision d'affectation » +
  version du référentiel national + date de l'instantané.
- Les explications repliées à l'écran sont **dépliées** dans le PDF (document autoportant).

## J.P.9 Accessibilité & i18n

- Tout graphe est doublé de ses valeurs textuelles (`ENF-UX-06`).
- Aucune information portée par la seule couleur (badges = icône + texte).
- 100 % des chaînes externalisées (`ENF-I18N-01`) ; formats de date/nombre par paramétrage de
  langue (`ENF-I18N-04`) ; ajout d'une 3ᵉ langue = nouveau jeu de gabarits, sans refonte
  (`ENF-I18N-03`).

## J.P.10 Lien avec le POC 4

Le [POC moteur d'orientation](../12-poc/README.md) teste explicitement la **complétude et la
clarté des explications** et la **compréhension par des familles** (`ENF-UX-06`) : les gabarits de
ce document sont le matériau évalué.
