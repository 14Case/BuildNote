import {
  consentementComplet,
  demandeOrientationSchema,
  determinerPalierOrientation,
  type DemandeOrientation,
  type DossierOrientation,
  type EntreeDemande,
  type Filiere,
  type ScenarioDossier,
} from '@buildnote/shared';
import type { OrientationDataGateway } from './gateway.js';
import type { PonderationsProvider, ReferentialProvider } from './referential.js';
import { construireProfil } from './profiler.js';
import { genererScenariosCandidats } from './candidates.js';
import { scorerScenario, type ContexteScoring } from './scorer.js';
import { appliquerRegles, classer, verifierNonPrescription, type ScenarioRegle } from './rules.js';
import { construireExplication } from './explain.js';
import { assemblerDossier } from './assemble.js';

/** Erreur : consentement Module 2 absent ou incomplet (EF-M2-11). */
export class ConsentementRequisError extends Error {
  override readonly name = 'ConsentementRequisError';
  constructor() {
    super('Consentement Module 2 (élève + parents) requis pour générer un dossier.');
  }
}

export interface DependancesOrientation {
  readonly gateway: OrientationDataGateway;
  readonly referentiel: ReferentialProvider;
  readonly ponderations: PonderationsProvider;
  /** Génère l'identifiant de la demande (délégué : pas de hasard implicite ici). */
  readonly nouvelId: () => string;
  /** Position géographique de l'élève (issue de l'établissement d'inscription). */
  readonly positionEleve: (etablissementId: string) => Promise<{ lat: number; lon: number }>;
  readonly distanceMaxKm?: number;
}

/**
 * Génère un dossier d'orientation **à la demande** (architecture-detaillee.md §J.3).
 * Chaîne : garde consentement → instantané cohérent → profil → scénarios candidats
 * → règles → scoring additif pondéré → explications → assemblage.
 *
 * Ne modifie aucune donnée académique (EF-M2-25). Aucun déclenchement automatique
 * (EF-M1-19) : cette fonction n'est appelée que sur action explicite d'un conseiller.
 */
export const genererDossierOrientation = async (
  entree: EntreeDemande,
  deps: DependancesOrientation,
): Promise<DossierOrientation> => {
  const cle = {
    eleve_id: entree.eleve_id,
    etablissement_id: entree.etablissement_id,
    annee_scolaire_id: entree.annee_scolaire_id,
  };

  // 1. Garde : consentement (avant toute lecture de données)
  const consentement = await deps.gateway.lireConsentement(cle);
  if (!consentementComplet(consentement)) {
    throw new ConsentementRequisError();
  }

  // 2. Instantané cohérent + versions épinglées
  const [snapshot, versionRef, jeu] = await Promise.all([
    deps.gateway.ouvrirSnapshot(cle),
    deps.referentiel.versionCourante(),
    deps.ponderations.jeu(entree.version_ponderations),
  ]);

  const palier = entree.palier ?? determinerPalierOrientation(snapshot.niveau_courant) ?? undefined;

  const demande: DemandeOrientation = demandeOrientationSchema.parse({
    id: deps.nouvelId(),
    eleve_id: entree.eleve_id,
    etablissement_id: entree.etablissement_id,
    annee_scolaire_id: entree.annee_scolaire_id,
    declenchee_par: entree.declenchee_par,
    horodatage: snapshot.instantane.horodatage,
    langue: entree.langue,
    palier,
    version_referentiel_id: versionRef.id,
    version_ponderations: jeu.version,
    instantane: snapshot.instantane,
    statut: 'genere',
  });

  // 3. Profil (réutilise l'Intelligence si fraîche, sinon recalcul)
  const profil = snapshot.profil_existant ?? construireProfil(snapshot);

  // 4. Scénarios candidats
  const position = await deps.positionEleve(entree.etablissement_id);
  const candidats = await genererScenariosCandidats(
    snapshot,
    profil,
    deps.referentiel,
    versionRef.id,
    position,
  );

  // Contexte de scoring (référentiels épinglés)
  const entreesStrategiques = await deps.referentiel.entreesStrategiques(versionRef.id);
  const filieresParId = new Map<string, Filiere>(
    (await deps.referentiel.filieresAccessibles(snapshot.niveau_courant, versionRef.id)).map((f) => [
      f.id,
      f,
    ]),
  );
  const tousMetierIds = [...new Set(candidats.flatMap((c) => c.metiers.map((m) => m.id)))];
  const metiersParId = new Map(
    (await deps.referentiel.metiers(tousMetierIds, versionRef.id)).map((m) => [m.id, m]),
  );

  // 5. Scoring
  const evalues = candidats.map((candidat) => {
    const filiere = filieresParId.get(candidat.filiere_id);
    const ctx: ContexteScoring = {
      filiere: filiere ?? { id: candidat.filiere_id, libelle: { fr: candidat.filiere_libelle, en: candidat.filiere_libelle }, accessible_depuis: [snapshot.niveau_courant], prerequis: [] },
      metiersParId,
      entreesStrategiques,
    };
    return scorerScenario(candidat, profil, snapshot.saisies, ctx, jeu);
  });

  // 6. Règles + classement
  const regles = appliquerRegles(evalues, filieresParId, profil, deps.distanceMaxKm ?? 60);
  const classes = classer(regles);
  const reglesParFiliere = new Map<string, ScenarioRegle>(regles.map((r) => [r.candidat.filiere_id, r]));

  const alternativesTransverses = regles
    .filter((r) => r.verdict === 'ecarte' && r.ecarte)
    .map((r) => r.ecarte!);

  // 7. Explications + assemblage
  const scenariosDossier: ScenarioDossier[] = classes.map((sc) => {
    const regle = reglesParFiliere.get(sc.filiere_id)!;
    return {
      scenario: sc,
      explication: construireExplication(
        regle,
        snapshot.completude,
        versionRef.id,
        alternativesTransverses,
      ),
    };
  });

  const dossier = assemblerDossier({
    demande,
    scenarios: scenariosDossier,
    completude: snapshot.completude,
    versionReferentielId: versionRef.id,
    ancienneteMedianeMois: versionRef.anciennete_mediane_mois,
    versionPonderations: jeu.version,
    numeroVersion: 1,
    motif: 'initial',
  });

  // Contrôle de sortie « non-prescription » sur les libellés produits
  verifierNonPrescription([
    dossier.synthese,
    ...dossier.scenarios.map((s) => s.scenario.filiere_libelle),
  ]);

  return dossier;
};
