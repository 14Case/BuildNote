# ADR-0001 — Dérogation à la règle « aucun code avant J7 » (démarrage du Module 1 — acquisition)

Date : 2026-09-09
Statut : Accepté
Portée : Module 1 uniquement — chaîne d'**acquisition** (capture → formulaire prérempli → vérification
humaine → validation → stockage Raw/Normalized). N'ouvre **pas** le développement du Module 2 ni de
l'interopérabilité.

## Contexte

Les règles de travail ([`CLAUDE.md`](../../CLAUDE.md) / [`AGENTS.md`](../../AGENTS.md), §2 ;
[`methodologie.md`](../01-project-management/methodologie.md)) imposent : **aucune ligne de code
avant la porte J7**, après exécution des POC (Phase 6). Le corpus documentaire des couches 1→7 est
produit (statut « En revue ») et le dossier d'exécution des POC d'acquisition est prêt
([`../12-poc/acquisition/`](../12-poc/acquisition/README.md)).

Le porteur décide de **démarrer le développement de la chaîne d'acquisition maintenant**, en
parallèle de (et non à la place de) la préparation des POC et de la validation documentaire. Cette
décision est un **changement critique** au sens de
[`gestion-changements-versions-documentaire.md`](../01-project-management/gestion-changements-versions-documentaire.md)
(elle touche une règle non négociable de méthode). Elle est tracée ici et répercutée dans
`CLAUDE.md` / `AGENTS.md`.

## Options envisagées

| Option | Avantages | Inconvénients |
|---|---|---|
| **A — Maintenir le gel jusqu'à J7** | Respect strict du phase-gate ; choix moteur OCR (#3) éclairé par les POC avant tout code | Retarde la mise en œuvre ; l'équipe reste sur du document alors que l'architecture d'acquisition est stabilisée |
| **B — Dérogation cadrée : coder l'acquisition derrière des abstractions, POC en parallèle** | Avance sur le socle non risqué (formulaire, vérification humaine, strates Raw/Normalized, offline) ; le point à risque (OCR) reste isolé derrière `OcrProvider` et non figé ; les POC continuent d'alimenter #3 | Sort du phase-gate ; risque de retouche si les POC invalident des hypothèses de structure ; nécessite discipline (pas de MVP jetable, V1 de production) |
| **C — Abandonner le phase-gate** | — | Perte du dérisquage ; incompatible avec les règles produit |

## Décision

**Option B.** Le développement de la **chaîne d'acquisition du Module 1** démarre, sous conditions :

1. **Règles produit non négociables inchangées et vérifiées par des tests** :
   vérification humaine obligatoire avant toute écriture Normalized (`EF-M1-10`) ; aucun
   déclenchement du Module 2 (`EF-M1-19`) ; Raw immuable ; isolation par établissement ;
   explicabilité des scores ; bilinguisme FR/EN de bout en bout.
2. **Le moteur OCR n'est pas choisi ici.** Toute reconnaissance passe par l'interface
   `OcrProvider` ([pipeline §I.15](../08-ocr-computer-vision/pipeline.md)). Le développement utilise
   un **fournisseur simulé** (fixtures). La décision #3 reste ouverte, tranchée après POC 1 & 2.
3. **Les POC d'acquisition restent au programme** (Phase 6) et peuvent invalider des hypothèses :
   le code de la couche de structure/compréhension est donc gardé derrière des interfaces.
4. **Pas de MVP jetable** : le code produit vise la V1 de production, avec déploiement pilote
   progressif (cohérent avec [ADR à venir sur #7] et la recommandation actée).
5. **Stack** : fixée par [ADR-0002](ADR-0002-stack-technologique-v1.md) (résout partiellement la
   décision #10 pour le périmètre acquisition).

## Conséquences

- `CLAUDE.md` / `AGENTS.md` passent d'un régime « refuser tout code » à « code autorisé sur le
  périmètre acquisition du Module 1, derrière abstractions ; reste du produit toujours gelé ».
- La roadmap ([`roadmap.md`](../01-project-management/roadmap.md)) : la Phase 8 (lot L0/L1) démarre
  en anticipation ; J7 reste la porte **GO/NO-GO global** et le point de choix du moteur OCR.
- Un dépôt de code est initialisé (monorepo `packages/` + `apps/`). Le `docs/` reste la référence
  d'ingénierie ; tout écart code ↔ doc est réconcilié dans `docs/`.
- Risque accepté : si POC 1/2 concluent à une approche OCR incompatible avec le contrat
  `OcrProvider` actuel, le contrat est révisé (impact limité au module d'extraction).
- Suivi : revue à J7 pour confirmer/infléchir cette dérogation ; ADR à créer pour #1, #2, #4, #7
  avant le déploiement pilote.
