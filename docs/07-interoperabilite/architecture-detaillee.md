# H. Interopérabilité — Architecture détaillée

> **Statut : En revue — Couche 4.** Date : 2026-09-08 (rév. 2026-09-09).
> Complète [`vue-ensemble.md`](vue-ensemble.md). Voir aussi :
> [`etl-orchestration.md`](etl-orchestration.md) (exécution des flux),
> [`exemples-mapping.md`](exemples-mapping.md) (archétypes),
> [`flux-et-sequences.md`](flux-et-sequences.md) (séquences),
> [`export-reversibilite.md`](export-reversibilite.md) (format d'export).

## H.1 Modèle canonique (spécification)

Le modèle canonique d'échange = le sous-ensemble « Normalized Data » du modèle de données
([`../06-architecture-donnees/modele-conceptuel-logique-physique.md`](../06-architecture-donnees/modele-conceptuel-logique-physique.md))
exposé sous forme de **schéma d'échange documenté et versionné publiquement**.

> **Qui fait foi.** La **forme interne** des données (entités, attributs, contraintes) est définie
> en [`../06-architecture-donnees/`](../06-architecture-donnees/README.md) — c'est la source de
> vérité. Le schéma d'échange décrit ici en est la **projection** : il peut restreindre, renommer
> ou aplatir pour l'échange, mais **n'introduit aucune entité ni aucun champ absent du modèle
> Normalized**. Le **dictionnaire de données**
> ([`../06-architecture-donnees/dictionnaire-donnees.md`](../06-architecture-donnees/dictionnaire-donnees.md))
> reste la référence unique au niveau champ ; le schéma d'échange le cite.

### H.1.1 Entités canoniques d'échange (V1)
`Etablissement`, `AnneeScolaire`, `PeriodeScolaire`, `Niveau`, `Classe`, `Personne` (+ rôles
`Eleve`, `Enseignant`, `ResponsableLegal`), `LienParente`, `Inscription`, `Matiere`, `Programme`,
`Enseignement`, `Bareme`, `Evaluation`, `Note`, `Appreciation`.

### H.1.2 Clés de rapprochement (identité stable inter-systèmes)

| Entité | Clé de rapprochement (ordre de préférence) |
|---|---|
| Etablissement | code établissement fourni par l'éditeur (attribué à l'onboarding) |
| Eleve | `code_national` si présent → sinon `matricule` établissement → sinon `nom_normalise + date_naissance + etablissement` |
| Enseignant | `identifiant_interne` établissement → sinon `nom_normalise + etablissement` |
| Classe | `etablissement + annee_scolaire + libelle_normalise` |
| Matiere | `etablissement + libelle_normalise` (avec table de synonymes) |
| Evaluation | `enseignement + periode + type + date + libelle` |
| Note | `evaluation + eleve` |

`nom_normalise` : casse repliée, accents supprimés, espaces normalisés, ordre nom/prénoms fixé.

### H.1.3 Formats d'échange
- **Fichiers** : un format tabulaire (CSV/Excel) par entité + un format structuré (JSON) pour les
  échanges riches. Gabarits fournis aux établissements.
- **API** : ressources REST par entité canonique, pagination, filtre incrémental
  (`modifie_depuis`), versionnées (`/v1`).
- Chaque format déclare la **version du schéma canonique** visée.

## H.2 Catalogue des connecteurs (V1 et au-delà)

| Connecteur | Type | Priorité V1 | Notes |
|---|---|---|---|
| `csv-excel` | Fichiers | **P1** | Gabarits par entité ; assistant d'import ; le plus universel (établissements sans SI). |
| `sql-postgresql` | SGBD | **P1** | Lecture via requêtes paramétrées + vues de mapping. |
| `sql-mysql-mariadb` | SGBD | **P1** | idem. |
| `sql-sqlserver` | SGBD | P2 | idem. |
| `sql-sqlite` | Fichier SGBD | P2 | Bases locales d'applications de bureau. |
| `sql-oracle` | SGBD | P3 | Selon présence réelle sur le terrain. |
| `sql-generic` | SGBD (pilote générique) | P2 | Repli pour tout SQL disposant d'un pilote standard. |
| `rest-api` | API | P2 | Pour les systèmes exposant une API ; mapping des ressources. |
| `dump-fichier` | Export/dump d'appli fermée | P2 | L'établissement fournit un export ; traité comme fichiers. |
| `proprietaire-<X>` | Sur mesure | à la demande | Développé si un système propriétaire est très répandu. |

**Responsabilités d'un connecteur** : connexion et authentification ; découverte du schéma source
(assistance au mapping) ; extraction complète et **incrémentale** ; pagination ; reprise sur
erreur ; **journalisation** des extractions ; **aucune** logique métier BuildNote (elle est dans le
mapping et la normalisation).

## H.3 Moteur de mapping (déclaratif)

### H.3.1 Principe
Un **fichier de mapping** par `(source, établissement)` décrit la traduction vers le canonique. Il
est versionné, testable, modifiable sans redéploiement du cœur.

### H.3.2 Grammaire (conceptuelle)

```yaml
mapping:
  version: "1.4"
  cible_schema_canonique: "v3"
  source: { type: "sql-mysql", ref: "sgbd-notes-lycee-japoma" }
  entites:
    - canonique: "Eleve"
      depuis: "SELECT * FROM eleves"                 # ou nom de table / ressource API / feuille Excel
      cle_rapprochement: ["matricule"]
      champs:
        matricule:        { depuis: "mat", requis: true }
        nom:              { depuis: "nom", transformer: ["trim", "upper"] }
        prenoms:          { depuis: "prenom" }
        date_naissance:   { depuis: "ddn", format_date: "DD/MM/YYYY" }
        sexe:             { depuis: "genre", table_valeurs: "sexe" }
      quarantaine_si:
        - "date_naissance is null"
    - canonique: "Note"
      depuis: "SELECT * FROM notes_composition"
      cle_rapprochement: ["id_eval", "id_eleve"]
      champs:
        valeur:           { depuis: "note_sur_20", type: "decimal", bareme: "sur_20" }
        origine:          { constant: "import" }
  tables_valeurs:
    sexe:      { "M": "masculin", "F": "feminin", "1": "masculin", "2": "feminin" }
    mention:   { "TB": "tres_bien", "B": "bien", "AB": "assez_bien", "P": "passable", "I": "insuffisant" }
```

### H.3.3 Fonctions de transformation de référence
`trim`, `upper`/`lower`, `normaliser_nom`, `format_date`, `remplacer_regex`, `concatener`,
`separer`, `defaut_si_vide`, `table_valeurs`, `convertir_bareme`, `arrondir`, `calculer_cle`.

### H.3.4 Assistance au mapping
- Découverte du schéma source (tables/colonnes/types ou ressources API ou colonnes de fichier).
- **Propositions automatiques** de correspondances par similarité de nom et de type.
- Détection des valeurs distinctes d'une colonne pour construire les `tables_valeurs`.
- Prévisualisation sur un échantillon avant exécution.

### H.3.5 Exemples complets

Trois mappings travaillés **bout en bout** (schéma source, fichier de mapping, tables de valeurs,
cas de quarantaine et de conflit, résultat attendu) dans
[`exemples-mapping.md`](exemples-mapping.md) : (A) SGBD MySQL d'une application scolaire, (B) fichiers
CSV/Excel tenus à la main, (C) ancienne application fermée via *dump*. Ces trois mappings forment la
**bibliothèque de référence** de la CI d'interopérabilité (§H.8).

## H.4 Pipeline d'exécution

> Le **contrat par étape** (entrées/sorties, idempotence, comportement en cas d'échec),
> l'ordonnancement, la reprise, le *dead-letter* et l'observabilité sont spécifiés dans
> [`etl-orchestration.md`](etl-orchestration.md). Les **séquences** correspondantes (import initial,
> synchro incrémentale, rejeu après correction) sont dans [`flux-et-sequences.md`](flux-et-sequences.md).

```mermaid
flowchart TB
    E["Extraction (connecteur)\nlot ou incrément"] --> B["Stockage brut\n(enregistrement_brut, immuable)"]
    B --> T["Transformation\n(application du mapping + fonctions)"]
    T --> N["Normalisation\n(types, dates, encodages, unités,\nbarèmes, référentiels, nom_normalise)"]
    N --> R["Rapprochement\n(clé de rapprochement → entité canonique existante ?)"]
    R --> V["Validation\n(schéma canonique + règles métier)"]
    V -->|conforme + pas de conflit| UP["Upsert dans le canonique\n(idempotent)"]
    V -->|conforme + conflit| CF["Résolution de conflit"]
    V -->|non conforme| Q["Quarantaine (motif)"]
    CF -->|auto (règle)| UP
    CF -->|revue| MR["File de revue manuelle"]
    Q --> MR
    UP --> L["Écriture du lineage"]
    MR --> V
```

### H.4.1 Règles de validation (exemples)
- Type et format conformes au dictionnaire de données.
- `Note.valeur` ∈ plage du `Bareme` déclaré.
- `Inscription` unique par (élève, classe, année).
- `Evaluation` rattachée à un `Enseignement` existant (ou créé si le mapping le prévoit).
- Cohérence temporelle (date d'évaluation dans la période / l'année scolaire).
- Complétude des champs obligatoires.

### H.4.2 Quarantaine
- Chaque enregistrement en quarantaine porte un **motif** structuré (règle violée, champ, valeur) et
  une **action possible** (corriger la valeur, ajuster le mapping, ignorer, forcer avec
  justification).
- Tableau de bord : volume, top motifs, ancienneté ; alerte au-delà d'un seuil.
- Rien n'est perdu : un enregistrement en quarantaine est rejouable après correction du mapping.

## H.5 Gestion des conflits

### H.5.1 Cas de conflit
1. Même entité (même clé de rapprochement) présente dans **plusieurs sources**.
2. Même entité importée **deux fois** avec des valeurs différentes.
3. Donnée importée en contradiction avec une donnée **validée dans BuildNote** (Module 1).

### H.5.2 Politique de préséance (configurable par établissement, par entité, par champ)

| Stratégie | Description | Défaut proposé |
|---|---|---|
| `source_prioritaire` | Une source fait foi pour ce champ | Module 1 (données validées) > SI officiel de l'établissement > imports secondaires |
| `dernier_horodatage` | La valeur la plus récente gagne | Pour les données peu sensibles (coordonnées) |
| `non_vide` | On complète les champs vides sans écraser les non vides | Par défaut pour l'enrichissement |
| `revue_manuelle` | Mise en file de revue | Pour les **notes** en contradiction avec une note validée |

### H.5.3 Règle forte
Une **note validée par le Module 1** n'est **jamais écrasée** par un import : tout écart va en
**revue manuelle** avec les deux valeurs, leurs sources et leur lineage. Séquences détaillées
(import ↔ note validée, import ↔ agent local hors-ligne) : [`flux-et-sequences.md`](flux-et-sequences.md)
§H-S.4 et §H-S.5.

### H.5.4 Journal des résolutions
Chaque conflit résolu (auto ou manuel) est journalisé : entité, champ, valeurs en présence, sources,
stratégie appliquée, décideur, horodatage.

## H.6 Traçabilité / lineage

Pour chaque entité canonique créée ou modifiée par l'interopérabilité :

```json
{
  "entite_canonique": "Note:uuid",
  "operation": "upsert",
  "import_externe_id": "uuid",
  "source": { "type": "sql-mysql", "ref": "sgbd-notes-lycee-japoma" },
  "enregistrement_brut_id": "uuid",
  "mapping": { "id": "uuid", "version": "1.4", "cible_schema_canonique": "v3" },
  "transformations": ["trim", "convertir_bareme(sur_20)"],
  "rapprochement": { "cle": ["id_eval","id_eleve"], "resultat": "match" },
  "conflit": null,
  "horodatage": "2026-09-08T10:12:00Z",
  "decideur": "systeme"
}
```

Le lineage est **consultable** depuis la fiche de toute donnée (d'où vient cette note ?) et
**exportable** pour audit.

## H.7 Import / Export / ETL

| Flux | Déclenchement | Mode |
|---|---|---|
| Import initial | Manuel (onboarding) | Complet, par lots, avec reprise |
| Synchronisation | Planifiée (ex. nocturne) ou événementielle si API | **Incrémentale** (curseur / `modifie_depuis`) |
| Import ponctuel | Manuel (assistant) | Fichiers CSV/Excel |
| Export tiers | Manuel ou planifié | Canonique → transformation de sortie → connecteur |
| Export de réversibilité | Manuel (rôle habilité) | **Intégralité** du patrimoine au format canonique documenté — format et procédure de ré-import : [`export-reversibilite.md`](export-reversibilite.md) |

**ETL** : l'orchestration des flux batch (extraction → transformation → chargement → contrôle
qualité) est un composant dédié (voir scénario d'architecture C —
[`../05-architecture-technique/scenarios-architecture.md`](../05-architecture-technique/scenarios-architecture.md)),
dimensionné séparément pour ne pas impacter la saisie du Module 1. **Spécification complète** :
[`etl-orchestration.md`](etl-orchestration.md).

## H.8 Versioning du schéma canonique (interopérabilité)

- `version_schema_canonique` : `vN`, datée, avec notes et scripts de migration.
- Un `mapping` **déclare** la version qu'il vise ; s'il est en retard sur la version courante, un
  message explicite invite à le mettre à jour ; le pipeline peut refuser l'exécution si l'écart est
  incompatible.
- **Compatibilité** : le cœur lit la version courante et la précédente pendant les migrations.
- **CI d'interopérabilité** : chaque version du canonique est testée contre une bibliothèque de
  mappings de référence (issus du POC 3 et des établissements) avant publication.

## H.9 Tableau de bord qualité des données

| Indicateur | Calcul | Seuil d'alerte |
|---|---|---|
| Complétude | champs obligatoires renseignés / attendus, par entité | < 95 % |
| Fraîcheur | ancienneté de la dernière synchronisation par source | > délai planifié × 2 |
| Taux de quarantaine | quarantaine / traités, par import | > 5 % (après stabilisation) |
| Taux de conflit | conflits / entités traitées | > 2 % |
| Taux de correction post-OCR | (issu du Module 1) | > 10 % (imprimé) |
| Doublons de personnes suspectés | paires à forte similarité non fusionnées | tendance à la hausse |
| Couverture connecteurs | établissements sans connecteur sur mesure / total | < 80 % |

## H.10 Sécurité de l'interopérabilité

- Secrets de connexion (`connecteur_config.parametres`) **chiffrés** au repos + coffre ; jamais
  journalisés ; rotation possible.
- Accès demandé aux sources **en lecture** et **limité au périmètre** nécessaire.
- Un connecteur est rattaché à **un** établissement ; aucun flux inter-établissements.
- Journalisation de chaque extraction (source, volume, horodatage, opérateur).
- Les fichiers importés sont analysés (type, taille, contenu) avant traitement.

## H.11 Lien avec le POC 3

Le [POC interopérabilité](../12-poc/plans-poc.md) validera cette architecture sur **2–3 systèmes
réels** correspondant aux [trois archétypes](exemples-mapping.md) : un SGBD, un export CSV/Excel, et
si possible une ancienne application. Critères : import d'un établissement type sans développement
lourd, taux de quarantaine maîtrisé, débit conforme à `ENF-PERF-06`, lineage complet, export
canonique réimportable dans une instance vierge avec **test d'équivalence** réussi
([`export-reversibilite.md`](export-reversibilite.md) §H-REV.5).
