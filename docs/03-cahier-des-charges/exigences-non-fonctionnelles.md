# D. Exigences non fonctionnelles — BuildNote

> **Statut : En revue — Couche 3.** Date : 2026-09-08.
> Convention : `ENF-<catégorie>-<n>`. Les cibles chiffrées sont **provisoires** : elles seront
> confirmées ou ajustées par les POC (Phase 6) et le pilote (Phase 10).

## D.1 Performance & réactivité

| ID | Exigence | Cible provisoire |
|---|---|---|
| ENF-PERF-01 | Traitement OCR/CV d'une fiche standard (une classe, ~40 lignes) de la capture au formulaire prérempli. | ≤ 20 s sur appareil de milieu de gamme, traitement local ou serveur ; ≤ 45 s en mode dégradé hors-ligne |
| ENF-PERF-02 | Affichage et navigation dans le formulaire de vérification. | Interactions < 150 ms ; ouverture de la zone image d'une cellule < 500 ms |
| ENF-PERF-03 | Enregistrement d'un lot validé (≤ 40 notes). | ≤ 3 s en ligne ; immédiat hors-ligne (mise en file) |
| ENF-PERF-04 | Calcul d'un dashboard de situation à l'échelle d'un établissement moyen. | ≤ 5 s pour un périmètre classe/niveau ; ≤ 15 s pour un groupe d'établissements |
| ENF-PERF-05 | Génération d'un dossier d'orientation individuel complet. | ≤ 10 s |
| ENF-PERF-06 | Import interopérabilité d'un établissement moyen (historique 3 ans). | Traitement par lots avec reprise ; débit ≥ X lignes/s (à établir au POC 3) |
| ENF-PERF-07 | Empreinte réseau de la synchronisation d'une journée de saisie hors-ligne. | Minimale ; compression des médias ; reprise partielle |

## D.2 Disponibilité & résilience

| ID | Exigence | Cible provisoire |
|---|---|---|
| ENF-DISP-01 | Disponibilité du service central (hors coupures réseau locales de l'établissement). | ≥ 99,0 % mensuel (pilote) → ≥ 99,5 % (généralisation) |
| ENF-DISP-02 | Le Module 1 reste pleinement utilisable pendant une panne du service central. | Fonctionnement hors-ligne, synchronisation différée à la reprise |
| ENF-DISP-03 | Aucune perte de donnée validée en cas de coupure pendant la synchronisation. | File locale durable, synchronisation idempotente, reprise |
| ENF-DISP-04 | Objectif de point de reprise (RPO). | ≤ 24 h (données centrales) ; 0 pour les données validées localement non encore synchronisées (conservées) |
| ENF-DISP-05 | Objectif de temps de reprise (RTO). | ≤ 4 h pour le service central |
| ENF-DISP-06 | Sauvegardes testées. | Sauvegarde quotidienne + test de restauration mensuel |

## D.3 Sécurité

| ID | Exigence | Cible |
|---|---|---|
| ENF-SEC-01 | Chiffrement en transit de toutes les communications. | TLS 1.2+ ; pas de canal en clair |
| ENF-SEC-02 | Chiffrement au repos des données personnelles, des médias et des secrets. | Chiffrement au niveau stockage + secrets dans un coffre |
| ENF-SEC-03 | Isolation des établissements. | Vérifiée par tests d'isolation automatisés à chaque release ; 0 fuite tolérée |
| ENF-SEC-04 | Contrôle d'accès. | RBAC + ABAC, moindre privilège, révision périodique des accès |
| ENF-SEC-05 | Traçabilité. | Journal d'audit inviolable en append-only, horodaté, conservé selon la politique de rétention |
| ENF-SEC-06 | Gestion des vulnérabilités. | Analyse de dépendances en continu ; correctifs critiques sous 7 j ; test d'intrusion avant mise en production et à chaque évolution majeure |
| ENF-SEC-07 | Authentification. | MFA obligatoire pour les rôles sensibles ; politique de mots de passe ; verrouillage après tentatives |
| ENF-SEC-08 | Gestion des secrets d'accès aux sources externes. | Chiffrés, jamais journalisés, rotation possible |
| Détail | Voir [`../10-securite/`](../10-securite/). | |

## D.4 Confidentialité & protection des données

| ID | Exigence | Cible |
|---|---|---|
| ENF-CONF-01 | Minimisation : seules les données nécessaires à une finalité déclarée sont collectées. | DPIA + registre des traitements |
| ENF-CONF-02 | Base légale et consentement (élèves mineurs, parents) pour les traitements du Module 2. | Consentement enregistré, retirable |
| ENF-CONF-03 | Durées de conservation définies par strate et par catégorie de données. | Politique de rétention appliquée automatiquement |
| ENF-CONF-04 | Droits des personnes : accès, rectification, opposition, effacement dans les limites légales. | Procédure outillée |
| ENF-CONF-05 | Pseudonymisation pour les analyses agrégées et les jeux de test. | Pas de données réelles identifiantes hors production |
| ENF-CONF-06 | Localisation des données conforme à la décision de souveraineté (#1). | Hébergement conforme documenté |
| ENF-CONF-07 | Non-discrimination du moteur d'orientation : pas d'usage de critères sensibles prohibés ; audit régulier des recommandations. | Rapport d'audit périodique |

## D.5 Portabilité & interopérabilité

| ID | Exigence | Cible |
|---|---|---|
| ENF-IOP-01 | Le cœur BuildNote ne dépend d'aucun schéma externe ; il n'utilise que le modèle canonique. | Vérifié en revue d'architecture |
| ENF-IOP-02 | Réversibilité : un établissement peut récupérer 100 % de ses données au format canonique documenté. | Export complet testé |
| ENF-IOP-03 | Le format canonique et les formats d'échange sont documentés et versionnés publiquement pour les établissements. | Spécification publiée |
| ENF-IOP-04 | Ajout d'un nouveau connecteur sans modification du cœur. | Architecture à extension par connecteurs |
| ENF-IOP-05 | Indépendance vis-à-vis d'un fournisseur OCR : le moteur est remplaçable via une interface interne stable. | Abstraction vérifiée ; au moins une alternative évaluée |
| ENF-IOP-06 | Indépendance vis-à-vis d'un SGBD unique pour le cœur (dans la mesure du raisonnable). | Choix justifié en Phase 4 ; couche d'accès aux données isolant le SGBD |

## D.6 Utilisabilité & accessibilité

| ID | Exigence | Cible |
|---|---|---|
| ENF-UX-01 | Un enseignant peut réaliser une capture + validation sans formation longue. | Prise en main < 15 min ; tâche réussie au 1er essai par ≥ 80 % des testeurs |
| ENF-UX-02 | La validation d'une fiche est plus rapide que la saisie manuelle équivalente. | ≤ 40 % du temps manuel (mesuré au pilote) |
| ENF-UX-03 | Contrastes et tailles conformes à un niveau d'accessibilité AA. | Vérifié sur le design system |
| ENF-UX-04 | Navigation clavier complète pour les écrans de saisie/correction. | 100 % des actions accessibles au clavier |
| ENF-UX-05 | Interface utilisable sur écrans modestes et petits appareils. | Testé sur matériel bas de gamme représentatif |
| ENF-UX-06 | Les explications d'orientation sont compréhensibles par une famille non spécialiste. | ≥ 80 % de compréhension déclarée au pilote |
| ENF-UX-07 | Messages d'erreur explicites et actionnables (FR/EN). | Revue éditoriale |

## D.7 Internationalisation

| ID | Exigence | Cible |
|---|---|---|
| ENF-I18N-01 | 100 % des textes visibles sont externalisés (aucune chaîne codée en dur). | Lint i18n en CI |
| ENF-I18N-02 | FR et EN complets à chaque release (UI, messages, exports, explications, documentation utilisateur). | Couverture de traduction = 100 % dans la DoD |
| ENF-I18N-03 | L'architecture i18n permet d'ajouter une langue sans refonte. | Revue d'architecture |
| ENF-I18N-04 | Formats locaux (dates, nombres, noms) gérés par paramétrage. | Vérifié |
| ENF-I18N-05 | Contenus du référentiel et libellés métier gérés en FR/EN. | Modèle de données bilingue pour les libellés |

## D.8 Maintenabilité & évolutivité

| ID | Exigence | Cible |
|---|---|---|
| ENF-MAINT-01 | Architecture modulaire : les deux modules et le socle sont séparables, avec contrats explicites. | Revue d'architecture |
| ENF-MAINT-02 | Couverture de tests automatisés du cœur métier. | ≥ 80 % lignes / ≥ 70 % branches sur les composants critiques |
| ENF-MAINT-03 | Le code respecte des conventions documentées et passe l'analyse statique. | CI bloquante |
| ENF-MAINT-04 | Toute décision d'architecture est tracée en ADR. | 100 % des choix majeurs |
| ENF-MAINT-05 | Le produit est reprenable par une autre équipe à partir de la seule documentation. | Revue de complétude à J9 |
| ENF-MAINT-06 | Dette technique suivie et plafonnée. | Indicateur au tableau de bord projet |

## D.9 Scalabilité

| ID | Exigence | Cible provisoire |
|---|---|---|
| ENF-SCAL-01 | Passage de 1 à N établissements sans refonte. | Multi-tenant natif ; coût marginal maîtrisé |
| ENF-SCAL-02 | Montée en charge du pipeline OCR indépendamment du reste. | Composant OCR dimensionnable séparément |
| ENF-SCAL-03 | Volumétrie cible V1. | À préciser (nombre d'établissements, d'élèves, de notes/an) en fin de Phase 0 |
| ENF-SCAL-04 | Les calculs du Module 2 sont dimensionnables séparément et n'impactent pas la saisie (Module 1). | Séparation des charges |
| ENF-SCAL-05 | Extension multi-pays : aucun élément propre au Cameroun câblé sans point d'extension (référentiels, système de notation, structure des cycles, langues). | Revue d'architecture |

## D.10 Observabilité & exploitation

| ID | Exigence | Cible |
|---|---|---|
| ENF-OPS-01 | Journaux applicatifs structurés et centralisés (hors données personnelles inutiles). | En place dès le lot L0 |
| ENF-OPS-02 | Métriques techniques et métier (traitements OCR, taux de correction, synchros, calculs Module 2). | Tableau de bord d'exploitation |
| ENF-OPS-03 | Alertes sur indisponibilité, échecs de synchronisation, échecs d'import, anomalies de sécurité. | Seuils définis |
| ENF-OPS-04 | Déploiements reproductibles et réversibles. | CI/CD, artefacts immuables, retour arrière documenté |
| ENF-OPS-05 | Runbooks pour les opérations courantes et les incidents. | Livrés à J9 |

## D.11 Contexte matériel & connectivité

| ID | Exigence | Cible |
|---|---|---|
| ENF-CTX-01 | Fonctionnement sur smartphones Android de milieu/bas de gamme représentatifs du terrain. | Testé sur parc de référence |
| ENF-CTX-02 | Fonctionnement acceptable sur connexions lentes et intermittentes. | Testé en réseau dégradé (Phase 9) |
| ENF-CTX-03 | Fonctionnement en cas d'absence totale de connexion pendant plusieurs jours (Module 1). | File locale durable, pas de perte, synchro à la reprise |
| ENF-CTX-04 | Consommation de données mobiles maîtrisée et visible par l'utilisateur. | Indicateur + réglages |
