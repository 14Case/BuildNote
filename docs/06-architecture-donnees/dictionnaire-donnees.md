# G. Dictionnaire de données

> **Statut : En revue — Couche 4.** Date : 2026-09-09.
> Référence **unique au niveau champ** pour tout BuildNote. Complète le MLD
> ([`modele-conceptuel-logique-physique.md`](modele-conceptuel-logique-physique.md) §G.2).
> Le **schéma canonique d'échange** ([`../07-interoperabilite/architecture-detaillee.md`](../07-interoperabilite/architecture-detaillee.md) §H.1)
> **cite** ce dictionnaire et ne le duplique pas.
>
> **Gel prévu : J4** (fin de la conception détaillée). Jusque-là, document vivant.

---

## G-DIC.1 Mode d'emploi

Chaque entité est décrite par un tableau :

| Colonne | Signification |
|---|---|
| **Champ** | Nom logique du champ (le nom physique suit la casse `snake_case`). |
| **Type** | Type **logique** (indépendant du SGBD) : `uuid`, `texte`, `texte(n)`, `entier`, `décimal(p,s)`, `booléen`, `date`, `horodatage`, `enum(...)`, `json`, `réf(Entité)`. |
| **Oblig.** | `oui` / `non` / `conditionnel` (condition précisée). |
| **Valeurs / règle** | Domaine de valeurs, contrainte, valeur par défaut, règle de gestion. |
| **Sensibilité** | `—` · `PII` · `PII indirecte` · `PII sensible` (opinion, santé, mineur) · `secret`. |
| **Strate** | `Raw` · `Normalized` · `Reference` · `Intelligence` · `Socle`. |
| **Source** | Qui écrit : `Module 1` · `Import` · `Module 2 (saisie)` · `Calcul` · `Socle` · `Gestionnaire référentiel` · `Onboarding`. |

### G-DIC.1.1 Champs communs (non répétés dans chaque tableau)

Toutes les entités **métier** (Normalized, Module 2, Reference) portent :

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `id` | uuid | oui | Clé primaire technique opaque. Généré à la création. Jamais réutilisé. | — | (celle de l'entité) | (celle de l'entité) |
| `etablissement_id` | réf(Etablissement) | oui¹ | **Clé de tenant.** Non nul sur toute table de données métier. Filtre d'isolation systématique (`RG-09`). | — | idem | idem |
| `cree_le` | horodatage | oui | UTC. Immuable. | — | idem | idem |
| `modifie_le` | horodatage | oui | UTC. Mis à jour à chaque écriture réelle (pas si *upsert* sauté, cf. §H-ETL.4). | — | idem | idem |
| `cree_par` | réf(Utilisateur) \| texte | oui | Utilisateur humain **ou** identifiant de connecteur (`connecteur:<ref>`) **ou** `systeme`. | — | idem | idem |
| `modifie_par` | réf(Utilisateur) \| texte | oui | Idem `cree_par`. | — | idem | idem |
| `archive_le` | horodatage | non | Renseigné = **suppression logique**. Les entités archivées sont exclues par défaut des lectures métier. | — | idem | idem |

¹ Sauf `Etablissement` lui-même et les tables de référence **globales** non rattachées à un tenant
(voir §G-DIC.7). Dans le modèle « base par établissement » (décision #4), `etablissement_id` peut
être implicite (porté par la base) — le champ logique reste défini.

Les entités **Raw** portent `id`, `etablissement_id`, `cree_le`, `cree_par` mais **pas** de champs
de modification (immuables) ni `archive_le` (purge = pierre tombale, cf.
[`cycle-de-vie-stockage.md`](cycle-de-vie-stockage.md)).

Les entités **Socle** et **Intelligence** ont des conventions propres, précisées dans leurs sections.

### G-DIC.1.2 Types transverses normalisés

| Type nommé | Définition |
|---|---|
| `nom_normalise` | `texte`. Casse repliée, accents supprimés, espaces réduits à un seul, ordre `NOM prénoms` fixé, ponctuation retirée. Sert aux clés de rapprochement. |
| `code_langue` | `enum(fr, en, …)` — ISO 639-1. Extensible (décision #11). |
| `code_pays` | `texte(2)` — ISO 3166-1 alpha-2. `CM` par défaut. |
| `libelle_bilingue` | Couple `libelle_fr` / `libelle_en` (ou renvoi table `traduction` pour les contenus longs). |
| `horodatage` | Toujours **UTC** en stockage ; affichage dans le fuseau de l'établissement. |
| `contact` | `json` : `{ tel_e164?, email?, adresse? }`. Minimisé. PII. |

---

## G-DIC.2 Domaine « Structure & personnes » (Normalized)

### Etablissement

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `id` | uuid | oui | Racine du tenant. | — | Normalized | Onboarding |
| `code` | texte(16) | oui | Code établissement attribué à l'onboarding. Unique global. Clé de rapprochement primaire. | — | Normalized | Onboarding |
| `nom` | texte(200) | oui | Raison sociale / dénomination officielle. | — | Normalized | Onboarding |
| `type` | enum(primaire, college, lycee, superieur, mixte) | oui | Détermine les cycles/niveaux proposés par défaut. | — | Normalized | Onboarding |
| `secteur` | enum(public, prive, confessionnel, autre) | non | — | — | Normalized | Onboarding |
| `pays` | code_pays | oui | `CM` par défaut. | — | Normalized | Onboarding |
| `localisation_id` | réf(Localisation) | non | Coordonnées / région (géolocalisation Module 2). | — | Normalized | Onboarding |
| `langue_defaut` | code_langue | oui | `fr` ou `en`. UI par défaut de l'établissement. | — | Normalized | Onboarding |
| `contre_validation` | booléen | oui | Défaut `faux`. Si `vrai`, `EF-M1-12` (double validation) actif par défaut. | — | Normalized | Onboarding |
| `statut` | enum(onboarding, actif, suspendu, offboarding, archive) | oui | Cycle de vie du tenant. | — | Normalized | Socle |
| `fuseau` | texte | oui | Ex. `Africa/Douala`. Sert aux fenêtres de synchro et à l'affichage. | — | Normalized | Onboarding |

### Campus

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `libelle` | texte(120) | oui | Nom du site. | — | Normalized | Onboarding |
| `localisation_id` | réf(Localisation) | non | — | — | Normalized | Onboarding |
| `principal` | booléen | oui | Un seul campus principal par établissement. | — | Normalized | Onboarding |

### Cycle / Niveau

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `cycle.libelle_fr` / `libelle_en` | libelle_bilingue | oui | Ex. « Premier cycle » / « Lower secondary ». Paramétrable (systèmes éducatifs). | — | Normalized | Onboarding |
| `cycle.ordre` | entier | oui | Ordre d'affichage/progression. | — | Normalized | Onboarding |
| `niveau.cycle_id` | réf(Cycle) | oui | — | — | Normalized | Onboarding |
| `niveau.libelle_fr` / `libelle_en` | libelle_bilingue | oui | Ex. « 6e », « Terminale ». | — | Normalized | Onboarding |
| `niveau.code` | texte(16) | oui | Code court stable (`6E`, `TLE`) — cible des tables de valeurs d'import. | — | Normalized | Onboarding |
| `niveau.ordre` | entier | oui | — | — | Normalized | Onboarding |

### AnneeScolaire

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `libelle` | texte(9) | oui | Format `AAAA-AAAA` (ex. `2025-2026`). Unique par établissement. Clé de rapprochement. | — | Normalized | Onboarding / Import |
| `date_debut` | date | oui | Cohérente avec le calendrier du pays. `date_debut < date_fin`. | — | Normalized | Onboarding |
| `date_fin` | date | oui | — | — | Normalized | Onboarding |
| `active` | booléen | oui | Une seule année active par établissement à un instant donné. | — | Normalized | Socle |

### PeriodeScolaire

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `annee_scolaire_id` | réf(AnneeScolaire) | oui | — | — | Normalized | Onboarding |
| `libelle` | texte(40) | oui | Ex. « Trimestre 1 », « Semestre 2 ». | — | Normalized | Onboarding |
| `type` | enum(trimestre, semestre, sequence, autre) | oui | — | — | Normalized | Onboarding |
| `ordre` | entier | oui | 1..n dans l'année. | — | Normalized | Onboarding |
| `date_debut` / `date_fin` | date | oui | Incluses dans l'année scolaire. Sert au contrôle de cohérence temporelle des évaluations. | — | Normalized | Onboarding |

### Classe

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `annee_scolaire_id` | réf(AnneeScolaire) | oui | — | — | Normalized | Onboarding / Import |
| `niveau_id` | réf(Niveau) | oui | — | — | Normalized | Onboarding / Import |
| `campus_id` | réf(Campus) | non | — | — | Normalized | Onboarding |
| `libelle` | texte(60) | oui | Ex. « 2nde C ». | — | Normalized | Onboarding / Import |
| `libelle_normalise` | texte | oui | `upper` + espaces simples. Clé de rapprochement `(etab, annee, libelle_normalise)`. | — | Normalized | Calcul (dérivé à l'écriture) |
| `effectif` | entier | non | Effectif déclaré ; contrôle de cohérence avec le nombre d'inscriptions. | — | Normalized | Onboarding / Import |
| `enseignant_principal_id` | réf(Enseignant) | non | Professeur principal / titulaire. | — | Normalized | Onboarding |

### Personne

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `nom` | texte(120) | oui | Nom de famille. Conservé tel que saisi (casse d'origine). | PII | Normalized | Module 1 / Import |
| `prenoms` | texte(160) | non | Prénoms. | PII | Normalized | Module 1 / Import |
| `nom_normalise` | nom_normalise | oui | Dérivé. Clé de rapprochement (avec `date_naissance` + `etablissement`). | PII indirecte | Normalized | Calcul |
| `date_naissance` | date | conditionnel | Obligatoire pour `Eleve`. Date passée plausible (âge 2–100). Quarantaine si absente/incohérente. | PII sensible (mineur) | Normalized | Module 1 / Import |
| `lieu_naissance` | texte(120) | non | — | PII | Normalized | Import |
| `sexe` | enum(masculin, feminin, non_precise) | non | Table de valeurs à l'import (`M/F/G/1/2…`). | PII | Normalized | Module 1 / Import |
| `contact` | contact | non | Minimisé. Pour un mineur : coordonnées du responsable de préférence. | PII | Normalized | Module 2 / Import |
| `nationalite` | code_pays | non | — | PII | Normalized | Import |
| `photo_uri` | texte | non | Renvoi stockage objet. Non exporté hors réversibilité. Optionnel, minimisation. | PII sensible | Normalized | Onboarding |

### Eleve / Enseignant / ResponsableLegal (spécialisations de Personne)

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `eleve.id` | uuid | oui | = `personne_id` (héritage 1:1). | — | Normalized | Module 1 / Import |
| `eleve.matricule` | texte(32) | conditionnel | Matricule établissement. Si absent : `matricule_provisoire` `BN-<code>-<hash6>` (cf. exemples-mapping B). Clé de rapprochement secondaire. | PII indirecte | Normalized | Import / Onboarding |
| `eleve.code_national` | texte(32) | non | Identifiant national élève s'il existe. Clé de rapprochement **primaire** quand présent. | PII | Normalized | Import |
| `eleve.statut_scolaire` | enum(inscrit, sorti, diplome, exclu, transfere) | non | — | PII indirecte | Normalized | Import / Onboarding |
| `enseignant.id` | uuid | oui | = `personne_id`. | — | Normalized | Onboarding / Import |
| `enseignant.identifiant_interne` | texte(32) | non | Matricule enseignant. Clé de rapprochement. | PII indirecte | Normalized | Import / Onboarding |
| `enseignant.matieres` | json | non | Matières habituellement enseignées (aide au mapping). | — | Normalized | Onboarding |
| `responsable_legal.id` | uuid | oui | = `personne_id`. | — | Normalized | Module 2 / Import |
| `responsable_legal.profession` | texte(120) | non | Facultatif. Minimisation. | PII | Normalized | Module 2 |

### LienParente

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `eleve_id` | réf(Eleve) | oui | — | PII indirecte | Normalized | Module 2 / Import |
| `responsable_legal_id` | réf(ResponsableLegal) | oui | — | PII indirecte | Normalized | Module 2 / Import |
| `nature` | enum(pere, mere, tuteur, autre, non_precise) | oui | Table de valeurs à l'import. | PII | Normalized | Module 2 / Import |
| `autorite_parentale` | booléen | non | Détient l'autorité parentale (droit de consentement Module 2). | PII sensible | Normalized | Module 2 |
| `contact_prioritaire` | booléen | non | Contact à joindre en priorité. | PII | Normalized | Module 2 |

### Inscription

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `eleve_id` | réf(Eleve) | oui | — | PII indirecte | Normalized | Import / Onboarding |
| `classe_id` | réf(Classe) | oui | — | — | Normalized | Import / Onboarding |
| `annee_scolaire_id` | réf(AnneeScolaire) | oui | Redondant avec la classe mais matérialisé pour l'index/partition. Doit coïncider avec `classe.annee_scolaire_id`. | — | Normalized | Import / Onboarding |
| `date_inscription` | date | non | — | — | Normalized | Import |
| `statut` | enum(active, radiee, transferee, terminee) | oui | Défaut `active`. | PII indirecte | Normalized | Import / Onboarding |
| **Unicité** | — | — | `(eleve_id, classe_id, annee_scolaire_id)` unique. `(eleve_id, annee_scolaire_id)` unique si la règle « une classe par an » s'applique (paramétrable). | — | — | — |

### Matiere / Programme / Enseignement

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `matiere.libelle_fr` / `libelle_en` | libelle_bilingue | oui | — | — | Normalized | Onboarding / Import |
| `matiere.libelle_normalise` | texte | oui | Clé de rapprochement + table de synonymes (`MATHS→mathematiques`). | — | Normalized | Calcul |
| `matiere.domaine` | enum(sciences, lettres, langues, arts, sport, technique, autre) | non | Sert au moteur d'orientation. | — | Normalized | Onboarding |
| `matiere.code` | texte(16) | non | Code court stable. | — | Normalized | Onboarding |
| `programme.matiere_id` | réf(Matiere) | oui | — | — | Normalized | Onboarding |
| `programme.niveau_id` | réf(Niveau) | oui | — | — | Normalized | Onboarding |
| `programme.coefficient_defaut` | décimal(4,2) | oui | > 0. Valeur reprise par défaut dans `Enseignement`. | — | Normalized | Onboarding |
| `enseignement.classe_id` | réf(Classe) | oui | — | — | Normalized | Import / Onboarding |
| `enseignement.matiere_id` | réf(Matiere) | oui | — | — | Normalized | Import / Onboarding |
| `enseignement.enseignant_id` | réf(Enseignant) | non | Peut être inconnu à l'import. | — | Normalized | Import / Onboarding |
| `enseignement.programme_id` | réf(Programme) | non | — | — | Normalized | Onboarding |
| `enseignement.coefficient` | décimal(4,2) | oui | > 0. Défaut = `programme.coefficient_defaut`. | — | Normalized | Import / Onboarding |
| **Unicité enseignement** | — | — | `(classe_id, matiere_id)` unique par année (via la classe). | — | — | — |

### Bareme

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `type` | enum(sur_20, sur_10, sur_100, mention, personnalise) | oui | — | — | Normalized | Onboarding / Import |
| `min` | décimal(6,3) | oui | Généralement 0. | — | Normalized | Onboarding |
| `max` | décimal(6,3) | oui | `max > min`. Ex. 20. | — | Normalized | Onboarding |
| `pas` | décimal(5,3) | non | Ex. 0.25. Contrôle de granularité (avertissement, non bloquant). | — | Normalized | Onboarding |
| `mentions` | json | conditionnel | Requis si `type=mention` : liste ordonnée `[{code, libelle_fr, libelle_en, borne_min, borne_max}]`. | — | Normalized | Onboarding |

### Evaluation

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `enseignement_id` | réf(Enseignement) | oui | Si absent à l'import et mapping le permet : création. Sinon quarantaine `dependance_absente`. | — | Normalized | Module 1 / Import |
| `periode_scolaire_id` | réf(PeriodeScolaire) | oui | — | — | Normalized | Module 1 / Import |
| `bareme_id` | réf(Bareme) | oui | — | — | Normalized | Module 1 / Import |
| `type` | enum(devoir, composition, interrogation, examen, moyenne_periode, tp, oral, autre) | oui | `moyenne_periode` marque une note **agrégée** importée (cf. exemples-mapping B) — exclue des tendances fines. | — | Normalized | Module 1 / Import |
| `date` | date | oui | Doit tomber dans la période / l'année (contrôle de cohérence temporelle). | — | Normalized | Module 1 / Import |
| `libelle` | texte(120) | oui | Ex. « Devoir n°3 ». | — | Normalized | Module 1 / Import |
| `coefficient` | décimal(4,2) | non | Coefficient propre à l'évaluation (sinon celui de l'enseignement). | — | Normalized | Module 1 / Import |
| **Clé de rapprochement** | — | — | `(enseignement, periode, type, date, libelle)`. | — | — | — |

### Note

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `evaluation_id` | réf(Evaluation) | oui | — | PII indirecte | Normalized | Module 1 / Import |
| `inscription_id` | réf(Inscription) | oui | Rattache la note à (élève + classe + année). | PII indirecte | Normalized | Module 1 / Import |
| `valeur` | décimal(6,3) | conditionnel | ∈ `[bareme.min, bareme.max]` (contrôle **bloquant** → quarantaine sinon). Obligatoire si `valeur_texte` absent. | PII sensible (résultat de mineur) | Normalized | Module 1 / Import |
| `valeur_texte` | texte(40) | conditionnel | Mention (`type=mention`). Obligatoire si `valeur` absent. | PII sensible | Normalized | Module 1 / Import |
| `origine` | enum(ocr, manuel, import) | oui | `ocr`/`manuel` ⇒ passée par validation Module 1. `import` ⇒ interopérabilité. | — | Normalized | Module 1 / Import |
| `statut` | enum(active, en_revue, remplacee, archivee) | oui | `en_revue` = conflit non résolu (affichée mais signalée contestée). | — | Normalized | Module 1 / Import / Conflit |
| `corrigee_manuellement` | booléen | oui | `vrai` si une valeur OCR a été corrigée à la validation (`EF-M1-08`). | — | Normalized | Module 1 |
| `lot_saisie_id` | réf(LotSaisie) | conditionnel | Obligatoire si `origine ∈ {ocr, manuel}`. | — | Normalized | Module 1 |
| `source_donnee_id` | réf(SourceDonnee) | conditionnel | Obligatoire si `origine=import`. | — | Normalized | Import |
| `absent` | booléen | non | `vrai` = élève absent à l'évaluation (pas de valeur ; distinct de « note manquante »). | PII indirecte | Normalized | Module 1 / Import |
| **Unicité** | — | — | `(evaluation_id, inscription_id)` unique. | — | — | — |
| **Règle forte** | — | — | Une note `statut=active` **validée Module 1** n'est **jamais** écrasée par un import : tout écart ⇒ `en_revue` (`RG-10`, §H.5.3). | — | — | — |

### Appreciation

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `note_id` | réf(Note) | conditionnel | Une appréciation porte sur une note **ou** sur un `enseignement`+`periode` (bulletin). Exactement une des deux cibles. | PII sensible | Normalized | Module 1 / Import |
| `enseignement_id` + `periode_scolaire_id` | réf | conditionnel | Cible « bulletin » (appréciation de période). | PII sensible | Normalized | Module 1 / Import |
| `texte` | texte | oui | Contenu libre. Minimisation ; pas de données de santé attendues. | PII sensible (jugement sur mineur) | Normalized | Module 1 / Import |
| `auteur_id` | réf(Enseignant) | non | — | PII | Normalized | Module 1 |
| `langue` | code_langue | non | Langue du texte. | — | Normalized | Module 1 |

### LotSaisie / Validation

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `lot_saisie.enseignement_id` | réf(Enseignement) | oui | — | — | Normalized | Module 1 |
| `lot_saisie.evaluation_id` | réf(Evaluation) | non | Un lot cible en général une évaluation. | — | Normalized | Module 1 |
| `lot_saisie.statut` | enum(brouillon, en_validation, valide, annule) | oui | `valide` = les notes sont écrites en Normalized. | — | Normalized | Module 1 |
| `lot_saisie.document_source_id` | réf(DocumentSource) | non | Fiche capturée à l'origine du lot. | — | Normalized | Module 1 |
| `lot_saisie.mode` | enum(ocr, manuel, mixte) | oui | — | — | Normalized | Module 1 |
| `validation.lot_saisie_id` | réf(LotSaisie) | oui | — | — | Normalized | Module 1 |
| `validation.utilisateur_id` | réf(Utilisateur) | oui | Qui valide. | PII | Normalized | Module 1 |
| `validation.role_validation` | enum(enseignant, responsable) | oui | Deux lignes si contre-validation (`EF-M1-12`). | — | Normalized | Module 1 |
| `validation.horodatage` | horodatage | oui | — | — | Normalized | Module 1 |
| `validation.commentaire` | texte | non | — | PII indirecte | Normalized | Module 1 |

---

## G-DIC.3 Domaine « Raw Data »

### DocumentSource / PageDocument

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `document_source.lot_saisie_id` | réf(LotSaisie) | non | Lié après création du lot. | — | Raw | Module 1 |
| `document_source.type_media` | enum(image, pdf, video) | oui | — | — | Raw | Module 1 / Import |
| `document_source.uri_stockage` | texte | oui | Renvoi stockage objet chiffré. Jamais d'URL publique. | — | Raw | Module 1 |
| `document_source.hash` | texte(64) | oui | SHA-256 du binaire. Déduplication + intégrité. | — | Raw | Module 1 |
| `document_source.taille_octets` | entier | oui | Contrôlée avant traitement (bornes). | — | Raw | Module 1 |
| `document_source.type_mime` | texte(80) | oui | Type MIME **réel** (vérifié, pas l'extension). | — | Raw | Module 1 |
| `document_source.capture_le` | horodatage | oui | Horodatage appareil (peut différer de `cree_le` serveur). | — | Raw | Module 1 |
| `document_source.capture_par` | réf(Utilisateur) | oui | — | PII | Raw | Module 1 |
| `document_source.purge_le` / `purge_motif` | horodatage / texte | non | Renseignés = **pierre tombale** (binaire détruit, métadonnées conservées). | — | Raw | Calcul (job de purge) |
| `page_document.document_source_id` | réf(DocumentSource) | oui | — | — | Raw | Module 1 |
| `page_document.numero` | entier | oui | 1..n. | — | Raw | Module 1 |
| `page_document.uri_image` | texte | oui | Image normalisée de la page. | — | Raw | Module 1 |
| `page_document.dimensions` | json | oui | `{ largeur_px, hauteur_px, dpi? }`. | — | Raw | Module 1 |

### ExtractionOCR / CelluleReconnue

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `extraction_ocr.page_document_id` | réf(PageDocument) | oui | — | — | Raw | Module 1 |
| `extraction_ocr.moteur` | texte(60) | oui | Nom du moteur OCR (abstraction — `EF-IOP-05`). | — | Raw | Module 1 |
| `extraction_ocr.version_moteur` | texte(40) | oui | Traçabilité MLOps. | — | Raw | Module 1 |
| `extraction_ocr.horodatage` | horodatage | oui | — | — | Raw | Module 1 |
| `extraction_ocr.statut` | enum(succes, partiel, echec) | oui | — | — | Raw | Module 1 |
| `extraction_ocr.score_global` | décimal(4,3) | non | ∈ [0,1]. | — | Raw | Module 1 |
| `extraction_ocr.payload_uri` | texte | oui | JSON brut (base si petit, objet sinon). Immuable. | — | Raw | Module 1 |
| `cellule_reconnue.extraction_ocr_id` | réf(ExtractionOCR) | oui | — | — | Raw | Module 1 |
| `cellule_reconnue.ligne` / `colonne` | entier | oui | Position dans la grille détectée. | — | Raw | Module 1 |
| `cellule_reconnue.role_colonne` | enum(nom, matricule, note, appreciation, autre) | non | Rôle sémantique déduit. | — | Raw | Module 1 |
| `cellule_reconnue.texte_reconnu` | texte | non | Valeur brute reconnue. | PII sensible (si note/nom) | Raw | Module 1 |
| `cellule_reconnue.score_confiance` | décimal(4,3) | oui | ∈ [0,1]. Pilote la mise en évidence (`EF-M1-07`). | — | Raw | Module 1 |
| `cellule_reconnue.bbox` | json | oui | `{ x, y, w, h }` en px page. Ouverture de la zone image (`EF-M1-06`). | — | Raw | Module 1 |
| `cellule_reconnue.note_id` | réf(Note) | non | Renseigné **après validation** (lien Raw ↔ Normalized, `EF-M1-13`). | — | Raw | Module 1 |

### ImportExterne / EnregistrementBrut / Quarantaine

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `import_externe.source_donnee_id` | réf(SourceDonnee) | oui | — | — | Raw | Import |
| `import_externe.connecteur_config_id` | réf(ConnecteurConfig) | oui | — | — | Raw | Import |
| `import_externe.horodatage` | horodatage | oui | — | — | Raw | Import |
| `import_externe.mode` | enum(complet, incremental) | oui | — | — | Raw | Import |
| `import_externe.curseur_avant` / `curseur_apres` | texte | non | Bornes de progression (§H-ETL). | — | Raw | Import |
| `import_externe.statut` | enum(en_cours, termine, partiellement_termine, echec) | oui | — | — | Raw | Import |
| `import_externe.mapping_id` / `mapping_version` | réf / texte | oui | Version de mapping appliquée. | — | Raw | Import |
| `enregistrement_brut.import_externe_id` | réf(ImportExterne) | oui | — | — | Raw | Import |
| `enregistrement_brut.entite_cible` | texte(40) | oui | Nom d'entité canonique visée. | — | Raw | Import |
| `enregistrement_brut.payload` | json | oui | Ligne source **telle quelle** (après recodage encodage). Immuable. | PII (selon contenu) | Raw | Import |
| `enregistrement_brut.hash` | texte(64) | oui | SHA-256 du payload normalisé pré-mapping. Idempotence (§H-ETL.4). | — | Raw | Import |
| `enregistrement_brut.statut` | enum(charge, transforme, upsert, quarantaine, deadletter, ignore, rejete_trace) | oui | — | — | Raw | Import |
| `enregistrement_brut.entite_canonique_id` | uuid | non | Renseigné après *upsert*. | — | Raw | Import |
| `quarantaine.enregistrement_brut_id` | réf(EnregistrementBrut) | oui | — | — | Raw | Import |
| `quarantaine.motif` | enum(mapping_error, normalisation, rapprochement_ambigu, dependance_absente, regle_metier, csv_malforme, encodage, autre) | oui | Motif **structuré**. | — | Raw | Import |
| `quarantaine.details` | json | oui | `{ regle, champ, valeur, attendu }`. | PII (selon contenu) | Raw | Import |
| `quarantaine.action` | enum(a_traiter, corriger_valeur, ajuster_mapping, ignorer, forcer, rejeter) | oui | Défaut `a_traiter`. | — | Raw | Import / Revue |
| `quarantaine.resolu_le` / `resolu_par` | horodatage / réf | non | — | PII | Raw | Revue |
| `quarantaine.justification` | texte | conditionnel | Requise si `action=forcer` ou `rejeter`. | — | Raw | Revue |

---

## G-DIC.4 Domaine « Module 2 : saisies »

> Toutes ces entités sont **conditionnées au consentement** (`EF-M2-11`) et à la **minimisation**
> (DPIA, Phase 2). Le stockage de champs très sensibles peut faire l'objet d'un chiffrement
> applicatif dédié (Couche 6).

### ProfilInterets

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `eleve_id` | réf(Eleve) | oui | Un profil par élève. | PII sensible | Normalized | Module 2 (saisie) |
| `centres_interet` | json | non | Liste de tags depuis un référentiel fermé (pas de texte libre non borné). | PII sensible | Normalized | Module 2 (saisie) |
| `matieres_preferees` | json | non | Réfs `Matiere` ou codes. | PII indirecte | Normalized | Module 2 (saisie) |
| `matieres_evitees` | json | non | — | PII indirecte | Normalized | Module 2 (saisie) |
| `contraintes` | json | non | Ex. mobilité géographique, contraintes familiales (bornées, minimisées). | PII sensible | Normalized | Module 2 (saisie) |
| `style_apprentissage` | json | non | Optionnel. | PII sensible | Normalized | Module 2 (saisie) |
| `maj_le` | horodatage | oui | Fraîcheur affichée dans l'explication d'orientation. | — | Normalized | Module 2 (saisie) |

### Aspiration

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `eleve_id` | réf(Eleve) | oui | — | PII sensible | Normalized | Module 2 (saisie) |
| `intitule` | texte(160) | oui | Métier / domaine visé (texte court). | PII sensible | Normalized | Module 2 (saisie) |
| `domaine` | réf(SecteurStrategique) \| enum | non | Rattachement au référentiel si possible. | — | Normalized | Module 2 (saisie) |
| `priorite` | entier | non | Ordre de préférence de l'élève. | PII sensible | Normalized | Module 2 (saisie) |
| `exprimee_le` | horodatage | oui | — | — | Normalized | Module 2 (saisie) |

### AvisParent

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `eleve_id` | réf(Eleve) | oui | — | PII sensible | Normalized | Module 2 (saisie) |
| `responsable_legal_id` | réf(ResponsableLegal) | oui | Doit avoir `autorite_parentale` ou être `contact_prioritaire`. | PII sensible | Normalized | Module 2 (saisie) |
| `contenu` | texte | non | Minimisé. **Opinion** → sensible. Envisager chiffrement applicatif. | PII sensible (opinion) | Normalized | Module 2 (saisie) |
| `ambition` | texte(160) | non | Filière/métier souhaité par le parent. | PII sensible | Normalized | Module 2 (saisie) |
| `priorite` | entier | non | — | PII sensible | Normalized | Module 2 (saisie) |
| `saisi_par` | enum(parent, conseiller, enseignant, autre) | oui | Traçabilité de qui a saisi l'avis. | — | Normalized | Module 2 (saisie) |
| `donne_le` | horodatage | oui | Fraîcheur. | — | Normalized | Module 2 (saisie) |

### Consentement

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `eleve_id` | réf(Eleve) | oui | — | PII sensible | Normalized | Module 2 (saisie) |
| `portee` | enum(module2, export, autre) | oui | `module2` conditionne toute demande d'orientation. | — | Normalized | Module 2 (saisie) |
| `donne_par` | réf(ResponsableLegal) \| réf(Eleve majeur) | oui | — | PII | Normalized | Module 2 (saisie) |
| `date` | horodatage | oui | — | — | Normalized | Module 2 (saisie) |
| `statut` | enum(actif, retire, expire) | oui | — | — | Normalized | Module 2 (saisie) |
| `retire_le` | horodatage | conditionnel | Requis si `statut=retire`. Le retrait bloque les nouvelles demandes et est tracé. | — | Normalized | Module 2 (saisie) |
| `preuve_uri` | texte | non | Trace du recueil (formulaire signé, case cochée horodatée). | PII | Normalized | Module 2 (saisie) |

---

## G-DIC.5 Domaine « Module 2 : orientation » (Intelligence + saisie de sortie)

### DemandeOrientation

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `eleve_id` | réf(Eleve) | oui | — | PII sensible | Intelligence | Module 2 (calcul) |
| `declenchee_par` | réf(Utilisateur) | oui | Conseiller / responsable. Jamais automatique (`RG-05`). | PII | Intelligence | Module 2 |
| `horodatage` | horodatage | oui | — | — | Intelligence | Module 2 |
| `consentement_id` | réf(Consentement) | oui | Doit être `actif`. | — | Intelligence | Module 2 |
| `version_referentiel_id` | réf(VersionReferentiel) | oui | Version figée utilisée pour ce calcul (`EF-M2-*`, explicabilité). | — | Intelligence | Module 2 |
| `parametrage_ponderation_id` | réf(ParametragePonderation) | oui | Version des poids utilisée. | — | Intelligence | Module 2 |
| `instantane_donnees` | json | oui | Empreinte des données d'entrée (hash + fraîcheur par catégorie) pour reproductibilité. | — | Intelligence | Module 2 (calcul) |
| `statut` | enum(en_calcul, disponible, revisee, archivee) | oui | — | — | Intelligence | Module 2 |
| `avertissement_fiabilite` | texte | non | Ex. « données académiques &lt; 1 trimestre » (`EF-M2-*`). | — | Intelligence | Module 2 (calcul) |

### ScenarioOrientation / ScenarioElement / FacteurExplication / AlternativeEcartee

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `scenario.demande_orientation_id` | réf(DemandeOrientation) | oui | — | PII sensible | Intelligence | Module 2 (calcul) |
| `scenario.rang` | entier | oui | 1 = mieux scoré. | — | Intelligence | Module 2 (calcul) |
| `scenario.filiere_id` | réf(Filiere) | oui | — | — | Intelligence | Module 2 (calcul) |
| `scenario.score` | décimal(5,2) | oui | Score additif pondéré (cf. [`../09-moteur-orientation/`](../09-moteur-orientation/)). | PII sensible | Intelligence | Module 2 (calcul) |
| `scenario.resume` | texte | oui | Généré, bilingue. | — | Intelligence | Module 2 (calcul) |
| `scenario_element.type` | enum(formation, etablissement, metier) | oui | — | — | Intelligence | Module 2 (calcul) |
| `scenario_element.reference_id` | uuid | oui | Réf `Formation` / `EtablissementReference` / `Metier`. | — | Intelligence | Module 2 (calcul) |
| `scenario_element.detail` | json | non | Distance géo, capacité, débouché… | — | Intelligence | Module 2 (calcul) |
| `facteur_explication.facteur` | texte(80) | oui | Nom du facteur. | — | Intelligence | Module 2 (calcul) |
| `facteur_explication.categorie` | enum(profil, aspiration, avis_parent, offre, debouche, besoin_national) | oui | Base de l'explicabilité (part de chaque catégorie). | — | Intelligence | Module 2 (calcul) |
| `facteur_explication.valeur_pour_eleve` | texte | oui | Valeur observée. | PII sensible | Intelligence | Module 2 (calcul) |
| `facteur_explication.poids` | décimal(5,4) | oui | Poids de la catégorie (issu du paramétrage). | — | Intelligence | Module 2 (calcul) |
| `facteur_explication.contribution` | décimal(6,3) | oui | Contribution signée au score. | PII sensible | Intelligence | Module 2 (calcul) |
| `alternative_ecartee.filiere_id` | réf(Filiere) | oui | — | — | Intelligence | Module 2 (calcul) |
| `alternative_ecartee.raison` | texte | oui | Pourquoi écartée (explicabilité). | — | Intelligence | Module 2 (calcul) |
| `alternative_ecartee.score` | décimal(5,2) | oui | — | PII sensible | Intelligence | Module 2 (calcul) |

### ParametragePonderation / DossierOrientationVersion

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `parametrage.version` | entier | oui | Incrémentale. | — | Reference | Gestionnaire référentiel |
| `parametrage.poids_par_categorie` | json | oui | `{ profil, aspiration, avis_parent, offre, debouche, besoin_national }`, somme = 1. Bornes min/max par catégorie. | — | Reference | Gestionnaire référentiel |
| `parametrage.publie_le` | horodatage | oui | — | — | Reference | Gestionnaire référentiel |
| `parametrage.statut` | enum(brouillon, publie, deprecie) | oui | Seule une version `publie` est utilisable. | — | Reference | Gestionnaire référentiel |
| `dossier_version.demande_orientation_id` | réf(DemandeOrientation) | oui | — | PII sensible | Intelligence | Module 2 |
| `dossier_version.numero` | entier | oui | 1..n. Historise `EF-M2-24`. | — | Intelligence | Module 2 |
| `dossier_version.motif` | enum(initial, revision, correction_donnees) | oui | — | — | Intelligence | Module 2 |
| `dossier_version.genere_le` | horodatage | oui | — | — | Intelligence | Module 2 |
| `dossier_version.export_uri` | texte | non | PDF/archive du dossier remis (bilingue). | PII sensible | Intelligence | Module 2 |

---

## G-DIC.6 Domaine « Référentiels d'orientation » (Reference Data)

> **Reference Data** : partagée (potentiellement) entre établissements, **non** rattachée à un
> tenant sauf `offre_formation` locale. Gouvernance : décision #5. Chaque entrée « stratégique »
> porte `source_referentiel_id` **et** `version_referentiel_id` **obligatoires**.

### SecteurStrategique / BesoinCompetence

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `secteur.libelle_fr` / `libelle_en` | libelle_bilingue | oui | — | — | Reference | Gestionnaire référentiel |
| `secteur.description` | texte | non | — | — | Reference | Gestionnaire référentiel |
| `secteur.priorite` | enum(critique, elevee, moyenne, faible) | oui | Pondère le score « besoin national » sans **verrouiller** (`RG-08`). | — | Reference | Gestionnaire référentiel |
| `secteur.source_referentiel_id` | réf(SourceReferentiel) | oui | — | — | Reference | Gestionnaire référentiel |
| `secteur.version_referentiel_id` | réf(VersionReferentiel) | oui | — | — | Reference | Gestionnaire référentiel |
| `besoin.secteur_strategique_id` | réf(SecteurStrategique) | oui | — | — | Reference | Gestionnaire référentiel |
| `besoin.competence_id` | réf(Competence) | oui | — | — | Reference | Gestionnaire référentiel |
| `besoin.intensite` | enum(forte, moyenne, faible) | oui | — | — | Reference | Gestionnaire référentiel |
| `besoin.horizon` | enum(court, moyen, long) | non | — | — | Reference | Gestionnaire référentiel |
| `besoin.source_referentiel_id` | réf(SourceReferentiel) | oui | — | — | Reference | Gestionnaire référentiel |

### Metier / Competence / MetierCompetence

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `metier.libelle_fr` / `libelle_en` | libelle_bilingue | oui | — | — | Reference | Gestionnaire référentiel |
| `metier.code_rome_local` | texte(16) | non | Rattachement à une nomenclature métier si disponible. | — | Reference | Gestionnaire référentiel |
| `metier.secteur_strategique_id` | réf(SecteurStrategique) | non | — | — | Reference | Gestionnaire référentiel |
| `metier.perspectives` | enum(tres_favorables, favorables, stables, incertaines) | non | Datée + sourcée. | — | Reference | Gestionnaire référentiel |
| `competence.libelle_fr` / `libelle_en` | libelle_bilingue | oui | — | — | Reference | Gestionnaire référentiel |
| `competence.type` | enum(disciplinaire, transversale, technique, comportementale) | oui | — | — | Reference | Gestionnaire référentiel |
| `metier_competence.metier_id` / `competence_id` | réf | oui | — | — | Reference | Gestionnaire référentiel |
| `metier_competence.niveau_requis` | enum(notions, maitrise, expertise) | oui | — | — | Reference | Gestionnaire référentiel |

### Filiere / Formation / FormationMetier

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `filiere.libelle_fr` / `libelle_en` | libelle_bilingue | oui | — | — | Reference | Gestionnaire référentiel |
| `filiere.niveau_entree` | réf(Niveau) \| texte | non | Niveau scolaire d'accès. | — | Reference | Gestionnaire référentiel |
| `filiere.domaine` | enum(...) | non | Aligné sur `matiere.domaine`. | — | Reference | Gestionnaire référentiel |
| `formation.filiere_id` | réf(Filiere) | oui | — | — | Reference | Gestionnaire référentiel |
| `formation.libelle_fr` / `libelle_en` | libelle_bilingue | oui | — | — | Reference | Gestionnaire référentiel |
| `formation.duree_mois` | entier | non | — | — | Reference | Gestionnaire référentiel |
| `formation.diplome` | texte(80) | non | — | — | Reference | Gestionnaire référentiel |
| `formation.prerequis` | json | non | Ex. matières fortes attendues, mention minimale. Sert au scoring d'adéquation. | — | Reference | Gestionnaire référentiel |
| `formation_metier.formation_id` / `metier_id` | réf | oui | — | — | Reference | Gestionnaire référentiel |
| `formation_metier.probabilite_debouche` | enum(forte, moyenne, faible) | non | Datée + sourcée. | — | Reference | Gestionnaire référentiel |

### EtablissementReference / Localisation / OffreFormation

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `etablissement_reference.nom` | texte(200) | oui | Établissement d'accueil possible (≠ tenant BuildNote). | — | Reference | Gestionnaire référentiel |
| `etablissement_reference.type` | enum(lycee, universite, institut, ecole_pro, cfp, autre) | oui | — | — | Reference | Gestionnaire référentiel |
| `etablissement_reference.public_prive` | enum(public, prive, confessionnel) | non | — | — | Reference | Gestionnaire référentiel |
| `etablissement_reference.localisation_id` | réf(Localisation) | oui | Géolocalisation (distance dans le scoring). | — | Reference | Gestionnaire référentiel |
| `localisation.libelle` | texte(160) | oui | Ville / quartier / région. | — | Reference | Gestionnaire référentiel |
| `localisation.latitude` / `longitude` | décimal(9,6) | non | WGS84. | — | Reference | Gestionnaire référentiel |
| `localisation.region` / `departement` | texte(80) | non | Découpage administratif. | — | Reference | Gestionnaire référentiel |
| `offre_formation.etablissement_reference_id` | réf | oui | — | — | Reference | Gestionnaire référentiel |
| `offre_formation.formation_id` | réf(Formation) | oui | — | — | Reference | Gestionnaire référentiel |
| `offre_formation.capacite` | entier | non | Places indicatives. | — | Reference | Gestionnaire référentiel |
| `offre_formation.cout_indicatif` | json | non | `{ montant, devise, periode }`. Minimisé, indicatif. | — | Reference | Gestionnaire référentiel |
| `offre_formation.selectivite` | enum(ouverte, moderee, forte) | non | — | — | Reference | Gestionnaire référentiel |
| `offre_formation.annee_validite` | texte(9) | oui | Année scolaire de validité de l'offre. | — | Reference | Gestionnaire référentiel |

### SourceReferentiel / VersionReferentiel

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `source_referentiel.reference` | texte(200) | oui | Titre du document / de la base source. | — | Reference | Gestionnaire référentiel |
| `source_referentiel.organisme` | texte(160) | oui | Ex. INS, MINEPAT, ONEFOP (décision #5). | — | Reference | Gestionnaire référentiel |
| `source_referentiel.url` | texte | non | — | — | Reference | Gestionnaire référentiel |
| `source_referentiel.date_publication` | date | oui | Date de la source. | — | Reference | Gestionnaire référentiel |
| `source_referentiel.date_consultation` | date | oui | Date à laquelle BuildNote l'a intégrée. | — | Reference | Gestionnaire référentiel |
| `source_referentiel.fiabilite` | enum(officielle, institutionnelle, etude, estimation) | oui | Affichée dans l'explication d'orientation. | — | Reference | Gestionnaire référentiel |
| `version_referentiel.numero` | entier | oui | Incrémentale. | — | Reference | Gestionnaire référentiel |
| `version_referentiel.date` | date | oui | — | — | Reference | Gestionnaire référentiel |
| `version_referentiel.statut` | enum(brouillon, publiee, depreciee) | oui | Une `DemandeOrientation` cite **toujours** une version `publiee`. | — | Reference | Gestionnaire référentiel |
| `version_referentiel.notes` | texte | non | Changelog. | — | Reference | Gestionnaire référentiel |

---

## G-DIC.7 Domaine « Intelligence Data » (dérivé)

> Conventions propres : `calcule_le` (horodatage), `calcul_trace_id` (réf), `couverture_donnees`
> (part des données attendues effectivement présentes), **pas** de `modifie_par` (jamais modifié à
> la main — recalculé). Purge/recalcul libres (cf. [`cycle-de-vie-stockage.md`](cycle-de-vie-stockage.md) §G-CV.5).

### ProfilAcademique / TendancePerformance / CompetenceDetectee / ProfilOrientation

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `profil_academique.eleve_id` | réf(Eleve) | oui | — | PII sensible | Intelligence | Calcul |
| `profil_academique.annee_scolaire_id` | réf(AnneeScolaire) | oui | — | — | Intelligence | Calcul |
| `profil_academique.synthese` | json | oui | Moyennes par matière/période, points forts/faibles, régularité. Reconstructible. | PII sensible | Intelligence | Calcul |
| `profil_academique.calcule_le` | horodatage | oui | Affiché (fraîcheur). | — | Intelligence | Calcul |
| `profil_academique.calcul_trace_id` | réf(CalculTrace) | oui | — | — | Intelligence | Calcul |
| `tendance_performance.eleve_id` / `matiere_id` | réf | oui | — | PII sensible | Intelligence | Calcul |
| `tendance_performance.periode_debut` / `periode_fin` | réf(PeriodeScolaire) | oui | Fenêtre d'observation. | — | Intelligence | Calcul |
| `tendance_performance.pente` | décimal(6,3) | oui | Signe = amélioration / dégradation. Calculée sur notes **validées** uniquement, hors `moyenne_periode` importées si demandé. | PII sensible | Intelligence | Calcul |
| `tendance_performance.niveau_moyen` | décimal(5,2) | oui | — | PII sensible | Intelligence | Calcul |
| `tendance_performance.regularite` | décimal(4,3) | oui | Ex. 1 − écart-type normalisé. | PII sensible | Intelligence | Calcul |
| `competence_detectee.eleve_id` / `competence_id` | réf | oui | — | PII sensible | Intelligence | Calcul |
| `competence_detectee.niveau_estime` | enum(notions, maitrise, expertise) | oui | **Sous supervision humaine** (jamais présenté comme un fait absolu). | PII sensible | Intelligence | Calcul |
| `competence_detectee.confiance` | décimal(4,3) | oui | ∈ [0,1]. | — | Intelligence | Calcul |
| `competence_detectee.base_calcul` | json | oui | Matières/notes ayant contribué (explicabilité). | PII sensible | Intelligence | Calcul |
| `profil_orientation.eleve_id` | réf(Eleve) | oui | — | PII sensible | Intelligence | Calcul |
| `profil_orientation.synthese` | json | oui | Agrégat profil + intérêts + aspirations pour préparer le scoring. | PII sensible | Intelligence | Calcul |

### IndicateurClasse / IndicateurEtablissement / CalculTrace

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `indicateur_*.perimetre` | json | oui | `{ type: classe\|niveau\|etablissement, reference_id }`. | — | Intelligence | Calcul |
| `indicateur_*.indicateur` | texte(80) | oui | Ex. `moyenne_generale`, `taux_reussite`, `dispersion`. | — | Intelligence | Calcul |
| `indicateur_*.valeur` | décimal(12,4) | oui | — | PII indirecte (agrégat) | Intelligence | Calcul |
| `indicateur_*.calcule_le` | horodatage | oui | **Affiché** dans le dashboard (`EF-M1-19`/`EF-M2-02`). | — | Intelligence | Calcul |
| `indicateur_*.couverture_donnees` | décimal(4,3) | oui | ∈ [0,1]. Signale un indicateur calculé sur données partielles. | — | Intelligence | Calcul |
| `indicateur_*.ttl_expire_le` | horodatage | non | Cache ; au-delà → recalcul. | — | Intelligence | Calcul |
| `calcul_trace.type_calcul` | texte(60) | oui | Ex. `profil_academique`, `dashboard_classe`. | — | Intelligence | Calcul |
| `calcul_trace.version_algorithme` | texte(40) | oui | Traçabilité des dérivations. | — | Intelligence | Calcul |
| `calcul_trace.entrees_hash` | texte(64) | oui | Empreinte des entrées (reproductibilité). | — | Intelligence | Calcul |
| `calcul_trace.horodatage` | horodatage | oui | — | — | Intelligence | Calcul |
| `calcul_trace.parametrage_ref` | json | non | Poids/seuils utilisés. | — | Intelligence | Calcul |

---

## G-DIC.8 Domaine « Socle : identité, audit, interopérabilité »

> Conventions propres : les entités socle portent `id`, `cree_le`, `modifie_le` ; l'audit est
> **append-only** (voir [`cycle-de-vie-stockage.md`](cycle-de-vie-stockage.md) §G-CV.6).

### Utilisateur / Role / Permission / AttributionRole / Perimetre

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `utilisateur.etablissement_id` | réf(Etablissement) | oui | Un utilisateur appartient à **un** établissement. | — | Socle | Socle |
| `utilisateur.identifiant` | texte(120) | oui | Login (courriel ou identifiant local). Unique par établissement. | PII | Socle | Socle |
| `utilisateur.personne_id` | réf(Personne) | non | Lien vers la personne (enseignant, responsable). | PII indirecte | Socle | Socle |
| `utilisateur.methode_auth` | enum(mot_de_passe, sso, otp) | oui | Détail Couche 6. | secret | Socle | Socle |
| `utilisateur.hash_secret` | texte | conditionnel | Jamais en clair. Algo/params Couche 6. | secret | Socle | Socle |
| `utilisateur.statut` | enum(actif, suspendu, invite, archive) | oui | — | — | Socle | Socle |
| `utilisateur.langue` | code_langue | oui | Préférence UI. | — | Socle | Socle |
| `utilisateur.derniere_connexion` | horodatage | non | — | PII indirecte | Socle | Socle |
| `role.code` | texte(40) | oui | Ex. `enseignant`, `responsable`, `conseiller`, `admin_etab`, `gestionnaire_referentiel`, `exploitation`. | — | Socle | Socle |
| `role.libelle_fr` / `libelle_en` | libelle_bilingue | oui | — | — | Socle | Socle |
| `permission.code` | texte(60) | oui | Ex. `note.valider`, `import.lancer`, `export.reversibilite`, `orientation.declencher`. | — | Socle | Socle |
| `role_permission` (assoc.) | réf | oui | Rôle ↔ permission (RBAC). | — | Socle | Socle |
| `attribution_role.utilisateur_id` / `role_id` | réf | oui | — | — | Socle | Socle |
| `attribution_role.perimetre_id` | réf(Perimetre) | non | Restriction ABAC (classe, niveau, campus). Absent = tout l'établissement. | — | Socle | Socle |
| `attribution_role.debut` / `fin` | date | non | Attribution temporaire possible. | — | Socle | Socle |
| `perimetre.type` | enum(etablissement, campus, niveau, classe) | oui | — | — | Socle | Socle |
| `perimetre.reference_id` | uuid | oui | Réf de l'objet de périmètre. | — | Socle | Socle |

### EvenementAudit

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `acteur` | texte | oui | `utilisateur:<id>` \| `connecteur:<ref>` \| `systeme`. | PII indirecte | Socle | Socle |
| `action` | texte(80) | oui | Verbe normalisé : `note.validee`, `import.termine`, `export.genere`, `role.attribue`, `connexion.echec`… | — | Socle | Socle |
| `objet_type` / `objet_id` | texte / uuid | oui | Entité concernée. | — | Socle | Socle |
| `avant` / `apres` | json | non | Valeurs sensibles **hachées ou tronquées**. | PII (haché) | Socle | Socle |
| `horodatage` | horodatage | oui | UTC. | — | Socle | Socle |
| `ip` | texte(45) | non | IPv4/IPv6. Minimisation possible (tronquée). | PII | Socle | Socle |
| `user_agent` | texte | non | — | PII indirecte | Socle | Socle |
| `resultat` | enum(succes, refus, erreur) | oui | — | — | Socle | Socle |
| `hash_precedent` | texte(64) | non | Chaînage d'intégrité (optionnel). | — | Socle | Socle |
| `etablissement_id` | réf(Etablissement) | oui | Cloisonnement de l'audit. | — | Socle | Socle |

### SourceDonnee / ConnecteurConfig

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `source_donnee.etablissement_id` | réf(Etablissement) | oui | Une source appartient à **un** établissement (pas de flux inter-tenants). | — | Socle | Onboarding |
| `source_donnee.libelle` | texte(120) | oui | Ex. « SGBD GestNotes lycée Japoma ». | — | Socle | Onboarding |
| `source_donnee.type` | enum(sql-postgresql, sql-mysql-mariadb, sql-sqlserver, sql-sqlite, sql-oracle, sql-generic, rest-api, csv-excel, dump-fichier, buildnote-export, proprietaire) | oui | Cf. catalogue §H.2. | — | Socle | Onboarding |
| `source_donnee.role` | enum(officielle, secondaire, ponctuelle) | oui | Influe sur la préséance par défaut (§H.5). | — | Socle | Onboarding |
| `source_donnee.statut` | enum(active, suspendue, retiree) | oui | — | — | Socle | Onboarding |
| `connecteur_config.source_donnee_id` | réf(SourceDonnee) | oui | — | — | Socle | Onboarding |
| `connecteur_config.parametres` | json **chiffré** | oui | Hôte, port, base, chemin, dialecte, encodage… **Secrets chiffrés** (coffre) ; jamais journalisés. | secret | Socle | Onboarding |
| `connecteur_config.mapping_id` | réf(Mapping) | oui | — | — | Socle | Onboarding |
| `connecteur_config.planification` | json | non | Cron + `fenetre_synchro` `{ jours, plage_horaire }`. | — | Socle | Onboarding |
| `connecteur_config.mode_defaut` | enum(complet, incremental) | oui | — | — | Socle | Onboarding |
| `connecteur_config.curseur` | texte | non | Dernier curseur confirmé. | — | Socle | Import |
| `connecteur_config.derniere_execution_id` | réf(ExecutionFlux) | non | — | — | Socle | Import |

### Mapping / VersionSchemaCanonique / Lineage / ExecutionFlux

| Champ | Type | Oblig. | Valeurs / règle | Sensibilité | Strate | Source |
|---|---|---|---|---|---|---|
| `mapping.definition` | json/yaml | oui | Fichier de mapping déclaratif (§H.3). Versionné, testable. | — | Socle | Onboarding |
| `mapping.version` | texte(16) | oui | Ex. `1.4`. | — | Socle | Onboarding |
| `mapping.version_schema_canonique_id` | réf(VersionSchemaCanonique) | oui | Cible visée. | — | Socle | Onboarding |
| `mapping.statut` | enum(brouillon, actif, deprecie) | oui | — | — | Socle | Onboarding |
| `mapping.teste_le` | horodatage | non | Dernier passage de la CI d'interopérabilité. | — | Socle | Socle |
| `version_schema_canonique.numero` | texte(8) | oui | `v1`, `v2`… | — | Socle | Socle |
| `version_schema_canonique.date` | date | oui | — | — | Socle | Socle |
| `version_schema_canonique.notes` | texte | non | Changelog. | — | Socle | Socle |
| `version_schema_canonique.scripts_migration_uri` | texte | non | Migrations avant/arrière. | — | Socle | Socle |
| `version_schema_canonique.statut` | enum(courante, precedente, depreciee, future) | oui | Le cœur lit `courante` **et** `precedente` pendant les migrations. | — | Socle | Socle |
| `lineage.entite_canonique_id` | uuid | oui | Entité tracée. | — | Socle | Import |
| `lineage.entite_type` | texte(40) | oui | Ex. `Note`. | — | Socle | Import |
| `lineage.operation` | enum(insert, update, upsert_saute, conflit_resolu, rejete_trace, purge) | oui | — | — | Socle | Import |
| `lineage.import_externe_id` | réf(ImportExterne) | non | — | — | Socle | Import |
| `lineage.enregistrement_brut_id` | uuid | non | Conservé même après purge du brut (pierre tombale). | — | Socle | Import |
| `lineage.source` | json | oui | `{ type, ref }`. | — | Socle | Import |
| `lineage.mapping` | json | non | `{ id, version, cible_schema_canonique }`. | — | Socle | Import |
| `lineage.transformations` | json | oui | Liste ordonnée des fonctions appliquées. | — | Socle | Import |
| `lineage.rapprochement` | json | non | `{ cle, resultat }`. | — | Socle | Import |
| `lineage.conflit` | json | non | `{ champ, valeurs, strategie, decideur }` ou `null`. | — | Socle | Import |
| `lineage.horodatage` | horodatage | oui | — | — | Socle | Import |
| `lineage.decideur` | texte | oui | `systeme` \| `utilisateur:<id>`. | PII indirecte | Socle | Import / Revue |
| `execution_flux.*` | — | — | Schéma complet en [`../07-interoperabilite/etl-orchestration.md`](../07-interoperabilite/etl-orchestration.md) §H-ETL.8.1. | — | Socle | Import |

---

## G-DIC.9 Récapitulatif de sensibilité (pour la DPIA)

| Niveau | Champs concernés (exemples) | Mesure |
|---|---|---|
| **PII sensible (mineur, opinion, jugement)** | `note.valeur`, `appreciation.texte`, `avis_parent.contenu`, `aspiration.*`, `profil_interets.*`, tout `Intelligence` lié à un élève | Minimisation, consentement (Module 2), chiffrement applicatif à l'étude, accès ABAC restreint, exclusion des logs |
| **PII** | `personne.nom/prenoms/date_naissance`, `contact`, `utilisateur.identifiant`, `ip` | Chiffrement au repos, accès contrôlé, rétention légale |
| **PII indirecte** | `matricule`, `nom_normalise`, `inscription.statut`, agrégats de petite taille | Contrôle d'agrégation (seuil d'anonymat sur les dashboards) |
| **secret** | `connecteur_config.parametres`, `utilisateur.hash_secret` | Coffre, chiffrement applicatif, jamais journalisé, rotation |

Renvois : DPIA (Phase 2), [`../10-securite/architecture-securite.md`](../10-securite/architecture-securite.md),
décision #2 (rétention), décision #4 (multi-tenant).

---

## G-DIC.10 Tenue et gel du dictionnaire

- **Format de travail** : ce fichier Markdown pendant la conception ; export tabulaire (CSV)
  généré pour la revue et le gel.
- **Gel à J4** : à la clôture de la Phase 4, le dictionnaire est **gelé** ; toute évolution
  ultérieure passe par la gestion des changements
  ([`../01-project-management/gestion-changements-versions-documentaire.md`](../01-project-management/gestion-changements-versions-documentaire.md))
  et, si elle touche le canonique, par une nouvelle `version_schema_canonique` + migration
  ([`modele-conceptuel-logique-physique.md`](modele-conceptuel-logique-physique.md) §G.6).
- **Cohérence** : toute nouvelle entité/champ dans le MLD **doit** être répercuté ici dans la même
  revue (critère de revue de la Couche 4).
