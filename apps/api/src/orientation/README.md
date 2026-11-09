# Service orientation (Module 2)

Projection exécutable de [`docs/09-moteur-orientation/`](../../../../docs/09-moteur-orientation/).
Ouvert par [ADR-0003](../../../../docs/17-decisions/ADR-0003-extension-derogation-module-2-orientation.md).
Stack : [ADR-0002](../../../../docs/17-decisions/ADR-0002-stack-technologique-v1.md).

## Chaîne (`service.ts` → `genererDossierOrientation`)

| Étape | Fichier | Réf. doc |
|---|---|---|
| Garde consentement (avant toute lecture) | `service.ts` | §J.3.1, EF-M2-11 |
| Instantané cohérent + versions épinglées | `gateway.ts` (`OrientationDataGateway`) | §J.3.1 |
| Profil académique (recalcul si Intelligence absente) | `profiler.ts` | §J.3.2 |
| Scénarios candidats (filière → formations → établissements → métiers) | `candidates.ts` | §J.3.3 |
| Moteur de règles (prérequis, géo, garde-fous, non-prescription) | `rules.ts` | §J.3.4, EF-M2-17/26 |
| Scoreur additif pondéré, 6 catégories, neutralisation + redistribution | `scorer.ts` | §J.3.5 |
| Explications : les 5 blocs | `explain.ts` | §J.3.6, EF-M2-18 |
| Assemblage du dossier + avertissement de fiabilité gradué | `assemble.ts` | §J.3.7, gabarits §J.P.3/J.P.6 |

## Frontières derrière interfaces (non figées)

- `OrientationDataGateway` — lecture ; **aucune méthode d'écriture** (EF-M2-25).
- `ReferentialProvider` — offre / métiers / référentiel stratégique national, **versionné**
  (décision #5 non tranchée → `ReferentialFixture`).
- `PonderationsProvider` — jeux de pondérations versionnés (`PONDERATIONS_DEFAUT` publié).

## Garde-fous vérifiés par les tests (`test/`)

- refus sans consentement complet, aucune lecture préalable ;
- cloisonnement par établissement sur chaque appel gateway ;
- explication complète (5 blocs) ; Σ contributions ≤ score ; catégorie « besoins nationaux »
  visible comme les autres ;
- contrôle lexical « non-prescription » sur les sorties ;
- neutralisation + redistribution quand une catégorie n'a pas de données.

## Reste à faire

- `apps/api` : exposition HTTP (Fastify) des endpoints `POST /orientation/dossiers`,
  dashboard de situation (`EF-M2-01`..`06`) ; persistance Drizzle (`demande_orientation`, …).
- `apps/web` : écrans Dossier d'orientation et Dashboard (gabarits §J.P.4–J.P.7).
- Rendu FR/EN des clés de gabarit dans l'export (le dossier porte les clés + params).
