import {
  normaliserNom,
  normaliserDate,
  parserNombreDecimal,
  estValeurAbsence,
  normaliserNiveau,
  type CanoniqueEleve,
  type CanoniqueClasse,
  type CanoniqueMatiere,
  type CanoniqueEvaluation,
  type CanoniqueNote,
  type CanoniqueLotImport,
  type ConfigurationMapping,
} from '@buildnote/shared';
import type { FichierTabulaireParse } from './parser.js';

export interface LigneQuarantaineData {
  ligneNumero: number;
  entite: string;
  motifCode: string;
  message: string;
  donneesBrutes: Record<string, any>;
}

export interface ResultatMapping {
  lot: CanoniqueLotImport;
  quarantaines: LigneQuarantaineData[];
  statistiques: {
    lignesLues: number;
    elevesExtraits: number;
    notesValides: number;
    lignesQuarantaine: number;
  };
}

/**
 * Moteur de mapping appliquant la configuration déclarative (Lot L5).
 * Réf. docs/07-interoperabilite/architecture-detaillee.md §H.3 et exemples-mapping.md.
 */
export function executerMappingTabulaire(
  parse: FichierTabulaireParse,
  config: ConfigurationMapping,
): ResultatMapping {
  const anneeScolaire = config.anneeScolaireDefaut;
  const classeLibelle = config.classeLibelleDefaut ?? 'Classe Import';
  const niveau = config.niveauDefaut ?? normaliserNiveau(classeLibelle);

  const elevesMap = new Map<string, CanoniqueEleve>();
  const matieresMap = new Map<string, CanoniqueMatiere>();
  const evaluationsMap = new Map<string, CanoniqueEvaluation>();
  const notesList: CanoniqueNote[] = [];
  const quarantaines: LigneQuarantaineData[] = [];

  // 1. Déclarer la classe canonique
  const classesList: CanoniqueClasse[] = [
    {
      libelle: classeLibelle,
      niveau,
      anneeScolaire,
    },
  ];

  const tc = config.tableauCroise;

  if (tc && tc.actif) {
    // Mode Tableau Croisé (Archétype B) : Élève en ligne, Matières en colonnes
    const colonnesIgnorer = new Set((tc.colonnesIgnorées ?? []).map((c) => c.toLowerCase()));

    // Identifier les colonnes représentant des matières
    const colonnesMatieres = parse.enTetes.filter((h) => {
      const hNorm = h.toLowerCase();
      const estColonneEleve = (tc.colonnesEleve ?? []).some((ce) => ce.toLowerCase() === hNorm);
      const estIgnoree = colonnesIgnorer.has(hNorm);
      return !estColonneEleve && !estIgnoree;
    });

    // Enregistrer les matières canoniques
    for (const colMat of colonnesMatieres) {
      const codeCanonique =
        config.tableSynonymesMatieres[colMat.toUpperCase()] ??
        config.tableSynonymesMatieres[colMat.replace(/[^A-Za-z]/g, '').toUpperCase()] ??
        colMat.toUpperCase().slice(0, 10);

      if (!matieresMap.has(codeCanonique)) {
        matieresMap.set(codeCanonique, {
          code: codeCanonique,
          libelleFr: colMat,
          libelleEn: colMat,
          coefficientDefaut: 1,
        });
      }

      // Créer l'évaluation associée
      const evalCle = `${classeLibelle}_${codeCanonique}_${tc.periodeParDefaut}`;
      if (!evaluationsMap.has(evalCle)) {
        evaluationsMap.set(evalCle, {
          idInterne: evalCle,
          classeLibelle,
          matiereCode: codeCanonique,
          anneeScolaire,
          periode: tc.periodeParDefaut,
          type: tc.typeEvalParDefaut,
          libelle: `Évaluation ${tc.periodeParDefaut} — ${colMat}`,
          baremeMax: tc.baremeParDefaut,
        });
      }
    }

    // Parcourir chaque ligne élève
    for (let index = 0; index < parse.lignes.length; index++) {
      const ligne = parse.lignes[index]!;
      const ligneNumero = index + 2; // +1 pour 1-indexed, +1 pour la ligne d'en-tête

      // Extraction de l'identité de l'élève
      let nomComplet =
        ligne['Nom & Prénom'] ??
        ligne['Nom & Prenom'] ??
        ligne['Nom et Prénom'] ??
        ligne['Nom'] ??
        '';

      if (!nomComplet.trim()) {
        quarantaines.push({
          ligneNumero,
          entite: 'Eleve',
          motifCode: 'champ_manquant',
          message: 'Nom de l’élève manquant ou vide',
          donneesBrutes: ligne,
        });
        continue;
      }

      let nom = nomComplet;
      let prenoms = ligne['Prénom'] ?? ligne['Prenom'] ?? '';

      // Si Nom & Prénom sont fusionnés sur une seule colonne
      if (!prenoms && nomComplet.includes(' ')) {
        const parts = nomComplet.trim().split(/\s+/);
        nom = parts[0]!;
        prenoms = parts.slice(1).join(' ');
      }

      nom = normaliserNom(nom);
      prenoms = prenoms.trim();

      const matricule = ligne['Matricule']?.trim() || undefined;
      const ddnBrute = ligne['Né(e) le'] ?? ligne['Date de naissance'] ?? ligne['Date naissance'] ?? '';
      const dateNaissance = ddnBrute ? normaliserDate(ddnBrute) ?? undefined : undefined;

      const sexeBrut = (ligne['Sexe'] ?? ligne['Genre'] ?? '').trim().toUpperCase();
      let sexe: 'masculin' | 'feminin' | 'non_precise' = 'non_precise';
      if (sexeBrut === 'M' || sexeBrut === 'G' || sexeBrut === 'MASCULIN') sexe = 'masculin';
      else if (sexeBrut === 'F' || sexeBrut === 'FEMININ') sexe = 'feminin';

      const eleveCle = matricule || `${nom}_${prenoms}`;
      if (!elevesMap.has(eleveCle)) {
        elevesMap.set(eleveCle, {
          matricule,
          nom,
          prenoms,
          sexe,
          dateNaissance,
          classeLibelle,
          anneeScolaire,
        });
      }

      // Extraction des notes pour chaque colonne matière
      for (const colMat of colonnesMatieres) {
        const codeMatiere =
          config.tableSynonymesMatieres[colMat.toUpperCase()] ??
          config.tableSynonymesMatieres[colMat.replace(/[^A-Za-z]/g, '').toUpperCase()] ??
          colMat.toUpperCase().slice(0, 10);

        const valCellule = ligne[colMat]?.trim();

        // Cellule vide : pas de note saisie
        if (!valCellule || valCellule === '') continue;

        // Cas absence
        if (estValeurAbsence(valCellule)) {
          notesList.push({
            eleveMatricule: matricule,
            eleveNom: nom,
            elevePrenoms: prenoms,
            classeLibelle,
            matiereCode: codeMatiere,
            evaluationLibelle: `Évaluation ${tc.periodeParDefaut} — ${colMat}`,
            anneeScolaire,
            valeur: null,
            statut: 'absent',
          });
          continue;
        }

        // Cas valeur numérique
        const num = parserNombreDecimal(valCellule);
        if (num === null) {
          quarantaines.push({
            ligneNumero,
            entite: 'Note',
            motifCode: 'format_inconnu',
            message: `Valeur non interprétable pour la matière ${colMat} : "${valCellule}"`,
            donneesBrutes: { eleve: nomComplet, matiere: colMat, valeur: valCellule },
          });
          continue;
        }

        // Contrôle barème (0 à baremeParDefaut)
        if (num < 0 || num > tc.baremeParDefaut) {
          quarantaines.push({
            ligneNumero,
            entite: 'Note',
            motifCode: 'valeur_hors_bareme',
            message: `Note hors barème [0, ${tc.baremeParDefaut}] : ${num} en ${colMat}`,
            donneesBrutes: { eleve: nomComplet, matiere: colMat, valeur: num },
          });
          continue;
        }

        // Note valide conforme
        notesList.push({
          eleveMatricule: matricule,
          eleveNom: nom,
          elevePrenoms: prenoms,
          classeLibelle,
          matiereCode: codeMatiere,
          evaluationLibelle: `Évaluation ${tc.periodeParDefaut} — ${colMat}`,
          anneeScolaire,
          valeur: num,
          statut: 'note',
        });
      }
    }
  }

  const lot: CanoniqueLotImport = {
    versionSchema: 'v1',
    source: config.referenceSource,
    anneeScolaire,
    eleves: Array.from(elevesMap.values()),
    classes: classesList,
    matieres: Array.from(matieresMap.values()),
    evaluations: Array.from(evaluationsMap.values()),
    notes: notesList,
  };

  return {
    lot,
    quarantaines,
    statistiques: {
      lignesLues: parse.lignes.length,
      elevesExtraits: lot.eleves.length,
      notesValides: lot.notes.length,
      lignesQuarantaine: quarantaines.length,
    },
  };
}
