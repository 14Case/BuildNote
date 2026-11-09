# M-ACQ.2 Jeux de données — constitution, pseudonymisation, vérité terrain, annotation

> **Statut : Brouillon — Couche 7.** Date : 2026-09-09.
> Définit le corpus `corpus-acq-v1` utilisé par POC 1, POC 2 et POC-VH, son format de **vérité
> terrain**, le **guide d'annotation** et les règles de **pseudonymisation**. À geler avant
> exécution ([`protocole.md` §P.3](protocole.md)).

## D.1 Volumétrie et répartition

Cible **≥ 150 fiches** (viser 180 pour absorber les rejets d'annotation). Une « fiche » = une page
de grille de notes d'une classe pour une évaluation.

| Strate | Description | Cible | Min. |
|---|---|---|---|
| `imprime_bon` | Fiche générée par logiciel, photo à plat, bon éclairage | 35 | 25 |
| `imprime_degrade` | Imprimée mais photo de biais / ombre / reflet / basse résolution | 30 | 20 |
| `manuscrit_lisible` | Notes portées à la main, écriture nette, bon support | 40 | 30 |
| `manuscrit_difficile` | Manuscrit avec ratures, surcharges, écriture serrée, papier froissé | 25 | 20 |
| `mixte` | En-tête imprimé + notes manuscrites (cas le plus fréquent sur le terrain) | 30 | 25 |
| **Total** | | **160** | **120** |

Contraintes de diversité (à satisfaire **en plus** de la répartition par strate) :

| Axe | Exigence |
|---|---|
| Établissements | ≥ 3 établissements ; ≥ 2 gabarits de fiche distincts |
| Barèmes | /20, /10, /100 et fiches à **mentions** représentés ; ≥ 10 fiches hors /20 |
| Effectif | fiches de 15–30 lignes et de 40–70 lignes |
| Colonnes | présence de : matricule / sans matricule ; coefficient ; appréciation ; rang ; colonnes fusionnées |
| Structure | ≥ 15 fiches **sans bordures visibles** ; ≥ 10 fiches à **ordre de colonnes inhabituel** |
| Prise de vue | à plat, de biais (~20–30°), éclairage inégal, léger flou — chaque condition ≥ 10 fiches |
| Cas limites | ≥ 5 fiches partiellement inexploitables (pour tester le rejet), hors des 150 « mesurables » |

## D.2 Collecte

| Sujet | Règle |
|---|---|
| Origine | Fiches réelles d'années écoulées, fournies par les établissements pilotes sous **accord écrit** et **finalité déclarée** (faisabilité technique POC uniquement) |
| Matériel | 2 smartphones (entrée et milieu de gamme) + éventuellement 1 scan de référence pour une sous-partie (contrôle) |
| Conditions | Reproduire les conditions terrain (salle des profs, lumière naturelle + néon), pas de studio |
| Métadonnées de capture | établissement (code), classe (code), évaluation (type, période), barème, gabarit, appareil (type), condition de prise de vue, date de capture |
| Interdits | Aucune donnée identifiante d'élève ne quitte la zone maîtrisée **avant** pseudonymisation (§D.3) |

## D.3 Pseudonymisation

Objectif : rendre le corpus exploitable en environnement isolé **sans données identifiantes
directes**, tout en conservant ce qui est nécessaire au test du rapprochement élève.

Procédure, par fiche :

1. **Image source** : masquage irréversible (aplat opaque) des zones hors grille contenant des
   identifiants directs non nécessaires (n° de téléphone, adresses, signatures nominatives, photos
   d'identité). La **colonne nom/prénom de la grille est conservée** (nécessaire à POC 2) mais les
   noms réels y sont **remplacés** : voir étape 2.
2. **Substitution des noms** : chaque nom d'élève réel → un nom fictif tiré d'une liste de noms
   plausibles (même longueur approximative, mêmes difficultés : accents, traits d'union, noms
   composés, particules). La substitution est faite **sur l'image** (réédition) et dans la vérité
   terrain, via une table de correspondance `nom_reel → pseudo` **conservée hors de l'environnement
   isolé**, chiffrée, détruite en fin de POC.
3. **Matricules** : remplacés par des identifiants fictifs cohérents (même format).
4. **Liste de classe associée** (§D.8) : générée à partir des mêmes pseudos.
5. **Registre** : chaque fiche reçoit un identifiant `F-####` ; le registre relie `F-####` ↔
   établissement/classe/évaluation (codés), jamais ↔ identité réelle.

> Si la ré-édition de l'image pour substituer les noms dégrade trop le réalisme OCR, la sous-partie
> concernée est traitée en **environnement maîtrisé de l'établissement** (poste dédié, hors ligne)
> et seules les métriques agrégées en sortent — décision du référent conformité, journalisée.

## D.4 Format de vérité terrain

Un fichier JSON par fiche : `ground-truth/F-0001.json`. Encodage UTF-8, coordonnées en pixels de
l'image **prétraitée** de référence (le prétraitement de référence est figé et fourni avec le
corpus).

```json
{
  "fiche_id": "F-0001",
  "corpus": "corpus-acq-v1",
  "image_ref": "images/F-0001.jpg",
  "image_dimensions": { "w": 2480, "h": 3508 },
  "meta": {
    "etablissement": "ETB-A",
    "classe": "CLS-3EME-2",
    "evaluation": { "type": "devoir", "periode": "T1", "libelle_source": "Devoir n°2" },
    "bareme": { "type": "sur20", "max": 20 },
    "gabarit": "GAB-A-1",
    "strate": "mixte",
    "prise_de_vue": "biais",
    "appareil": "milieu_gamme"
  },
  "entete": {
    "matiere": "Mathématiques",
    "date": "2025-11-14",
    "texte_brut_attendu": "Collège A — 3e 2 — Mathématiques — Devoir n°2 — 14/11/2025"
  },
  "structure": {
    "n_lignes": 42,
    "n_colonnes": 5,
    "colonnes": [
      { "index": 0, "role": "nom", "libelle_entete": "Nom et prénom" },
      { "index": 1, "role": "matricule", "libelle_entete": "Matricule" },
      { "index": 2, "role": "note", "libelle_entete": "Note /20" },
      { "index": 3, "role": "coefficient", "libelle_entete": "Coef" },
      { "index": 4, "role": "appreciation", "libelle_entete": "Observation" }
    ],
    "cellules_fusionnees": [],
    "sans_bordure": false
  },
  "lignes": [
    {
      "ligne_index": 0,
      "eleve_ref": "E-0007",
      "nom_pseudo": "NKOLO Aristide",
      "cellules": [
        { "col": 0, "valeur": "NKOLO Aristide", "type": "texte", "bbox": [120, 340, 760, 388], "etat": "rempli" },
        { "col": 1, "valeur": "M-2213", "type": "texte", "bbox": [770, 340, 980, 388], "etat": "rempli" },
        { "col": 2, "valeur": "12.5", "type": "nombre", "bbox": [990, 340, 1140, 388], "etat": "rempli", "ecriture": "manuscrit" },
        { "col": 3, "valeur": "2", "type": "nombre", "bbox": [1150, 340, 1260, 388], "etat": "rempli", "ecriture": "imprime" },
        { "col": 4, "valeur": "Peut mieux faire", "type": "texte", "bbox": [1270, 340, 2000, 388], "etat": "rempli", "ecriture": "manuscrit" }
      ]
    },
    {
      "ligne_index": 1,
      "eleve_ref": "E-0011",
      "nom_pseudo": "ABENA Clarisse",
      "cellules": [
        { "col": 2, "valeur": null, "statut": "absent", "type": "nombre", "bbox": [990, 388, 1140, 436], "etat": "statut" }
      ]
    }
  ],
  "lignes_non_rapprochables_attendues": [],
  "notes_annotateur": "Ligne 30 : rature sur la note, valeur finale confirmée par le second annotateur."
}
```

Conventions de champ :

| Champ | Règle |
|---|---|
| `valeur` | Chaîne **canonique** (voir guide §D.5). `null` si pas de valeur numérique. |
| `statut` | `absent`, `non_evalue`, `dispense` — mutuellement exclusif avec une `valeur` numérique. |
| `etat` de cellule | `rempli`, `vide` (case blanche volontaire), `illisible` (présent mais non déchiffrable même par l'annotateur), `statut`. **`vide` ≠ `illisible`.** |
| `ecriture` | `imprime` ou `manuscrit` — par cellule (une fiche `mixte` a les deux). |
| `bbox` | `[x_min, y_min, x_max, y_max]` sur `image_ref`. Obligatoire pour toute cellule mesurée. |
| `eleve_ref` | Identifiant de la liste de classe (§D.8). `null` si la ligne ne correspond à aucun élève de la liste (cas à signaler). |

## D.5 Guide d'annotation

### Transcription des valeurs (forme canonique)

| Cas observé | Valeur annotée |
|---|---|
| `12,5` / `12.5` / `12 ½` / `12,50` | `12.5` |
| `12` | `12` (pas `12.0`) |
| `08` / `8` | `8` |
| `20/20` dans une cellule de note /20 | `20` |
| `Abs`, `ABS`, `absent` | `valeur=null`, `statut=absent` |
| `NE`, `n.e.`, `—`, `/` (non évalué) | `valeur=null`, `statut=non_evalue` |
| Case blanche | `etat=vide` |
| Gribouillis / rature illisible sans valeur nette | `etat=illisible`, `valeur=null` |
| Rature **avec** valeur finale nette | `valeur` = valeur finale ; `notes_annotateur` décrit la rature |
| Mention (`AB`, `B`, `TB`, `Passable`) | valeur énumérée canonique (`assez_bien`, `bien`, `tres_bien`, `passable`) |
| Nom composé `MBALLA-ONDOA Jean Pierre` | tel quel, tirets et espaces conservés |

### Structure (POC 2)

- `role` de colonne parmi : `nom`, `prenom`, `nom_prenom`, `matricule`, `note`, `coefficient`,
  `appreciation`, `rang`, `moyenne`, `autre`. Une seule `note` principale par fiche pour le POC
  (les fiches multi-colonnes de notes sont annotées avec la colonne évaluée = `note`, les autres =
  `autre`).
- `n_lignes` = nombre de lignes **d'élèves** (hors ligne d'en-tête et lignes de synthèse).
- `cellules_fusionnees` : liste de `{ lignes: [i, j], col: k }` ou équivalent colonnes.
- `sans_bordure: true` si aucune ligne de séparation n'est visible.

### Rapprochement élève (POC 2)

- `eleve_ref` = l'élève de la **liste de classe fournie** que l'annotateur juge correspondre à la
  ligne (jugement humain, référence).
- Si le nom de la ligne ne correspond à **aucun** élève de la liste → `eleve_ref: null` et ajout à
  `lignes_non_rapprochables_attendues`.

### Double annotation et désaccords

1. Deux annotateurs indépendants produisent chacun leur JSON.
2. Comparaison automatique cellule à cellule.
3. Les désaccords sont tranchés par un **arbitre** ; la valeur retenue et le motif sont consignés.
4. **Accord inter-annotateur** mesuré et reporté dans le rapport :
   - cellules numériques : % d'accord exact ;
   - `role` de colonne : coefficient kappa de Cohen ;
   - rapprochement élève : % d'accord.
   Seuil d'alerte : < 95 % d'accord sur les cellules numériques → revoir le guide avant de geler.

## D.6 Outillage d'annotation

Prototype **jetable** minimal (spéc, pas de code ici) :

- affichage image + saisie de la grille (lignes × colonnes) ;
- tracé des `bbox` par glisser ou semi-automatique (détection de grille en assistance, **corrigée à
  la main**) ;
- export au schéma §D.4 ; validation de schéma à l'export ;
- mode « comparaison des deux annotations » pour l'arbitre.

Aucune dépendance à un moteur OCR (sinon biais). Peut être une feuille de calcul + un petit
utilitaire de bbox si cela suffit.

## D.7 Gel, versionnement, conservation

| Règle | Détail |
|---|---|
| Gel | `corpus-acq-v1` = images prétraitées de référence + `ground-truth/*.json` + listes de classe + registre. Hash global calculé et inscrit dans [`protocole.md` §P.3](protocole.md). |
| Modification | Toute correction post-gel → `corpus-acq-v1.1`, changelog, ré-exécution des runs impactés. |
| Conservation | Jeux **pseudonymisés** conservés pour la Phase 9 (tests de non-régression). Images sources **non pseudonymisées** détruites en fin de POC (procès-verbal de destruction). |
| Table `nom_reel → pseudo` | Hors environnement isolé, chiffrée, détruite en fin de POC. |

## D.8 Liste de classe associée (rapprochement élève)

Pour chaque classe représentée, un fichier `classes/CLS-XXX.json` :

```json
{
  "classe_id": "CLS-3EME-2",
  "etablissement": "ETB-A",
  "effectif": 44,
  "eleves": [
    { "eleve_ref": "E-0007", "nom": "NKOLO", "prenoms": "Aristide", "matricule": "M-2213" },
    { "eleve_ref": "E-0011", "nom": "ABENA", "prenoms": "Clarisse", "matricule": "M-2217" }
  ]
}
```

- L'effectif de la liste **peut différer** du nombre de lignes de la fiche (élèves partis/arrivés) —
  c'est voulu, pour tester le signalement des lignes non rapprochées et des élèves sans note.
- Noms = pseudos (mêmes que la vérité terrain des fiches).
