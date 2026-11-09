# BuildNote — Référence projet pour les assistants IA

> Ce fichier est la **carte du projet**. Tout modèle (Claude Code, agents, autres LLM) doit le lire
> **avant toute modification** et s'y référer pour savoir *où* écrire, *dans quelle langue*, *à quelle
> couche* et *ce qui est interdit à ce stade*.
> `CLAUDE.md` et `AGENTS.md` ont un contenu identique — mettre à jour les deux ensemble.

---

## 1. Nature du projet

**BuildNote** = plateforme d'aide à la décision éducative (initiative **privée**, ambition
multi-établissements, **Cameroun**, extensible multi-pays). Deux modules **fonctionnellement
séparés**, ne partageant que le socle commun et communiquant par contrats d'API explicites :

| | Module 1 — Capture & gestion des données académiques | Module 2 — Orientation scolaire & universitaire |
|---|---|---|
| **But** | Transformer une fiche physique en données structurées **vérifiées** | Éclairer l'orientation + lire la performance (dashboard) |
| **Cœur** | OCR / Computer Vision / Document Understanding + **validation humaine obligatoire** | Moteur de règles + scoring multi-critères pondéré + génération d'**explications** |
| **Couplage** | Écrit dans la base normalisée (après validation) | Lit la base normalisée + le référentiel stratégique national, **à la demande** |

**Règles produit non négociables :**
1. Le Module 2 **ne recalcule rien automatiquement** ; dashboard et orientation lisent les bases **à la demande**.
2. Le Module 1 n'enregistre **jamais** une sortie OCR sans **revue humaine**.
3. Les recommandations d'orientation sont **explicables** et restent une **aide à la décision** — aucune carrière imposée.

Contexte de conception : SI scolaires hétérogènes ou inexistants, connectivité faible
(**offline-first** pour le Module 1), matériel modeste, interface **bilingue FR/EN**, architecture
**modulaire, interopérable, multi-tenant**.

---

## 2. Règles de travail (état au 2026-09-09)

- **Code : tout le périmètre est ouvert** ([`ADR-0004`](docs/17-decisions/ADR-0004-consolidation-flux-unique-developpement.md)).
  Socle, Module 1, Module 2 **et** interopérabilité peuvent être développés. Le gel « rien avant
  J7 » est levé ; **J7 devient une revue « prêt pour le pilote »**, pas une barrière. Les
  ADR-0001/0003 (dérogations de périmètre) sont ainsi **absorbés** par ADR-0004 ; leurs conditions
  restent en vigueur.
  - **Flux de développement unique** : tronc `main`, **branches de fonctionnalité courtes**, **PR
    revues une à la fois**. Plus de sessions parallèles ni de worktrees partagés (le §Sessions
    d'ADR-0003 est abrogé). Le travail avance par **lots** :
    [`docs/18-plan-developpement/plan-de-developpement.md`](docs/18-plan-developpement/plan-de-developpement.md)
    (L0 socle → L6 durcissement/pilote).
  - Les **règles produit non négociables (§1) sont vérifiées par des tests** (garde-fous) ; la CI
    échoue si un garde-fou manque ou casse.
  - **Frontières à risque derrière une interface** : OCR (`OcrProvider`, simulé par défaut — moteur
    non choisi), stockage objet (`BlobStore`), SGBD (Drizzle), identité/tenant (`IdentityProvider`),
    orientation (`OrientationDataGateway`, `ReferentialProvider`, `ScoringWeights`,
    `ExplanationTemplateCatalog`), connecteurs d'interopérabilité.
  - Stack fixée par [`ADR-0002`](docs/17-decisions/ADR-0002-stack-technologique-v1.md) (monorepo
    TypeScript), + [`ADR-0005`](docs/17-decisions/ADR-0005-multi-tenant-et-hebergement.md)
    (une instance PostgreSQL par établissement, on-premise ; `etablissement_id` + RLS partout) +
    [`ADR-0006`](docs/17-decisions/ADR-0006-socle-securite-v1.md) (session serveur + Argon2id +
    RBAC par établissement).
  - **Pas de MVP jetable** : viser la V1 de production, déploiement **pilote progressif** (un
    établissement à la fois).
  - Le code vit dans `packages/` et `apps/` ; `docs/` reste la **référence d'ingénierie**, tout
    écart code ↔ doc est **réconcilié dans `docs/`**.
  - **Les POC** (OCR 1/2, POC-VH, POC 4) sont menés **contre le code réel** et peuvent imposer des
    retouches, bornées par les interfaces.
- La **documentation** vit dans **`docs/`** : **Markdown + diagrammes Mermaid**, **en français**
  (le produit reste bilingue FR/EN). Le **code** est commenté en français, identifiants en anglais.
- La **conception documentaire** se poursuit **par couches** (portes de validation entre couches) ;
  elle ne bloque plus le code, qui avance par lots en parallèle.
- Chaque document porte un en-tête `> **Statut : …**` (Brouillon / En revue / Validé / À produire /
  Vivant) et une **date**.
- Les décisions d'architecture se tracent en **ADR** dans `docs/17-decisions/`.
- Terminologie imposée : `docs/glossaire.md` (FR + équivalent EN). Réutiliser ces termes exactement.
- Dates : **absolues** (jamais « la semaine prochaine »).

---

## 3. Structure du dépôt

```
BuildNote/
├── CLAUDE.md                     # ce fichier (référence projet)
├── AGENTS.md                     # copie identique de CLAUDE.md
├── README.md                    # entrée développeurs (monorepo, démarrage) — cf. ADR-0001/0002
├── package.json                 # npm workspaces (packages/*, apps/*)
├── images/                       # logos (logo.jpeg, logo1..4.jpeg) — actifs de marque
├── package-lock.json           # verrou npm (commité)
├── tsconfig.base.json          # config TS partagée (NodeNext, strict)
├── .github/workflows/ci.yml    # CI : typecheck, lint, lint i18n, tests (garde-fous)
├── scripts/lint-i18n.mjs       # parité FR/EN, placeholders, texte en dur
├── packages/
│   └── shared/                  # modèle canonique + contrats Zod (acquisition, OcrProvider, orientation) + i18n FR/EN
├── apps/
│   ├── api/                     # Fastify + Drizzle (PostgreSQL/PGlite) + BlobStore + OcrProvider
│   │                            #   src/{routes,services,db,ocr,blob,plugins} — acquisition Module 1
│   │                            #   src/orientation/ — service Module 2 (gateway, profileur, scoreur, règles, explications)
│   │                            #   test/ — garde-fous acquisition ; test/orientation/ — garde-fous Module 2
│   └── web/                     # React + Vite, PWA offline-first — À CRÉER (lot L2/L4)
└── docs/                         # corpus documentaire d'ingénierie (Markdown + Mermaid)
    ├── README.md                 # PORTE D'ENTRÉE : table des couches + synthèse exécutive (10 points) — suivi d'avancement
    ├── glossaire.md              # [Vivant] terminologie FR/EN imposée
    │
    ├── 00-vision/
    │   └── vision-produit.md     # [Couche 1] A. Vision produit
    ├── 01-project-management/
    │   ├── roadmap.md            # [Couche 1] B. Phases 0→11, jalons J0→J11, portes go/no-go
    │   ├── project-charter.md    # [Couche 2] B.1 document fondateur
    │   ├── gouvernance.md        # [Couche 2] B.2 principes, RACI
    │   ├── methodologie.md       # [Couche 2] B.3 hybride à portes de décision
    │   └── gestion-changements-versions-documentaire.md  # [Couche 2] B.4
    ├── 02-analyse-metier/
    │   ├── README.md             # sommaire de la section
    │   ├── analyse-metier.md     # [Couche 2] C. problématique, besoins, AS-IS/TO-BE
    │   ├── personas.md           # [Couche 2] C. personas & parcours utilisateurs
    │   └── cas-usage.md          # [Couche 2] C. cas d'utilisation
    ├── 03-cahier-des-charges/
    │   ├── README.md             # sommaire de la section
    │   ├── exigences-fonctionnelles.md        # [Couche 3] D. exigences F
    │   ├── exigences-non-fonctionnelles.md    # [Couche 3] D. exigences NF
    │   └── contraintes-kpi-tracabilite.md     # [Couche 3] D. contraintes, critères d'acceptation, KPI, matrice de traçabilité
    ├── 04-architecture-fonctionnelle/
    │   └── architecture-fonctionnelle.md  # [Couche 1] E. les 2 modules, séparés
    ├── 05-architecture-technique/
    │   ├── README.md             # sommaire de la section
    │   └── scenarios-architecture.md  # [Couche 3/4] F. scénarios d'architecture comparés + choix
    ├── 06-architecture-donnees/
    │   ├── vue-ensemble.md       # [Couche 1] G. strates Raw / Normalized / Intelligence
    │   └── modele-conceptuel-logique-physique.md  # [Couche 4] G. MCD / MLD / MPD + dictionnaire de données
    ├── 07-interoperabilite/
    │   ├── vue-ensemble.md       # [Couche 1] H. modèle canonique, connecteurs, mapping, ETL
    │   └── architecture-detaillee.md  # [Couche 4] H. catalogue connecteurs, langage de mapping, conflits, lineage, versioning schéma, qualité
    ├── 08-ocr-computer-vision/
    │   └── README.md             # [À produire — Couche 5] I. pipeline capture → validation humaine → stockage
    ├── 09-moteur-orientation/
    │   └── vue-ensemble.md       # [Couche 1] J. fusion multi-sources + explicabilité + dimension nationale (détail → Couche 5)
    ├── 10-securite/
    │   └── README.md             # [À produire — Couche 6] K. authn/authz, chiffrement, audit, isolation multi-tenant
    ├── 11-ux-ui/
    │   └── README.md             # [À produire — Couche 6] L. UX, design system (bleu clair / orange / blanc), i18n FR/EN
    ├── 12-poc/
    │   ├── README.md             # [Couche 7] M. index des POC (jetables)
    │   ├── plans-poc.md          # [Couche 7] cadrage des 4 POC + POC-VH + décision J7
    │   └── acquisition/          # [Couche 7] dossier d'exécution chaîne d'acquisition :
    │       │                     #   protocole · jeux-de-donnees · harnais-mesure · verification-humaine · modele-rapport
    │       └── …                 #   couvre POC 1 (OCR), POC 2 (tableaux), POC-VH (écran de vérification humaine)
    ├── 13-tests/
    │   └── README.md             # [À produire — Couche 7] O. stratégie et plans de test
    ├── 14-deploiement/
    │   ├── README.md             # [Couche 7] P. sommaire déploiement
    │   └── plan-deploiement.md   # [Couche 7] P. pilote → généralisation par vagues, composants, réversibilité
    ├── 15-livrables-par-phase/
    │   └── livrables.md          # [Couche 1] Q. par phase : objectif/activités/livrables/critères/responsables/dépendances/go-no-go
    ├── 16-risques/
    │   └── risques.md            # [Vivant] registre R1→R12 + mitigations, revu à chaque jalon
    ├── 17-decisions/
    │   ├── decisions-prealables.md  # [Vivant] 12 décisions à arbitrer + table des ADR
    │   ├── ADR-0001-…              # dérogation code Module 1 (absorbé par ADR-0004)
    │   ├── ADR-0002-…              # stack technologique (monorepo TypeScript)
    │   ├── ADR-0003-…              # extension dérogation Module 2 (absorbé par ADR-0004)
    │   ├── ADR-0004-…              # consolidation, flux unique, levée du gel  ← RÉGIME ACTUEL
    │   ├── ADR-0005-…              # multi-tenant (base/établissement) + hébergement on-premise
    │   └── ADR-0006-…              # socle sécurité v1 (session + Argon2id + RBAC)
    └── 18-plan-developpement/
        └── plan-de-developpement.md # [Vivant] lots de code L0→L6, portes de sortie
```

### Correspondance couches ↔ phases

| Couche | Contenu | Phase(s) du cycle de vie |
|---|---|---|
| **1** (livrée le 2026-09-08, à valider) | Vision, archi fonctionnelle, vues d'ensemble données/interop/orientation, roadmap, livrables, risques, décisions, glossaire | 0 |
| **2** | Project management complet, analyse métier, personas, cas d'usage | 0–1 |
| **3** | Cahier des charges, architecture technique | 2–3 |
| **4** | Architecture données détaillée (MCD/MLD/MPD), interopérabilité détaillée, sécurité | 4 |
| **5** | OCR/CV détaillé, moteur d'orientation détaillé | 4–5 |
| **6** | Sécurité, UX/UI | 4–6 |
| **7** | POC, tests, déploiement, consolidation des livrables | 6–7 |

> Les fichiers `README.md` marqués **« À produire »** sont des **stubs** : ils décrivent le contenu
> attendu de la section et sa couche. Ne pas les étoffer avant que leur couche soit ouverte.

---

## 4. Où intervenir selon la demande

| La demande porte sur… | Fichier(s) à modifier |
|---|---|
| Vision, finalités, cibles | `docs/00-vision/vision-produit.md` |
| Phases, jalons, planning, portes | `docs/01-project-management/roadmap.md` (+ autres fichiers `01-*` si Couche 2) |
| Séparation des modules, contrats, flux fonctionnels | `docs/04-architecture-fonctionnelle/architecture-fonctionnelle.md` |
| Exigences F / NF, contraintes, critères d'acceptation, KPI | `docs/03-cahier-des-charges/exigences-fonctionnelles.md`, `exigences-non-fonctionnelles.md`, `contraintes-kpi-tracabilite.md` |
| Scénarios d'architecture technique, choix de stack | `docs/05-architecture-technique/scenarios-architecture.md` |
| Strates de données, modèle canonique | `docs/06-architecture-donnees/vue-ensemble.md` ; MCD/MLD/MPD → `modele-conceptuel-logique-physique.md` |
| Connecteurs, mapping, ETL, qualité des données | `docs/07-interoperabilite/vue-ensemble.md` ; détail → `architecture-detaillee.md` |
| Pipeline OCR / vérification humaine | `docs/08-ocr-computer-vision/pipeline.md` (pipeline) |
| Exécution des POC d'acquisition (OCR, tableaux, écran de vérification) | `docs/12-poc/acquisition/` (protocole · jeux · harnais · verification-humaine · rapport) |
| Explicabilité, scoring, référentiel national | `docs/09-moteur-orientation/vue-ensemble.md` |
| Un risque nouveau ou modifié | `docs/16-risques/risques.md` |
| Une décision structurante | nouvel **ADR** dans `docs/17-decisions/` + ligne dans `decisions-prealables.md` |
| Priorité / découpage / porte de sortie d'un lot de code | `docs/18-plan-developpement/plan-de-developpement.md` |
| Un terme métier/technique | `docs/glossaire.md` |
| Livrables / critères de validation d'une phase | `docs/15-livrables-par-phase/livrables.md` |
| Suivi d'avancement, table des couches | `docs/README.md` |

**Après toute modification de structure** (nouveau dossier/fichier, changement de couche, de statut) :
mettre à jour la table de `docs/README.md` **et** l'arborescence de la section 3 ci-dessus (dans
`CLAUDE.md` et `AGENTS.md`).

---

## 5. Checklist avant d'écrire

**Pour un document (`docs/`)**
- [ ] La demande relève-t-elle d'une couche **déjà ouverte** ? Sinon, le signaler et ne pas produire.
- [ ] Rédaction **en français**, format **Markdown**, diagrammes en **Mermaid**.
- [ ] En-tête `Statut` + date présent et cohérent.
- [ ] Termes conformes au **glossaire** ; enrichir le glossaire si un terme manque.
- [ ] Liens internes relatifs corrects (`../dossier/fichier.md`).
- [ ] Répercuter dans `docs/README.md` (table des couches / suivi) et dans l'arborescence de ce fichier si la structure change.
- [ ] Cohérence avec les **3 règles produit non négociables** (§1) et les décisions déjà arbitrées.

**Pour du code (`packages/`, `apps/`)**
- [ ] Travailler sur une **branche de fonctionnalité courte** partant de `main` ; viser une **PR
  revue**. Pas de worktree partagé, pas de session parallèle sur le même arbre non commité.
- [ ] Le lot visé est-il cohérent avec [`plan-de-developpement.md`](docs/18-plan-developpement/plan-de-developpement.md) ? Respecter l'ordre L0→L6 (vertical avant horizontal).
- [ ] **Garde-fous non négociables** (cf. [ADR-0004 §3](docs/17-decisions/ADR-0004-consolidation-flux-unique-developpement.md)) : aucune écriture Normalized sans validation humaine explicite (`EF-M1-10/11`) ; `RAW` immuable ; aucun déclenchement Module 2 par une écriture de note (`EF-M1-19`) ; Module 2 lit **à la demande**, n'écrit rien en Normalized (`EF-M2-02/25`), reste une aide (non-prescription `EF-M2-19/26`), explicabilité = somme des contributions (`EF-M2-18`), consentement (`EF-M2-11`) ; `etablissement_id` + RLS sur toute donnée métier ; séparation stricte M1 ↔ M2 (seul `packages/shared` partagé).
- [ ] Frontières à risque derrière une **interface** : `OcrProvider` (simulé par défaut, pas de choix de moteur), `BlobStore`, Drizzle, `IdentityProvider`, `OrientationDataGateway`, `ReferentialProvider`, `ScoringWeights`, `ExplanationTemplateCatalog`, connecteurs.
- [ ] Textes UI **externalisés FR/EN** (aucun libellé en dur) ; identifiants en anglais, commentaires en français.
- [ ] `npm run typecheck && npm test && npm run lint:i18n` **verts** avant de committer ; garde-fous couverts par un test.
- [ ] Réconcilier tout écart code ↔ `docs/` (surtout `06-architecture-donnees/`, `08-ocr-computer-vision/`, `09-moteur-orientation/`, `10-securite/`).
