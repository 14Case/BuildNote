# ADR-0006 — Socle de sécurité v1 (authentification, autorisation, session)

Date : 2026-09-09
Statut : **Accepté** (porteur, 2026-09-09)
Portée : socle d'authentification / autorisation / session pour le code v1 (dev + pilote).
Concrétise une partie de la **Couche 6 sécurité**
([`docs/10-securite/architecture-securite.md`](../10-securite/architecture-securite.md)) sans la
figer entièrement. Complète [ADR-0004](ADR-0004-consolidation-flux-unique-developpement.md).

## Contexte

Le code d'acquisition utilise aujourd'hui une **authentification de développement** (jeton porteur
en clair → utilisateur), explicitement marquée « à remplacer en production ». Il faut un socle réel,
sobre, suffisant pour le pilote, sans préempter une éventuelle fédération d'identité (SSO
établissement / ministère) ultérieure.

## Décision

### 1. Authentification — session serveur + mot de passe

- **Mot de passe haché avec Argon2id** (paramètres OWASP courants : ≥ 19 MiB, t=2, p=1 ; ajustés au
  matériel du serveur). Jamais de mot de passe en clair ni de hachage réversible.
- **Session côté serveur** : identifiant de session opaque et aléatoire, stocké en base
  (`session`), transmis par **cookie** `HttpOnly` + `Secure` + `SameSite=Lax`, durée glissante,
  révocation immédiate possible (suppression de la ligne).
- **CSRF** : jeton anti-CSRF (double-submit ou en-tête `X-CSRF-Token`) sur toutes les mutations,
  puisque l'authentification passe par cookie.
- **Politique mot de passe** : longueur minimale, vérification contre une liste de mots de passe
  courants, verrouillage temporaire après échecs répétés, journalisation des tentatives.
- Pas de MFA en v1 ; point de compatibilité prévu (champ `mfa_*` sur l'utilisateur, non activé).

### 2. Autorisation — RBAC par établissement

- **Rôles** : `enseignant`, `responsable`, `admin_etablissement` (+ `admin_technique` pour
  l'exploitation locale). Rôles portés par l'utilisateur, **liés à un `etablissement_id`**.
- Contrôle d'accès **au niveau route** (le rôle requis est déclaré par endpoint) **et au niveau
  donnée** (`etablissement_id` du contexte de requête, cf. [ADR-0005 §2] : filtre applicatif + RLS).
- Le point d'ancrage `request.ctx` ({ `userId`, `etablissementId`, `role`, `nom` }) est **conservé**
  tel quel : seul le mécanisme qui le renseigne change (session au lieu du jeton dev).
- Séparation des devoirs pour la **contre-validation** Module 1 (`EF-M1-14`) : un `responsable` ne
  peut pas contre-valider son propre lot.

### 3. Frontière `IdentityProvider`

L'obtention de `request.ctx` passe par une interface **`IdentityProvider`** :

- implémentation v1 : `SessionIdentityProvider` (cookie de session + table `session`) ;
- le jeton dev existant devient `DevIdentityProvider`, **réservé aux tests et au dev** (jamais
  activable en production — garde-fou de configuration) ;
- implémentation future possible sans toucher aux routes : `OidcIdentityProvider` (SSO
  OpenID Connect), si un établissement ou le ministère fournit un annuaire.

### 4. Transport et en-têtes

- **HTTPS obligatoire** hors `localhost` (terminaison TLS au reverse-proxy du serveur
  d'établissement ; certificat interne accepté en pilote).
- En-têtes de sécurité : `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options:
  DENY`, `Content-Security-Policy` restrictive, `Referrer-Policy`.
- CORS restreint à l'origine du PWA de l'établissement (déjà en place, `WEB_ORIGIN`).

### 5. Journalisation

- **Journal d'audit** (`evenement_audit`, déjà présent) : connexion, échec de connexion,
  déconnexion, changement de rôle, création/révocation de compte, en plus des événements métier.
- Pas de donnée personnelle ni de secret dans les logs applicatifs.

## Conséquences

- Code attendu (lot L0) : table `session`, `IdentityProvider` + `SessionIdentityProvider`,
  hachage Argon2id, endpoints `POST /auth/login` · `POST /auth/logout` · `GET /auth/moi`,
  middleware CSRF, en-têtes de sécurité, garde-fou « `DevIdentityProvider` interdit si
  `NODE_ENV=production` ».
- `apps/api/src/plugins/auth.ts` : refactor derrière `IdentityProvider` ; les tests conservent
  `DevIdentityProvider`.
- `docs/10-securite/architecture-securite.md` : réconcilier §K.1–K.3 (authn/session/RBAC) avec cet
  ADR ; les points non couverts ici (chiffrement au repos, PKI, secrets, DPIA) restent « à
  produire » et relèvent des décisions #1/#2 et du lot L6.
- Reste ouvert : MFA, SSO/OIDC, coffre à secrets, chiffrement au repos géré — ADR ultérieurs.
