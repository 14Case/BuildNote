# M-ACQ.5 Modèle de rapport de POC

> **Statut : Brouillon — Couche 7.** Date : 2026-09-09.
> Gabarit **commun** aux rapports POC 1, POC 2 et POC-VH. Un rapport = un livrable de Phase 6, avec
> **résultats chiffrés vs critères** et **recommandation** pour J7. Copier ce fichier en
> `rapport-poc-1-ocr.md`, `rapport-poc-2-tableaux.md`, `rapport-poc-vh.md` et remplir.

---

## 1. Identification

| Champ | Valeur |
|---|---|
| POC | POC 1 — OCR / POC 2 — Extraction de tableaux / POC-VH — Vérification humaine |
| Version du protocole | `protocole vX.Y` (gelé le …) |
| Corpus | `corpus-acq-vX` — hash … — N fiches |
| Moteurs / prototypes évalués | … (nom, famille, version) |
| Période d'exécution | du … au … |
| Environnement | isolé — réf. … |
| Auteurs | Pilote POC, Ingénieur traitement / Facilitateur |
| Statut du rapport | Brouillon / En revue / Validé |

## 2. Résumé exécutif (1 page max)

- **Verdict global** : ☐ Critères atteints ☐ Partiellement atteints ☐ Non atteints
- **Recommandation** : ☐ Poursuivre ☐ Ajuster l'approche puis re-POC ciblé ☐ Renoncer à la brique
- 3 à 5 constats clés (chiffrés).
- Impact direct sur les décisions : **#3 (stratégie OCR)**, #8 (connectivité), #10 (stack).

## 3. Rappel des hypothèses et critères

Reprendre le tableau de `plans-poc.md` (§M.1 ou §M.2) ou de
[`verification-humaine.md` §V.1](verification-humaine.md), colonne « cible ».

## 4. Résultats vs critères

> Source : `results_summary.json` ([`harnais-mesure.md` §H.7](harnais-mesure.md)). Ne rien saisir
> à la main.

### 4.1 Tableau de verdict

| Critère (de `plans-poc.md`) | Cible | Observé (IC 95 %) | Verdict | Preuve |
|---|---|---|---|---|
| Exactitude cellule — imprimé | ≥ 90 % | … | atteint / partiel / non | §4.2 |
| Exactitude cellule — manuscrit lisible | ≥ 70 % | … | … | §4.2 |
| CER en-têtes | ≤ 5 % | … | … | §4.3 |
| Temps de traitement (serveur) | ≤ 20 s | … | … | §4.5 |
| Faisabilité hors-ligne | démontrée même dégradée | … | … | §4.6 |
| Coût projeté au volume | documenté | … | … | §4.7 |
| *(POC 2)* Reconstruction de structure | ≥ 85 % | … | … | §4.8 |
| *(POC 2)* Rapprochement élève | ≥ 90 % | … | … | §4.9 |
| *(POC 2)* Rôle des colonnes | ≥ 90 % | … | … | §4.9 |
| *(POC 2)* Gain gabarit (sans_bordure, ordre_inhabituel) | gain mesurable | … | … | §4.10 |
| *(POC-VH)* Temps de revue (40 élèves) | ≤ 6 min | … | … | §4.11 |
| *(POC-VH)* Détection des cellules erronées | ≥ 98 % | … | … | §4.11 |
| *(POC-VH)* Blocage écriture sans validation | 100 % | … | … | §4.11 |
| *(POC-VH)* SUS / NASA-TLX | ≥ 70 / ≤ 50 | … | … | §4.11 |

### 4.2 Exactitude cellule — détail par strate / moteur / écriture / réseau
*(coller le tableau + graphe)*

### 4.3 CER / WER — en-têtes et appréciations (micro + macro)

### 4.4 Matrice de confusion des chiffres + top confusions + erreurs dizaines vs unités

### 4.5 Cellules non lues / hallucinations (bénignes vs graves)

### 4.6 Calibration du score de confiance (courbe de fiabilité, ECE, AUC, rappel au seuil « orange »)

### 4.7 Temps, ressources, coût (scénarios bas / haut, coût par fiche vérifiée)

### 4.8 Faisabilité hors-ligne (delta d'exactitude, capacités effectives, verdict H3)

### 4.9 *(POC 2)* Structure : taux `structure_ok` par strate ; rôles ; matrice de confusion des rôles

### 4.10 *(POC 2)* Rapprochement élève : correct / faux (détail cas par cas) / omission ; signalement des non-rapprochables

### 4.11 *(POC 2)* Gain gabarit (McNemar) + temps de repli manuel

### 4.12 *(POC-VH)* Temps, détection, erreurs manquées (dont « en vert »), tâches réussies, blocages, SUS, TLX, verbatims

## 5. Analyse

- Où et pourquoi ça échoue (par catégorie : photo, manuscrit, confusion de chiffres, structure sans
  bordure, ordre de colonnes, rapprochement, ergonomie).
- 5–10 cas d'échec illustratifs : crop image + valeur vérité + prédiction + cause probable.
- Comparaison des approches (managé vs open source vs combinaison ; généraliste vs nombres
  spécialisés ; avec vs sans gabarit).
- Ce qui améliorerait les résultats (adaptation/entraînement, gabarits, guide de prise de vue,
  changements d'ergonomie).

## 6. Menaces à la validité

| Menace | Effet possible | Traitement |
|---|---|---|
| Corpus non représentatif (établissements, gabarits, saisons) | sur/sous-estimation | déclarer la couverture réelle vs cible §D.1 |
| Ré-édition des noms (pseudonymisation) altère le réalisme OCR | biais exactitude noms | reporter à part l'exactitude sur colonnes non modifiées |
| Annotation imparfaite | plafond de mesure | reporter l'accord inter-annotateur ; échantillon re-arbitré |
| Effet Magicien d'Oz (POC-VH) | sur-optimisme ergonomie | noter les réponses simulées ; prudence sur les conclusions de latence |
| Volume d'exclusions (appariement) | métriques sur population réduite | reporter le taux d'exclusion ; seuil d'alerte 5 % |
| Petit échantillon POC-VH (n≈8) | pas de généralisation statistique | conclusions qualitatives + tendances, pas de %-précision |

## 7. Recommandation pour J7

- **Décision proposée** : Poursuivre / Ajuster + re-POC ciblé / Renoncer — argumentée.
- **Orientation moteur (décision #3)** : managé / open source / mixte + périmètre (imprimé,
  manuscrit, nombres) + besoins d'adaptation.
- **Connectivité (décision #8)** : ce que le hors-ligne permet réellement.
- **Stack (décision #10)** : candidats confirmés / écartés.
- **Conditions** à réunir avant / pendant la Phase 8 (guide de prise de vue, gabarits initiaux,
  ergonomie à retravailler, jeux de non-régression à conserver).
- **Points ouverts** renvoyés à un ADR ou à la conception.

## 8. Annexes

- Journal des runs (`run.log`), journal des écarts au protocole.
- `results_cells.csv`, `results_fiches.csv`, `results_summary.json` (ou extraits).
- Corpus : fiche de couverture (répartition réelle) + procès-verbal de destruction des images
  sources.
- Questionnaires POC-VH bruts (anonymisés).
