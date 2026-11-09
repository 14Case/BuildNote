import type {
  EntreeStrategiqueNationale,
  EtablissementReference,
  Filiere,
  Formation,
  JeuPonderations,
  Metier,
  OffreFormation,
  VersionReferentiel,
} from '@buildnote/shared';

/**
 * Fournisseur de référentiels (offre, métiers, stratégique national), lu à une
 * **version épinglée** au moment de la demande (architecture-detaillee.md §J.3.1).
 * Décision #5 (gouvernance du référentiel national) non tranchée → implémentation
 * par fixtures en attendant (ADR-0003 §2).
 */
export interface ReferentialProvider {
  versionCourante(): Promise<VersionReferentiel>;

  /** Filières accessibles depuis un niveau donné. */
  filieresAccessibles(niveau: string, versionId: string): Promise<Filiere[]>;
  formationsDeFiliere(filiereId: string, versionId: string): Promise<Formation[]>;
  offresDeFormation(formationId: string, versionId: string): Promise<OffreFormation[]>;
  etablissement(refId: string, versionId: string): Promise<EtablissementReference | null>;
  metiers(ids: readonly string[], versionId: string): Promise<Metier[]>;

  /** Entrées du référentiel stratégique national pour la version épinglée. */
  entreesStrategiques(versionId: string): Promise<EntreeStrategiqueNationale[]>;
}

/**
 * Fournisseur de pondérations : renvoie un jeu **versionné**. Le défaut publié
 * est utilisé si aucune version n'est demandée (EF-M2-20).
 */
export interface PonderationsProvider {
  jeu(version?: string): Promise<JeuPonderations>;
}
