# BuildNote

Plateforme d'aide à la décision éducative (initiative privée, Cameroun, extensible multi-pays).
Deux modules **fonctionnellement séparés** :

1. **Module 1 — Capture & gestion des données académiques** : transformer une fiche papier en
   données structurées **vérifiées** (OCR/CV + vérification humaine obligatoire).
2. **Module 2 — Orientation scolaire & universitaire** : recommandations **explicables**, lecture de
   la performance (dashboard), lecture des bases **à la demande**.

> **Lire d'abord** [`CLAUDE.md`](CLAUDE.md) / [`AGENTS.md`](AGENTS.md) (carte du projet et règles de
> travail) et [`docs/README.md`](docs/README.md) (corpus d'ingénierie). Le régime de développement
> actuel est fixé par [`docs/17-decisions/ADR-0004`](docs/17-decisions/ADR-0004-consolidation-flux-unique-developpement.md) ;
> le découpage en lots par [`docs/18-plan-developpement/plan-de-developpement.md`](docs/18-plan-developpement/plan-de-developpement.md).

## Monorepo

| Espace de travail | Rôle |
|---|---|
| [`packages/shared`](packages/shared) | Modèle canonique + contrats Zod (acquisition, `OcrProvider`, orientation) + i18n FR/EN |
| [`apps/api`](apps/api) | API Fastify + Drizzle (PostgreSQL ; PGlite en dev) — acquisition Module 1 (`src/`) + service orientation Module 2 (`src/orientation/`) |
| `apps/web` | PWA React + Vite offline-first — **à créer** (lots L2 / L4) |

Stack : [ADR-0002](docs/17-decisions/ADR-0002-stack-technologique-v1.md) (monorepo TypeScript,
Node ≥ 20.11) · [ADR-0005](docs/17-decisions/ADR-0005-multi-tenant-et-hebergement.md) (une base
PostgreSQL par établissement, on-premise ; `etablissement_id` + RLS) ·
[ADR-0006](docs/17-decisions/ADR-0006-socle-securite-v1.md) (session serveur + Argon2id + RBAC).

## Démarrage

```bash
npm install
npm run typecheck        # tsc --noEmit sur tous les workspaces
npm test                 # garde-fous non négociables + tests unitaires
npm run lint:i18n        # parité FR/EN, placeholders, texte en dur
npm run dev:api          # API en local (PGlite, http://127.0.0.1:3001)
```

Variables d'environnement de l'API : voir [`apps/api/src/config.ts`](apps/api/src/config.ts)
(valeurs de dev par défaut ; `PGLITE_PATH` vide = base en mémoire).

## Garde-fous non négociables (vérifiés en CI)

Aucune écriture Normalized sans validation humaine explicite · `RAW` immuable · aucun déclenchement
du Module 2 par une écriture de note · Module 2 en lecture **à la demande**, n'écrit rien en
Normalized · aide à la décision, jamais prescription · explicabilité (somme des contributions ==
score) · consentement · isolation par `etablissement_id` · bilinguisme FR/EN de bout en bout.
Détail : [ADR-0004 §3](docs/17-decisions/ADR-0004-consolidation-flux-unique-developpement.md).

## Contribution

Branche de fonctionnalité courte depuis `main` → PR revue. Pas de worktree partagé ni de session
parallèle sur un arbre non commité. `npm run typecheck && npm test && npm run lint:i18n` verts avant
de committer.
