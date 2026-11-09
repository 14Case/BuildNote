# G. Architecture des données — Index

> **Statut : En revue — Couche 4.** Date : 2026-09-09.

| Document | Contenu |
|---|---|
| [`vue-ensemble.md`](vue-ensemble.md) | Trois strates **Raw / Normalized / Intelligence**, invariants, aperçu des entités canoniques, gestion du temps, qualité, rétention/souveraineté (renvois Phase 2) |
| [`modele-conceptuel-logique-physique.md`](modele-conceptuel-logique-physique.md) | **MCD** (7 domaines), **MLD** (conventions + tables principales par strate), **MPD** (orientations SGBD, isolation multi-tenant), versioning et migration du schéma |
| [`dictionnaire-donnees.md`](dictionnaire-donnees.md) | **Dictionnaire de données** complet : chaque champ du canonique et des strates (type logique, obligatoire, valeurs/règle, sensibilité RGPD/PII, strate, source). Gelé à J4. |
| [`cycle-de-vie-stockage.md`](cycle-de-vie-stockage.md) | **Cycle de vie physique du stockage** : médias Raw, payloads OCR, journal d'audit, Intelligence Data ; rétention, purge, archivage, sauvegarde/restauration, chiffrement, coûts de stockage |

## Qui fait foi ?

| Artefact | Document de référence | Rôle |
|---|---|---|
| **Modèle Normalized (entités, attributs, contraintes)** | `06` — MCD/MLD/MPD + dictionnaire | **Source de vérité** de la forme des données métier BuildNote. |
| **Schéma canonique d'échange `vN`** | [`../07-interoperabilite/architecture-detaillee.md`](../07-interoperabilite/architecture-detaillee.md) §H.1 | **Projection documentée et versionnée publiquement** du sous-ensemble Normalized, pour l'import/export. N'introduit **aucune** entité absente du MCD ; peut restreindre, renommer, aplatir pour l'échange. |
| **Dictionnaire de données** | `06` — [`dictionnaire-donnees.md`](dictionnaire-donnees.md) | Référence unique au niveau **champ**. Le schéma d'échange cite le dictionnaire, ne le duplique pas. |

## Rattachements

- Cadre fonctionnel : [`../04-architecture-fonctionnelle/architecture-fonctionnelle.md`](../04-architecture-fonctionnelle/architecture-fonctionnelle.md).
- Exigences : `EF-M1-10/13` (strates & lineage), `EF-IOP-01/04/05/08/14`, `ENF-IOP-01/02/06`, `ENF-SEC-*`.
- Interopérabilité : [`../07-interoperabilite/`](../07-interoperabilite/README.md).
- Sécurité (chiffrement, isolation, DPIA) : [`../10-securite/architecture-securite.md`](../10-securite/architecture-securite.md).
- Décisions ouvertes : hébergement/souveraineté (#1), rétention (#2), multi-tenant (#4), SGBD (#10) — [`../17-decisions/decisions-prealables.md`](../17-decisions/decisions-prealables.md).
- Risques : R3 (hétérogénéité des SI), R4 (cadre juridique), R12 (qualité des données importées).
