import {
  PONDERATIONS_DEFAUT,
  type Consentement,
  type EntreeStrategiqueNationale,
  type EtablissementReference,
  type Filiere,
  type Formation,
  type JeuPonderations,
  type Metier,
  type OffreFormation,
  type VersionReferentiel,
  normaliserNiveau,
} from '@buildnote/shared';
import type {
  DemandeSnapshot,
  OrientationDataGateway,
  SnapshotEleve,
} from './gateway.js';
import type { PonderationsProvider, ReferentialProvider } from './referential.js';

/**
 * Fournisseurs par fixtures (ADR-0003 §2). Aucune dépendance externe :
 * remplacent référentiels + base le temps que les décisions #1/#4/#5 soient tranchées.
 */

const VERSION_REF: VersionReferentiel = {
  id: 'ref-2026-03',
  date_publication: '2026-03-01',
  anciennete_mediane_mois: 14,
};

const FILIERES: Filiere[] = [
  // Palier 1 : Primaire -> Secondaire (CM2 / Class 6)
  {
    id: 'fil-sec-general',
    libelle: { fr: 'Enseignement secondaire général', en: 'General secondary education' },
    palier: 'primaire_vers_secondaire',
    accessible_depuis: ['CM2', 'Class 6'],
    prerequis: [
      { matiere: 'Français', niveau_min: 0.5 },
      { matiere: 'Mathématiques', niveau_min: 0.5 },
    ],
  },
  {
    id: 'fil-sec-technique',
    libelle: { fr: 'Enseignement secondaire technique et professionnel', en: 'Technical and vocational secondary education' },
    palier: 'primaire_vers_secondaire',
    accessible_depuis: ['CM2', 'Class 6'],
    prerequis: [{ matiere: 'Mathématiques', niveau_min: 0.45 }],
  },
  // Palier 2 : 1er cycle secondaire -> 2nd cycle (3ème / 4ème année tech / Form 5)
  {
    id: 'fil-sciences',
    libelle: { fr: 'Série C — sciences', en: 'Science track' },
    palier: 'premier_cycle_vers_second_cycle',
    accessible_depuis: ['3eme', '2nde'],
    prerequis: [
      { matiere: 'Mathématiques', niveau_min: 0.55 },
      { matiere: 'Physique', niveau_min: 0.5 },
    ],
  },
  {
    id: 'fil-lettres',
    libelle: { fr: 'Série A — lettres', en: 'Humanities track' },
    palier: 'premier_cycle_vers_second_cycle',
    accessible_depuis: ['3eme', '2nde'],
    prerequis: [{ matiere: 'Français', niveau_min: 0.5 }],
  },
  {
    id: 'fil-techno',
    libelle: { fr: 'Série F — technologique', en: 'Technology track' },
    palier: 'premier_cycle_vers_second_cycle',
    accessible_depuis: ['3eme', '4eme annee technique'],
    prerequis: [{ matiere: 'Mathématiques', niveau_min: 0.45 }],
  },
  // Palier 3 : 2nd cycle secondaire -> Enseignement supérieur (Terminale / Upper Sixth)
  {
    id: 'fil-superieur-ingenierie',
    libelle: { fr: 'Écoles d\'ingénieurs et filières technologiques', en: 'Engineering and technology schools' },
    palier: 'terminale_vers_superieur',
    accessible_depuis: ['Terminale', 'Upper Sixth'],
    prerequis: [
      { matiere: 'Mathématiques', niveau_min: 0.6 },
      { matiere: 'Physique', niveau_min: 0.6 },
    ],
  },
];

const FORMATIONS: Formation[] = [
  { id: 'for-college-6e', filiere_id: 'fil-sec-general', libelle: { fr: 'Classe de 6e / Form 1', en: 'Form 1 / Grade 6' }, selectivite: 0.2, metiers: [] },
  { id: 'for-cetic-1re', filiere_id: 'fil-sec-technique', libelle: { fr: '1re Année Technique (CETIC)', en: '1st Year Technical' }, selectivite: 0.3, metiers: ['met-tech'] },
  { id: 'for-maths-info', filiere_id: 'fil-sciences', libelle: { fr: 'Licence Maths-Info', en: 'Maths-CS degree' }, selectivite: 0.4, metiers: ['met-data', 'met-ens'] },
  { id: 'for-physique', filiere_id: 'fil-sciences', libelle: { fr: 'Licence Physique', en: 'Physics degree' }, selectivite: 0.3, metiers: ['met-ing', 'met-ens'] },
  { id: 'for-lettres', filiere_id: 'fil-lettres', libelle: { fr: 'Licence Lettres', en: 'Literature degree' }, selectivite: 0.2, metiers: ['met-ens', 'met-comm'] },
  { id: 'for-genie', filiere_id: 'fil-techno', libelle: { fr: 'DUT Génie électrique', en: 'Electrical eng. diploma' }, selectivite: 0.5, metiers: ['met-ing', 'met-tech'] },
  { id: 'for-polytech', filiere_id: 'fil-superieur-ingenierie', libelle: { fr: 'Cycle Ingénieur Polytechnique', en: 'Polytechnic Engineering' }, selectivite: 0.8, metiers: ['met-ing', 'met-data'] },
];

const ETABS: EtablissementReference[] = [
  { id: 'etab-japoma', libelle: 'Lycée de Japoma', localisation: { lat: 4.02, lon: 9.79 } },
  { id: 'etab-akwa', libelle: 'Lycée technique d\'Akwa', localisation: { lat: 4.05, lon: 9.7 } },
  { id: 'etab-yde', libelle: 'Université de Yaoundé I', localisation: { lat: 3.87, lon: 11.5 } },
];

const OFFRES: OffreFormation[] = [
  { formation_id: 'for-college-6e', etablissement_reference_id: 'etab-japoma', internat: false, capacite: 300 },
  { formation_id: 'for-cetic-1re', etablissement_reference_id: 'etab-akwa', internat: false, capacite: 150 },
  { formation_id: 'for-maths-info', etablissement_reference_id: 'etab-japoma', internat: false, capacite: 120 },
  { formation_id: 'for-physique', etablissement_reference_id: 'etab-yde', internat: true, capacite: 80 },
  { formation_id: 'for-lettres', etablissement_reference_id: 'etab-japoma', internat: false, capacite: 200 },
  { formation_id: 'for-genie', etablissement_reference_id: 'etab-akwa', internat: false, capacite: 60 },
  { formation_id: 'for-polytech', etablissement_reference_id: 'etab-yde', internat: true, capacite: 200 },
];

const METIERS: Metier[] = [
  { id: 'met-data', libelle: { fr: 'ingénieur data', en: 'data engineer' }, competences_requises: ['raisonnement_quantitatif'], perspectives: 0.8 },
  { id: 'met-ing', libelle: { fr: 'ingénieur', en: 'engineer' }, competences_requises: ['raisonnement_quantitatif'], perspectives: 0.75 },
  { id: 'met-ens', libelle: { fr: 'enseignant', en: 'teacher' }, competences_requises: ['communication'], perspectives: 0.6 },
  { id: 'met-comm', libelle: { fr: 'chargé de communication', en: 'communications officer' }, competences_requises: ['communication'], perspectives: 0.5 },
  { id: 'met-tech', libelle: { fr: 'technicien de maintenance', en: 'maintenance technician' }, competences_requises: [], perspectives: 0.55 },
];

const ENTREES_STRAT: EntreeStrategiqueNationale[] = [
  {
    cible_type: 'metier',
    cible_ref: 'met-data',
    intensite: 0.8,
    secteur_prioritaire: true,
    source: {
      reference: 'SND30',
      organisme: 'MINEPAT',
      date_publication: '2020-11-16',
      date_consultation: '2026-03-01',
    },
  },
  {
    cible_type: 'metier',
    cible_ref: 'met-tech',
    intensite: 0.5,
    secteur_prioritaire: false,
    source: {
      reference: 'ONEFOP — note sectorielle',
      organisme: 'ONEFOP',
      date_publication: '2025-01-10',
      date_consultation: '2026-03-01',
    },
  },
];

export class ReferentialFixture implements ReferentialProvider {
  async versionCourante(): Promise<VersionReferentiel> {
    return VERSION_REF;
  }
  async filieresAccessibles(niveau: string): Promise<Filiere[]> {
    const norm = normaliserNiveau(niveau);
    return FILIERES.filter((f) => f.accessible_depuis.some((a) => a === niveau || a === norm));
  }
  async formationsDeFiliere(filiereId: string): Promise<Formation[]> {
    return FORMATIONS.filter((f) => f.filiere_id === filiereId);
  }
  async offresDeFormation(formationId: string): Promise<OffreFormation[]> {
    return OFFRES.filter((o) => o.formation_id === formationId);
  }
  async etablissement(refId: string): Promise<EtablissementReference | null> {
    return ETABS.find((e) => e.id === refId) ?? null;
  }
  async metiers(ids: readonly string[]): Promise<Metier[]> {
    return METIERS.filter((m) => ids.includes(m.id));
  }
  async entreesStrategiques(): Promise<EntreeStrategiqueNationale[]> {
    return ENTREES_STRAT;
  }
}

export class PonderationsFixture implements PonderationsProvider {
  constructor(private readonly jeux: JeuPonderations[] = [PONDERATIONS_DEFAUT]) {}
  async jeu(version?: string): Promise<JeuPonderations> {
    if (!version) return this.jeux[0]!;
    const trouve = this.jeux.find((j) => j.version === version);
    if (!trouve) throw new Error(`jeu de pondérations inconnu : ${version}`);
    return trouve;
  }
}

export interface DonneesEleveFixture {
  readonly consentement: Consentement | null;
  readonly snapshot: Omit<SnapshotEleve, 'instantane'>;
}

/**
 * Gateway par fixtures. Trace les `etablissement_id` reçus pour vérifier le
 * cloisonnement dans les tests.
 */
export class GatewayFixture implements OrientationDataGateway {
  readonly etablissementsInterroges: string[] = [];
  constructor(
    private readonly parEleve: ReadonlyMap<string, DonneesEleveFixture>,
    private readonly horloge: () => string = () => '2026-09-09T10:00:00.000Z',
  ) {}

  private trouver(d: DemandeSnapshot): DonneesEleveFixture {
    this.etablissementsInterroges.push(d.etablissement_id);
    const data = this.parEleve.get(d.eleve_id);
    if (!data) throw new Error(`élève inconnu : ${d.eleve_id}`);
    if (data.snapshot.etablissement_id !== d.etablissement_id) {
      throw new Error('cloisonnement : établissement de la demande ≠ établissement de l\'élève');
    }
    return data;
  }

  async lireConsentement(d: DemandeSnapshot): Promise<Consentement | null> {
    return this.trouver(d).consentement;
  }

  async ouvrirSnapshot(d: DemandeSnapshot): Promise<SnapshotEleve> {
    const horodatage = this.horloge();
    return {
      ...this.trouver(d).snapshot,
      instantane: { id: `snap-${d.eleve_id}-${horodatage}`, horodatage },
    };
  }
}
