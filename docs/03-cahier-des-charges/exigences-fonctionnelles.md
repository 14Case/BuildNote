# D. Exigences fonctionnelles — BuildNote

> **Statut : En revue — Couche 3.** Date : 2026-09-08.
> Convention d'identifiant : `EF-<domaine>-<n>`. Domaines : `SOC` (socle), `IOP` (interopérabilité),
> `M1` (Module 1), `M2` (Module 2), `ADM` (administration).
> Priorité : **M** must / **S** should / **C** could (V1). Chaque exigence est **atomique et
> testable** ; critères d'acceptation dans [`contraintes-kpi-tracabilite.md`](contraintes-kpi-tracabilite.md).

## D.1 Socle

| ID | Exigence | Prio | Besoin source |
|---|---|---|---|
| EF-SOC-01 | L'écran d'accueil présente un sélecteur de langue **FR / EN** accessible sans authentification. | M | B0-01 |
| EF-SOC-02 | Le choix de langue s'applique à toute l'interface, aux messages, aux exports et aux explications d'orientation. | M | B0-01, B2-13 |
| EF-SOC-03 | Le choix de langue est persisté (au compte si connecté, sinon à l'appareil). | M | B0-01 |
| EF-SOC-04 | Le système gère des établissements primaires (écoles publiques et privées) et secondaires (collèges et lycées d'enseignement général et technique), chaque compte utilisateur étant rattaché à **exactement un** établissement (hors rôle éditeur). | M | B0-02 |
| EF-SOC-05 | Le système applique un contrôle d'accès par rôle et par périmètre (établissement, niveau, classe, matière selon le rôle). | M | B0-02 |
| EF-SOC-06 | Aucune donnée d'un établissement n'est lisible, exportable ou agrégeable depuis un autre établissement. | M | B0-02, RG-09 |
| EF-SOC-07 | L'authentification exige un second facteur pour les rôles sensibles (chef d'établissement, admin SI, admin BuildNote, gestionnaire référentiel). | M | B0-03 |
| EF-SOC-08 | Le système journalise toute action sensible (validation de notes, contre-validation, import, export, génération de dossier d'orientation, modification du référentiel, gestion de comptes) avec auteur, horodatage, objet. | M | B0-04 |
| EF-SOC-09 | Le journal d'audit est consultable par les rôles habilités et exportable. | S | B0-04 |
| EF-SOC-10 | Le système gère les **années scolaires** et la promotion des classes d'une année à l'autre. | M | RG-03 |
| EF-SOC-11 | Le système stocke séparément Raw Data, Normalized Data et Intelligence Data, avec des politiques de rétention distinctes. | M | Archi données |
| EF-SOC-12 | L'Intelligence Data est intégralement recalculable à partir de Normalized Data + référentiels. | M | Archi données |
| EF-SOC-13 | Le système notifie les utilisateurs des événements les concernant (contre-validation en attente, synchro en échec, données d'orientation à compléter). | S | UC-23 |

## D.2 Interopérabilité

| ID | Exigence | Prio | Besoin source |
|---|---|---|---|
| EF-IOP-01 | Le système définit un **modèle de données canonique** unique vers lequel toute donnée externe est traduite et depuis lequel toute donnée exportée est produite. | M | B0-05..08 |
| EF-IOP-02 | Le système fournit des connecteurs pour : PostgreSQL, MySQL/MariaDB, Microsoft SQL Server, SQLite, Oracle (via connecteur générique SQL au minimum), fichiers CSV/Excel, API REST. | M | B0-05, B0-06, B0-07 |
| EF-IOP-03 | Le système permet de définir un **mapping déclaratif** (champ source ↔ champ canonique, tables de correspondance de valeurs, expressions) sans redéploiement du cœur. | M | B0-05 |
| EF-IOP-04 | Le système normalise les types, formats de date, encodages, unités et barèmes lors de l'import. | M | B0-08 |
| EF-IOP-05 | Le système valide chaque enregistrement importé contre le schéma canonique et les règles métier. | M | B0-08 |
| EF-IOP-06 | Tout enregistrement non conforme est placé en **quarantaine** avec un motif ; il n'est jamais rejeté silencieusement. | M | B0-08, RG-10 |
| EF-IOP-07 | Le système détecte et gère les **conflits** (même entité de plusieurs sources ou en doublon) selon des règles de préséance configurables, avec possibilité de revue manuelle. | M | B0-09 |
| EF-IOP-08 | Le système enregistre le **lineage** de chaque donnée canonique (source, mapping, transformations, horodatage, décideur). | M | B0-10, RG-02 |
| EF-IOP-09 | Les imports sont **idempotents** : rejouer un import ne crée pas de doublons. | M | RG-13 |
| EF-IOP-10 | Le système supporte l'import **incrémental** quand la source le permet (curseur, horodatage, journal de modifications). | S | B0-05 |
| EF-IOP-11 | Le système permet d'**exporter l'intégralité** du patrimoine d'un établissement au format canonique documenté. | M | B0-11, RG-11 |
| EF-IOP-12 | Le système permet d'exporter vers un système tiers via un connecteur de sortie et une transformation. | S | B0-07 |
| EF-IOP-13 | Le système fournit un **tableau de bord qualité des données** (complétude, fraîcheur, taux de quarantaine, taux de conflit, taux de correction post-OCR). | S | B0-12 |
| EF-IOP-14 | Le schéma canonique est **versionné** ; un mapping déclare la version de canonique qu'il vise ; les migrations sont fournies et réversibles ou sauvegardées. | M | Versioning |
| EF-IOP-15 | Les identifiants de connexion aux sources sont chiffrés et l'accès demandé est limité à la lecture nécessaire. | M | Sécurité |

## D.3 Module 1 — Capture & gestion des données académiques

| ID | Exigence | Prio | Besoin source |
|---|---|---|---|
| EF-M1-01 | L'enseignant peut importer une fiche via appareil photo, galerie ou fichier (image/PDF), y compris un lot de plusieurs pages. | M | B1-01, B1-13 |
| EF-M1-02 | Le système prétraite l'image (recadrage, redressement, amélioration de contraste, débruitage). | M | B1-02 |
| EF-M1-03 | Le système détecte la structure tabulaire (zones, lignes, colonnes, cellules, en-têtes). | M | B1-02 |
| EF-M1-04 | Le système reconnaît les valeurs des cellules (texte imprimé et manuscrit) et produit un **score de confiance par cellule**. | M | B1-03 |
| EF-M1-05 | Le système rapproche chaque ligne reconnue d'un élève de la classe sélectionnée et signale les lignes non rapprochées. | M | B1-04 |
| EF-M1-06 | Le système affiche un **formulaire prérempli** montrant, pour chaque cellule, la valeur reconnue, son score de confiance (indication visuelle) et l'accès à la zone d'image source. | M | B1-05 |
| EF-M1-07 | Le système met en évidence et permet de parcourir en priorité les cellules à faible confiance. | M | B1-05, UC-02 |
| EF-M1-08 | L'enseignant peut corriger toute valeur ; chaque correction est marquée « corrigée manuellement », horodatée et attribuée. | M | B1-06, RG-02 |
| EF-M1-09 | Le système contrôle les valeurs saisies/reconnues contre le **barème** de l'évaluation et alerte en cas de valeur hors plage. | M | B1-14 |
| EF-M1-10 | Aucune donnée n'est enregistrée en Normalized Data sans une **validation humaine explicite**. | M | B1-07, RG-01 |
| EF-M1-11 | Le système affiche un récapitulatif avant validation. | M | UC-01 |
| EF-M1-12 | Si la contre-validation est activée (établissement ou classe), l'enregistrement définitif requiert l'approbation d'un responsable, tracée en plus de celle de l'enseignant. | S | B1-08, UC-03 |
| EF-M1-13 | À la validation, le système enregistre les notes en Normalized Data et conserve l'image et l'extraction brute (avec scores et coordonnées) en Raw Data, liées entre elles. | M | B1-09, RG-02 |
| EF-M1-14 | Les corrections effectuées **après** enregistrement sont possibles pour les rôles habilités et sont tracées (valeur avant/après, auteur, date, motif). | S | B1-10 |
| EF-M1-15 | Le Module 1 fonctionne **hors-ligne** pour la capture, le prétraitement, la reconnaissance (au moins en mode dégradé), la correction et la validation ; les enregistrements sont mis en file et synchronisés à la reconnexion. | M | B1-11 |
| EF-M1-16 | En cas de conflit à la synchronisation (note déjà présente pour le même élève/évaluation), le système propose une résolution guidée sans écrasement silencieux. | M | UC-01 E3 |
| EF-M1-17 | Le système gère des **gabarits de fiches** par établissement (définition des colonnes attendues, position, type). | S | B1-12 |
| EF-M1-18 | Si la structure n'est pas reconnue, le système permet de choisir un gabarit ou de saisir manuellement, l'image restant affichée. | M | UC-01 3a |
| EF-M1-19 | **Aucun** enregistrement de note ne déclenche un calcul du Module 2 (dashboard ou orientation). | M | RG-05 |
| EF-M1-20 | Le système gère plusieurs barèmes (/20, /10, /100, mentions) et le rattachement barème ↔ évaluation. | M | B1-14 |

## D.4 Module 2 — Orientation

### D.4.1 Dashboard de situation

| ID | Exigence | Prio | Besoin source |
|---|---|---|---|
| EF-M2-01 | L'utilisateur habilité peut consulter un dashboard de situation pour un périmètre : élève, classe, niveau, matière, établissement, groupe d'établissements autorisés. | M | B2-01 |
| EF-M2-02 | Le dashboard calcule ses indicateurs **en interrogeant les bases au moment du chargement ou d'un rafraîchissement explicite** ; il n'est jamais mis à jour automatiquement sur enregistrement d'une note. | M | B2-15, RG-05, RG-06 |
| EF-M2-03 | Le dashboard affiche la date/heure du calcul et la couverture des données prises en compte. | M | UC-06 |
| EF-M2-04 | Le dashboard répond au minimum aux questions : meilleurs élèves d'une matière sur un périmètre ; évolution d'une classe/d'un niveau dans le temps ; régularité d'un élève ; comparaison entre classes d'un niveau. | M | B2-02 |
| EF-M2-05 | Un indicateur reposant sur des données non disponibles (ex. aptitude sportive sans données EPS) est affiché comme « non disponible » plutôt qu'estimé. | S | B2-16 |
| EF-M2-06 | Les résultats du dashboard sont exportables en FR/EN. | S | B2-13 |

### D.4.2 Orientation individuelle

| ID | Exigence | Prio | Besoin source |
|---|---|---|---|
| EF-M2-10 | Le conseiller habilité peut déclencher une orientation individuelle pour un élève, le système identifiant automatiquement le **palier d'orientation** selon son niveau (Palier 1 : CM2/Class 6 vers études secondaires ; Palier 2 : 3e/4e année/Form 5 vers second cycle ; Palier 3 : Terminale/Upper Sixth vers enseignement supérieur). | M | B2-03 |
| EF-M2-11 | La génération n'a lieu que si le consentement de l'élève et des parents à l'usage des données du Module 2 est enregistré. | M | Conformité |
| EF-M2-12 | Le système agrège **à la demande** : parcours académique, résultats, matières, examens, évolution des performances, compétences et aptitudes détectées, intérêts et préférences (si disponibles), aspirations de l'élève, avis des parents, profil académique consolidé. | M | B2-04 |
| EF-M2-13 | Le système récupère l'offre de formation accessible : filières, formations, établissements de référence, avec leur position géographique et la distance à l'élève. | M | B2-10 |
| EF-M2-14 | Le système récupère les métiers associés et les perspectives professionnelles liées aux filières/formations. | M | B2-04 |
| EF-M2-15 | Le système intègre le **référentiel stratégique national** (version datée) comme critère **pondéré**. | M | B2-11 |
| EF-M2-16 | Le moteur produit des **scénarios d'orientation scorés** adaptés au palier (secondaire général vs technique au Palier 1 ; séries du second cycle au Palier 2 ; filières supérieures et débouchés au Palier 3), classés du plus au moins recommandé. | M | B2-08 |
| EF-M2-17 | Le moteur applique des filtres de faisabilité (prérequis de filière/formation, accessibilité géographique) et signale les scénarios écartés pour cette raison. | M | UC-08 |
| EF-M2-18 | Chaque scénario est accompagné d'une **explication** : facteurs déterminants et leur poids, données utilisées + fraîcheur + fiabilité, alternatives écartées et pourquoi, zones d'incertitude, répartition du score entre profil / aspirations / avis parents / offre-faisabilité / débouchés / besoins nationaux. | M | B2-09, RG-07 |
| EF-M2-19 | Le référentiel stratégique national **ne rend aucune option impossible** ; il ne fait que pondérer. | M | RG-08 |
| EF-M2-20 | Les **pondérations** entre critères ont des valeurs par défaut publiées ; un rôle habilité peut les ajuster dans des bornes définies ; tout ajustement est tracé et affiché dans l'explication. | S | B2-12 |
| EF-M2-21 | Si des données clés manquent (intérêts, aspirations, avis parents, historique court), le dossier est produit avec un **avertissement de fiabilité** proportionné et une invitation à compléter. | M | UC-08 1a, E1 |
| EF-M2-22 | Le dossier d'orientation est **enregistré** (objet du Module 2), horodaté, rattaché à la version du référentiel et des pondérations utilisées. | M | UC-08 |
| EF-M2-23 | Le dossier est **exportable en FR ou EN** dans un format lisible destiné à l'entretien avec la famille. | M | B2-13 |
| EF-M2-24 | Le dossier peut être **contesté / révisé** : un rôle habilité peut demander une régénération avec données complétées ou pondérations ajustées ; l'historique des versions du dossier est conservé. | S | UC-21 |
| EF-M2-25 | La génération d'un dossier d'orientation **ne modifie aucune** donnée académique (Normalized Data). | M | RG-04 |
| EF-M2-26 | Aucune étape du Module 2 ne réalise d'affectation d'un élève à une filière, une formation ou un établissement. | M | RG (aide à la décision) |

### D.4.3 Saisies élève / parents

| ID | Exigence | Prio | Besoin source |
|---|---|---|---|
| EF-M2-30 | L'élève peut renseigner et modifier ses centres d'intérêt, matières préférées, aspirations et contraintes, via un questionnaire FR/EN. | M | B2-05, B2-06 |
| EF-M2-31 | Le parent peut renseigner et modifier son avis et son ambition pour l'élève, via un formulaire FR/EN accessible par un lien fourni par l'établissement. | M | B2-07 |
| EF-M2-32 | À défaut d'accès numérique du parent, le conseiller peut saisir l'avis lors de l'entretien, en le marquant comme saisi par un tiers. | S | UC-10 1a |
| EF-M2-33 | Toutes ces saisies sont datées et limitées aux données strictement utiles (minimisation). | M | Conformité |

### D.4.4 Référentiel stratégique national

| ID | Exigence | Prio | Besoin source |
|---|---|---|---|
| EF-M2-40 | Le gestionnaire du référentiel peut créer, modifier et archiver des entrées : secteurs stratégiques, métiers, compétences, formations, filières, besoins en compétences, domaines prioritaires, tendances/évolutions du marché, autres indicateurs. | M | B2-14 |
| EF-M2-41 | Toute entrée exige une **source** (référence/organisme/lien) et une **date** ; sans elles, l'entrée ne peut être publiée. | M | RG-08 |
| EF-M2-42 | Les modifications passent par un workflow de validation avant publication. | S | UC-12 |
| EF-M2-43 | Chaque publication crée une **version** du référentiel ; l'historique et les entrées archivées sont conservés. | M | Versioning |
| EF-M2-44 | Les dossiers d'orientation citent la version du référentiel utilisée et l'ancienneté des données mobilisées. | M | EF-M2-18 |

## D.5 Administration

| ID | Exigence | Prio | Besoin source |
|---|---|---|---|
| EF-ADM-01 | L'admin BuildNote peut créer un établissement (tenant) isolé et son premier compte administrateur local. | M | UC-13 |
| EF-ADM-02 | L'admin local gère les comptes et rôles de son établissement, selon le moindre privilège. | M | UC-13 |
| EF-ADM-03 | Toute tentative d'accès inter-établissements est refusée et génère une alerte de sécurité. | M | EF-SOC-06 |
| EF-ADM-04 | Les rôles habilités peuvent déclencher et restaurer des **sauvegardes** ; une restauration est tracée. | M | B0-13 |
| EF-ADM-05 | Les rôles habilités peuvent gérer les gabarits de fiches, les barèmes, les coefficients, les matières et les programmes de leur établissement. | S | UC-15, UC-16 |
| EF-ADM-06 | Les rôles habilités peuvent gérer le consentement (élève/parents) et consulter son état. | M | UC-20 |

## D.6 Règles transverses non négociables (rappel, couvertes ci-dessus)

| Règle | Exigences qui la portent |
|---|---|
| Validation humaine OCR obligatoire | EF-M1-10, EF-M1-11, EF-M1-13 |
| Module 2 sans recalcul automatique | EF-M1-19, EF-M2-02 |
| Dashboard à la demande | EF-M2-02, EF-M2-03 |
| Recommandations explicables | EF-M2-18, EF-M2-44 |
| Aide à la décision, pas de prescription | EF-M2-19, EF-M2-24, EF-M2-26 |
| Isolation des établissements | EF-SOC-06, EF-ADM-03 |
| Interopérabilité par modèle canonique | EF-IOP-01, EF-IOP-11, EF-IOP-14 |
| Bilinguisme FR/EN | EF-SOC-01, EF-SOC-02, EF-M2-23 |
| Faible connectivité | EF-M1-15, EF-M1-16 |
