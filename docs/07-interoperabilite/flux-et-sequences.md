# H. Interopérabilité — Flux et diagrammes de séquence

> **Statut : En revue — Couche 4.** Date : 2026-09-09.
> Vues dynamiques du pipeline d'interopérabilité. Complète [`architecture-detaillee.md`](architecture-detaillee.md)
> (§H.4 pipeline, §H.5 conflits) et [`etl-orchestration.md`](etl-orchestration.md).
> Références : `EF-IOP-05..10`, `EF-M1-15/16`, `RG-10`, `RG-13`, R12.

Acteurs et composants récurrents :

| Nom | Rôle |
|---|---|
| **Ordonnanceur** | Plan de contrôle : déclenche les flux (cron, manuel, webhook) |
| **Worker** | Exécuteur ETL isolé (scénario C) |
| **Connecteur** | Adaptateur de la source (SGBD/API/fichier) |
| **Raw** | Stockage brut immuable (`enregistrement_brut`) |
| **Transfo** | Moteur de transformation + normalisation (applique le mapping) |
| **Rapprochement** | Résolution clé de rapprochement → entité canonique |
| **Validation** | Contrôle schéma + règles métier |
| **Conflit** | Moteur de préséance / file de revue |
| **Canonique** | Normalized Data |
| **Lineage** | Journal de traçabilité |
| **Revue** | File de revue manuelle (humain établissement) |

---

## H-S.1 Import initial (complet)

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin établissement
    participant Ord as Ordonnanceur
    participant W as Worker
    participant Cx as Connecteur
    participant Raw
    participant Tr as Transfo
    participant Rap as Rapprochement
    participant Val as Validation
    participant Cn as Canonique
    participant Lin as Lineage

    Admin->>Ord: Lancer import initial (source, mapping v1)
    Ord->>Ord: Vérifier fenêtre + verrou (source, établissement)
    Ord->>W: Tâche import (priorité "initial")
    W->>Cx: Ouvrir connexion (secret du coffre)
    loop Par page (pagination)
        Cx->>W: Lot de lignes brutes
        W->>Raw: Écrire enregistrement_brut (hash, statut=charge)
        loop Par enregistrement (checkpoint tous les 500)
            W->>Tr: Appliquer mapping + normalisation
            alt Erreur de mapping / normalisation
                Tr-->>Raw: statut=quarantaine (motif structuré)
            else Tuple canonique candidat
                Tr->>Rap: Clé de rapprochement
                Rap->>Cn: Rechercher entité existante
                alt Ambigu (plusieurs matches)
                    Rap-->>Raw: quarantaine (rapprochement_ambigu)
                else match / no-match
                    Rap->>Val: Tuple + entité existante ?
                    alt Non conforme
                        Val-->>Raw: quarantaine (règle violée)
                    else Conforme
                        Val->>Cn: UPSERT (idempotent) 
                        Cn-->>Lin: Écrire lineage (même transaction)
                    end
                end
            end
        end
        W->>Ord: Checkpoint (curseur partiel)
    end
    W->>Ord: Clôture (volumes, durées, taux) + libérer verrou
    Ord-->>Admin: Rapport d'import + lien tableau de bord qualité
```

**Points clés** : le curseur n'avance que sur des lots *checkpointés* ; une reprise après coupure
repart du dernier checkpoint ; l'idempotence rend les lots déjà traités inoffensifs au rejeu.

---

## H-S.2 Synchronisation incrémentale

```mermaid
sequenceDiagram
    autonumber
    participant Ord as Ordonnanceur
    participant W as Worker
    participant Cx as Connecteur
    participant Src as Source
    participant Tr as Transfo
    participant Cn as Canonique
    participant Lin as Lineage

    Ord->>Ord: Cron établissement (02:00 local) + fenêtre ouverte ?
    Ord->>W: Tâche synchro (curseur = borne haute du run précédent confirmé)
    W->>Cx: Extraire lignes où modifie_le > curseur
    Cx->>Src: Requête incrémentale (modifie_depuis)
    Src->>Cx: Delta (ex. 320 lignes)
    Cx->>W: Lignes brutes
    loop Par enregistrement
        W->>Tr: mapping + normalisation
        Tr->>Cn: Rechercher entité (clé de rapprochement)
        alt Tuple identique à l'existant
            Cn-->>W: Aucun changement → UPSERT sauté (pas de lineage)
        else Tuple différent
            Cn->>Cn: UPSERT
            Cn-->>Lin: Lineage (transformation, version mapping)
        end
    end
    W->>Ord: curseur_apres = max(modifie_le) des lignes confirmées
    Ord->>Ord: Persister curseur ; métrique cursor_lag
    Note over Ord: Si extraction échoue → curseur NON avancé, retry au prochain cron
```

**Détection de non-changement** (§H-ETL.4 mécanisme 3) : évite le bruit d'audit quand la source
réécrit des lignes sans modification réelle.

---

## H-S.3 Résolution de conflit multi-sources (préséance automatique)

Cas : la même `Personne` (clé `nom_normalise + date_naissance`) arrive du SGBD officiel **et** d'un
ancien export ; le champ `contact` diffère.

```mermaid
sequenceDiagram
    autonumber
    participant W as Worker
    participant Rap as Rapprochement
    participant Val as Validation
    participant Cf as Conflit
    participant Cn as Canonique
    participant Lin as Lineage

    W->>Rap: Tuple Personne (source = export_secondaire)
    Rap->>Cn: match → entité existante (dernière écriture : SGBD officiel)
    Rap->>Val: Tuple + entité existante
    Val->>Cf: Conforme MAIS champ "contact" divergent
    Cf->>Cf: Charger politique (entité=Personne, champ=contact)
    Note over Cf: strategie = source_prioritaire<br/>priorité : [module1_valide, sgbd_officiel, export_secondaire]
    Cf->>Cf: Source entrante (export_secondaire) < source en place (sgbd_officiel)
    Cf-->>Cn: Valeur "contact" conservée (pas d'écrasement)
    Cf-->>Lin: Journal de résolution (valeurs en présence, stratégie, décideur=systeme)
    Note over Cf,Lin: Aucune donnée perdue : la valeur écartée est dans le lineage + le brut
```

Variante `non_vide` : si l'entité en place a `contact = null`, la valeur entrante **complète** sans
conflit.

---

## H-S.4 Conflit import ↔ note validée Module 1 (règle forte, RG-10 / §H.5.3)

```mermaid
sequenceDiagram
    autonumber
    participant W as Worker
    participant Rap as Rapprochement
    participant Val as Validation
    participant Cf as Conflit
    participant Rv as Revue (humain établissement)
    participant Cn as Canonique
    participant Lin as Lineage

    W->>Rap: Tuple Note (evaluation X, élève Y, valeur=14) — source = SGBD
    Rap->>Cn: match → Note existante (valeur=12, origine=ocr, statut=validee_M1)
    Rap->>Val: Tuple + Note existante
    Val->>Cf: Conforme au schéma, MAIS écart sur une note VALIDÉE Module 1
    Cf->>Cf: Politique = revue_manuelle (non négociable pour ce cas)
    Cf-->>Rv: Créer tâche de revue<br/>(valeur importée 14 vs validée 12,<br/>lineage des deux, image source M1 disponible)
    Cf-->>Lin: Conflit enregistré, statut=en_revue
    Note over Cn: La Note canonique reste à 12 (validée) — AUCUN écrasement
    Rv->>Rv: L'enseignant/responsable examine (image, contexte)
    alt Confirme la valeur validée (12)
        Rv->>Cf: Rejeter l'import pour ce champ
        Cf-->>Lin: Résolution : valeur 12 maintenue, décideur=<user>, motif
    else Reconnaît une erreur de saisie M1
        Rv->>Cn: Corriger la Note (12 → 14) via le flux de correction M1 tracé (EF-M1-14)
        Cn-->>Lin: Correction post-validation (avant/après, auteur, motif=conflit import)
    end
```

**Invariant** : un import ne modifie **jamais** silencieusement une note validée. La décision est
humaine et tracée des deux côtés (lineage interop + audit Module 1).

---

## H-S.5 Conflit import ↔ agent local hors-ligne Module 1

Cas particulier de `EF-M1-16` : un enseignant a saisi et validé des notes **hors-ligne** ; sa file
de synchronisation n'est pas encore remontée quand un import interopérabilité écrit les mêmes notes.

```mermaid
sequenceDiagram
    autonumber
    participant Agent as Agent local M1 (enseignant)
    participant Sync as Service de synchro M1
    participant Cn as Canonique
    participant W as Worker interop
    participant Cf as Conflit
    participant Rv as Revue

    Note over Agent: Hors-ligne : notes validées localement (file d'attente)
    W->>Cn: Import : UPSERT Note(eval X, élève Y, valeur=11, origine=import)
    Cn-->>W: Écrit (aucune note préexistante)
    Agent->>Sync: Reconnexion → remonter la file (Note eval X, élève Y, valeur=13, validée localement, horodatée avant l'import)
    Sync->>Cn: Rechercher Note(eval X, élève Y)
    Cn-->>Sync: Existe déjà (valeur=11, origine=import)
    Sync->>Cf: Conflit synchro M1 ↔ donnée en place
    Note over Cf: Règle : une note validée M1 prime sur une note origine=import,<br/>MAIS écart de valeur → revue (pas d'écrasement auto dans un sens ni l'autre)
    Cf-->>Rv: Tâche de revue (13 validé M1 hors-ligne vs 11 import, horodatages, lineage)
    Cf-->>Cn: Marquer la Note "en_revue" (valeur affichée = 11, signalée comme contestée)
    Rv->>Cn: Décision humaine → valeur retenue + lineage/audit
```

**Règle de conception** : l'ordre d'arrivée (import avant ou après la synchro hors-ligne) ne change
pas le résultat — tout écart entre une **validation humaine M1** et un **import** finit en revue.

---

## H-S.6 Rejeu après correction de mapping

```mermaid
sequenceDiagram
    autonumber
    actor Ref as Référent qualité établissement
    participant TB as Tableau de bord qualité
    participant Map as Éditeur de mapping
    participant Ord as Ordonnanceur
    participant W as Worker
    participant Raw
    participant Cn as Canonique

    Ref->>TB: Consulter la quarantaine (motif "mapping_error" : matière "DAO" non résolue)
    TB->>Ref: 42 enregistrements bruts concernés
    Ref->>Map: Ajouter "DAO" → "dessin_assiste_ordinateur" (mapping v1.0 → v1.1)
    Map->>Map: Validation du mapping (lint + prévisualisation sur échantillon)
    Ref->>Ord: Rejouer la quarantaine avec mapping v1.1
    Ord->>W: Tâche rejeu (portée = enregistrements bruts en quarantaine, motif mapping_error)
    loop Par enregistrement brut (immuable, relu tel quel)
        W->>Raw: Lire enregistrement_brut (inchangé)
        W->>Cn: mapping v1.1 → transfo → validation → UPSERT idempotent
    end
    W->>Ord: 42 traités, 0 quarantaine restante
    Ord-->>Ref: Quarantaine vidée ; lineage mis à jour (mapping_version=1.1)
```

Le **brut n'est jamais modifié** ; seule la version de mapping change. Le rejeu est idempotent.

---

## H-S.7 Export de réversibilité

```mermaid
sequenceDiagram
    autonumber
    actor Resp as Responsable habilité
    participant Ord as Ordonnanceur
    participant W as Worker export
    participant Cn as Canonique
    participant Raw
    participant Arch as Archive (stockage objet chiffré)

    Resp->>Ord: Demander export complet (établissement E)
    Ord->>W: Tâche export_reversibilite (priorité basse, instantané cohérent)
    W->>Cn: Lire snapshot cohérent (toutes entités, périmètre = établissement E)
    W->>Arch: Écrire manifeste.json (versions schéma, horodatage, comptes attendus)
    loop Par entité canonique
        W->>Cn: Streamer les lignes
        W->>Arch: Fichier <entite>.jsonl (+ .csv miroir)
    end
    W->>Cn: Lire lineage du périmètre
    W->>Arch: lineage.jsonl
    W->>Raw: Lister médias (images de fiches) du périmètre
    W->>Arch: media/ (fichiers + media_index.json avec hash)
    W->>Arch: Calculer checksums + signer le manifeste
    W->>Ord: Archive prête (URI, taille, empreinte)
    Ord-->>Resp: Lien de téléchargement + procédure de vérification
```

Détail du format et de la procédure de ré-import : [`export-reversibilite.md`](export-reversibilite.md).

---

## H-S.8 Vue d'ensemble des états d'un enregistrement

```mermaid
stateDiagram-v2
    [*] --> charge : extraction + stockage brut
    charge --> transforme : mapping OK
    charge --> quarantaine : mapping_error
    transforme --> normalise : normalisation OK
    transforme --> quarantaine : normalisation
    normalise --> rapproche : clé résolue
    normalise --> quarantaine : rapprochement_ambigu
    rapproche --> valide : schéma + règles OK
    rapproche --> quarantaine : dependance_absente
    valide --> upsert : pas de conflit
    valide --> conflit : écart détecté
    conflit --> upsert : règle de préséance (auto)
    conflit --> en_revue : revue_manuelle
    valide --> quarantaine : non conforme
    en_revue --> upsert : décision humaine
    en_revue --> rejete_trace : décision humaine (rejet motivé)
    upsert --> [*] : lineage écrit
    quarantaine --> transforme : rejeu après correction mapping
    rejete_trace --> [*]
    upsert --> deadletter : échec technique persistant
    deadletter --> upsert : rejeu manuel après correctif
```
