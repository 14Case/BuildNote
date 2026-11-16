# Guide Utilisateur & Manuel de Formation — Déploiement Pilote

> **Statut : Validé — Couche 7 (Lot L6).** Date : 2026-11-16.  
> Contexte : Déploiement pilote en établissement scolaire (Cameroun). Application bilingue Français / Anglais.

---

## 1. Présentation générale et accès

**BuildNote** est une plateforme d'aide à la décision éducative conçue pour fonctionner avec ou sans connexion internet permanente (**offline-first**) sur du matériel scolaire standard.

- **Adresse d'accès local** : `http://<IP_DU_SERVEUR>:5173` ou `http://localhost:5173`
- **Sélecteur de langue** : situé en haut à droite de l'en-tête (bascule instantanée Français / English).
- **Navigation inter-modules** : l'en-tête permet de basculer d'un clic entre :
  - **Module 1 : Capture & Notes** (acquisition et vérification des fiches de notes physiques).
  - **Module 2 : Orientation & Décision** (dashboard de situation et dossiers d'orientation explicables).

---

## 2. Parcours Utilisateur 1 — L'Enseignant (Module 1)

### Étape 1 : Connexion et sélection de la classe
1. Renseignez votre identifiant (email académique) et mot de passe.
2. Cliquez sur **Se connecter** (l'application fonctionne ensuite même si la connexion réseau est coupée).

### Étape 2 : Numérisation d'une fiche physique (Nouvelle capture)
1. Cliquez sur **Nouvelle capture**.
2. Choisissez l'enseignement (ex. *3e 2 — Mathématiques*) et l'évaluation (ex. *Devoir surveillé N°1*).
3. Utilisez la caméra de votre smartphone / tablette ou importez une photo/scan de la fiche physique.
4. Cliquez sur **Lancer l'extraction automatique**.

### Étape 3 : Écran de vérification humaine interactive (Garde-fou non négociable)
> [!IMPORTANT]
> **Règle absolue** : Le système ne sauvegarde **aucune note** dans la base officielle sans vérification humaine explicite ligne par ligne.

L'écran présente le document d'origine à gauche et le tableau de saisie prérempli à droite :
- **Codes couleur de confiance** :
  - <span style="background-color:#dcfce7;color:#166534;padding:2px 6px;border-radius:4px;">Vert</span> : Confiance élevée ($\ge 85\%$).
  - <span style="background-color:#fef9c3;color:#854d0e;padding:2px 6px;border-radius:4px;">Jaune</span> : Confiance moyenne ($70-84\%$), à vérifier attentivement.
  - <span style="background-color:#fee2e2;color:#991b1b;padding:2px 6px;border-radius:4px;">Rouge</span> : Confiance faible ($< 70\%$) ou note hors barème ($> 20$), correction requise.

- **Raccourcis clavier pour saisie ultra-rapide** :
  - `Flèche Bas` / `Entrée` : Passer à la note de l'élève suivant.
  - `Flèche Haut` : Revenir à l'élève précédent.
  - `A` ou `abs` : Marquer l'élève comme absent(e).
  - `Échap` : Annuler la modification en cours.

### Étape 4 : Récapitulatif et validation
1. Cliquez sur **Valider le lot**.
2. Une fenêtre de confirmation récapitulative affiche :
   - Nombre de notes vérifiées et élèves absents.
   - Moyenne calculée de la classe, note la plus basse et note la plus haute.
3. Cochez obligatoirement l'accusé de révision :  
   `☑ Je confirme avoir vérifié l'exactitude des notes saisies par rapport au document physique d'origine.`
4. Cliquez sur **Confirmer et enregistrer**. Les notes sont gravées dans la base officielle.

---

## 3. Parcours Utilisateur 2 — Le Responsable Pédagogique / Chef d'Établissement

### 3.1 Pilotage et contre-validation des lots
1. Depuis l'onglet **Module 1 : Capture & Notes**, consultez la liste des lots de saisie.
2. Les statuts indiquent l'avancement : *En revue*, *Validé par l'enseignant*, *Contre-validé*.
3. Ouvrez un lot pour inspecter le document scanné, le journal des modifications et l'historique d'audit.

### 3.2 Interopérabilité et import de fichiers tableurs (Lot L5)
Pour importer les fichiers de notes existants de l'établissement (formats Excel/CSV croisés) :
1. Accédez à l'écran **Interopérabilité & Import**.
2. Glissez-déposez le fichier CSV de notes de la classe.
3. Vérifiez l'aperçu automatique des colonnes détectées.
4. Cliquez sur **Lancer l'importation**.
5. **Garantie anti-écrasement (`EF-M1-16`)** : Si le fichier importé contient une note différente d'une note déjà validée par un enseignant sur BuildNote, la note existante n'est **jamais** écrasée. Une alerte de conflit est créée en **Quarantaine** pour arbitrage humain.

### 3.3 Export de réversibilité (Souveraineté des données)
À tout moment, le chef d'établissement peut exporter l'intégralité du patrimoine académique au format canonique ouvert standard :
1. Cliquez sur **Export de réversibilité**.
2. Téléchargez le fichier JSON/CSV canonique `v1` contenant l'ensemble des élèves, classes, matières, évaluations et notes.

---

## 4. Parcours Utilisateur 3 — Le Conseiller d'Orientation (Module 2)

### 4.1 Tableau de bord de situation académique
1. Cliquez sur **Module 2 : Orientation & Décision**.
2. Sélectionnez une classe (ex. *3e 2*).
3. Le tableau de bord affiche les indicateurs clés :
   - **Effectif total** de la classe.
   - **Taux de consentement** recueilli.
   - **Questionnaires complétés**.
   - **Dossiers d'orientation générés**.
4. Cliquez sur **Rafraîchir (à la demande)** : conformément à l'invariant `EF-M2-02`, aucun recalcul n'est déclenché en arrière-plan sans action explicite.

### 4.2 Recueil du consentement et questionnaire élève/parents
> [!WARNING]
> **Garde-fou légal (`EF-M2-11`)** : Il est strictement impossible de générer un dossier d'orientation sans le double consentement préalable de l'élève et de ses représentants légaux.

1. Cliquez sur le bouton **Questionnaire & Consentement** en face de l'élève.
2. Cochez les consentements recueillis :
   - `☑ Consentement éclairé de l'élève`
   - `☑ Consentement des parents ou tuteurs légaux`
3. Renseignez les aspirations de l'élève :
   - Centres d'intérêt (ex. *Sciences, informatique, mécanique*).
   - Matières préférées.
   - Projets de métiers envisagés.
4. Renseignez le souhait des parents :
   - Filière souhaitée (ex. *Filière Scientifique C / D*).
   - Niveau de priorité (de 1 à 5).
5. Enregistrez le questionnaire.

### 4.3 Génération et restitution du dossier d'orientation
1. Cliquez sur **Générer le dossier d'orientation**.
2. Le moteur multi-critères analyse l'adéquation entre notes réelles, aspirations, offre de formation locale camerounaise et besoins stratégiques nationaux.
3. Le dossier d'orientation s'affiche avec ses **5 blocs d'explicabilité transparente** :
   - **Bloc 1 : Facteurs déterminants** (points forts académiques, cohérence avec le projet).
   - **Bloc 2 : Données mobilisées et fiabilité** (nombre de notes prises en compte, fraîcheur).
   - **Bloc 3 : Décomposition proportionnelle du score** (performances académiques, profil élève, adéquation territoriale, filières prioritaires nationales).
   - **Bloc 4 : Alternatives analysées et écartées** (motifs objectifs des pistes non retenues).
   - **Bloc 5 : Zones d'incertitude** (matières à consolider, données manquantes).

### 4.4 Règle d'éthique et de non-prescription (`EF-M2-19/26`)
Une bannière visible rappelle en permanence :
> *« Ce dossier constitue une aide à la décision indicative et explicable. Aucune décision d'orientation ne peut être imposée à l'élève ou à sa famille par le système. »*

---

## 5. Aide-mémoire bilingue des termes clés (Glossary)

| Terme Français | English Term | Définition / Role |
|---|---|---|
| **Lot de saisie** | Entry batch | Ensemble de notes d'une évaluation rattaché à une fiche physique. |
| **Vérification humaine** | Human verification | Revue obligatoire par l'enseignant avant toute écriture en base. |
| **Contre-validation** | Counter-validation | Confirmation hiérarchique par le responsable pédagogique. |
| **Dossier d'orientation** | Guidance dossier | Recommandation multicritère explicable d'orientation. |
| **Consentement préalable** | Prior consent | Accord obligatoire élève + parents avant traitement d'orientation. |
| **Non-prescription** | Non-prescription | Principe garantissant qu'aucune filière n'est imposée par le logiciel. |
| **Quarantaine** | Quarantine | Espace d'isolement des données conflictuelles ou invalides. |
| **Réversibilité** | Reversibility | Capacité d'exporter l'intégralité des données en format ouvert standard. |
