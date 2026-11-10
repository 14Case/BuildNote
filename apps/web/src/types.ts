import type { BandeConfiance } from '@buildnote/shared';

export interface Utilisateur {
  id: string;
  nom: string;
  email: string;
  role: 'enseignant' | 'responsable' | 'admin' | 'admin_etablissement' | 'admin_technique';
  etablissementId: string;
}

export interface LotResume {
  id: string;
  statut: 'ouvert' | 'en_revue' | 'valide' | 'rejete';
  classeLibelle: string;
  matiereLibelle: string;
  evaluationLibelle: string;
  creeLe: string;
  nbLignes: number;
  nbACorriger: number;
  nbAControler: number;
  nbVerifie: number;
}

export interface CelluleHypothese {
  texte: string;
  score: number;
}

export interface CelluleNote {
  valeur: number | string | null;
  valeurLue: string;
  statut: 'note' | 'absent' | 'non_evalue';
  confiance: {
    score: number;
    bande: BandeConfiance;
  };
  hypotheses: CelluleHypothese[];
  modifieManuellement?: boolean;
}

export interface LigneSaisie {
  ligneIndex: number;
  eleveId: string | null;
  nomReconnu: string;
  nomOfficiel?: string;
  scoreRapprochement: number;
  note: CelluleNote;
  appreciation?: string;
  horsBareme?: boolean;
  garderHorsBareme?: boolean;
}

export interface FormulaireLot {
  lotId: string;
  statut: 'ouvert' | 'en_revue' | 'valide' | 'rejete';
  empreinte: string;
  evaluation: {
    id: string;
    libelle: string;
    type: string;
    bareme: {
      min: number;
      max: number;
      pas?: number;
    };
  };
  matiere: {
    libelleFr: string;
    libelleEn: string;
  };
  classe: {
    libelle: string;
  };
  lignes: LigneSaisie[];
  alertes: {
    lignesNonRapprochees: number;
    notesBasseConfiance: number;
    notesHorsBareme: number;
  };
  documentUri?: string;
}

export interface ElementFileSynchro {
  id: string;
  lotId: string;
  action: 'validation' | 'correction';
  idempotencyKey: string;
  payload: any;
  creeLe: string;
  statut: 'en_attente' | 'en_cours' | 'conflit' | 'erreur';
  erreur?: string;
}

// Module 2 — Types pour le Tableau de bord et l'Orientation
export interface EleveSituation {
  id: string;
  nom: string;
  prenoms: string;
  matricule?: string | null;
  classeId: string;
  classeLibelle: string;
  anneeScolaireId: string;
  consentement: {
    eleve: boolean;
    parents: boolean;
    valide: boolean;
    enregistreLe?: string | null;
  };
  questionnaire: {
    complet: boolean;
    centresInteret: string[];
    matieresPreferees: string[];
    aspirationsMetiers: string[];
    avisParents?: { filieres_souhaitees: string[]; priorite: number } | null;
    modifieLe?: string | null;
  };
  dernierDossier?: {
    id: string;
    palier: string;
    genereLe: string;
    recommandation: string | null;
    score: number | null;
  } | null;
  nbNotes: number;
}

export interface SituationClasse {
  classe: {
    id: string;
    libelle: string;
    anneeScolaireId: string;
  };
  stats: {
    totalEleves: number;
    avecConsentement: number;
    avecQuestionnaire: number;
    avecDossier: number;
  };
  eleves: EleveSituation[];
  derniereConsultation: string;
}
