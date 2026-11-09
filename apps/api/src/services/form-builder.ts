import {
  classerConfiance,
  controlerValeur,
  normaliserValeur,
  SEUILS_CONFIANCE_DEFAUT,
  type Bareme,
  type FormulairePrerempt,
  type LigneFormulaire,
  type Structure,
  VERSION_CONTRAT_ACQUISITION,
} from '@buildnote/shared';
import { rapprocher, type EleveConnu } from './matching.js';

export interface ContexteFormulaire {
  readonly lotId: string;
  readonly evaluation: { id: string; libelle: string; type: string; date: string | null; matiere: string };
  readonly bareme: Bareme;
  readonly structure: Structure;
  readonly eleves: readonly EleveConnu[];
}

function celluleTexte(structure: Structure, ligne: number, role: 'nom' | 'note' | 'appreciation'): {
  texte: string;
  score: number;
  bbox: [number, number, number, number] | null;
  variantes: { texte: string; score: number }[];
} | null {
  const colonne = structure.colonnes.find((c) =>
    role === 'nom' ? c.role === 'nom_prenom' || c.role === 'nom' : c.role === role,
  );
  if (!colonne) return null;
  const cell = structure.cellules.find((c) => c.ligne === ligne && c.colonne === colonne.index);
  if (!cell) return null;
  return {
    texte: cell.reconnaissance.texte,
    score: cell.reconnaissance.score,
    bbox: cell.reconnaissance.bbox,
    variantes: cell.reconnaissance.variantes,
  };
}

/**
 * Construit le formulaire prérempli (pipeline §I.8) à partir d'une structure OCR
 * et de la liste de classe. N'écrit rien : produit l'objet affiché à l'humain.
 */
export function construireFormulaire(ctx: ContexteFormulaire): FormulairePrerempt {
  const { structure, bareme, eleves } = ctx;
  const lignesIndices = [...new Set(structure.cellules.map((c) => c.ligne))].sort((a, b) => a - b);

  const lignes: LigneFormulaire[] = [];
  let horsBaremeCount = 0;

  for (const ligneIndex of lignesIndices) {
    const nom = celluleTexte(structure, ligneIndex, 'nom');
    const noteCell = celluleTexte(structure, ligneIndex, 'note');
    const apprCell = celluleTexte(structure, ligneIndex, 'appreciation');
    const nomReconnu = nom?.texte ?? '';

    const rap = rapprocher(nomReconnu, eleves);

    const valeurNorm = normaliserValeur(noteCell?.texte ?? '');
    const horsBareme =
      valeurNorm.valeur != null && !controlerValeur(valeurNorm.valeur, bareme).dansLesBornes;
    if (horsBareme) horsBaremeCount++;

    const score = noteCell?.score ?? 0;
    lignes.push({
      ligneIndex,
      rapprochement: {
        statut: rap.statut === 'auto' ? 'auto' : 'non_rapproche',
        eleveId: rap.eleveId,
        nomReconnu,
        score: rap.score,
      },
      note: {
        valeur: valeurNorm.valeur,
        statut: valeurNorm.statut,
        valeurOcr: noteCell?.texte ?? '',
        source: 'ocr',
        confiance: { score, bande: classerConfiance(score, SEUILS_CONFIANCE_DEFAUT) },
        variantes: noteCell?.variantes ?? [],
        bbox: noteCell?.bbox ?? null,
        horsBareme,
      },
      appreciation: apprCell
        ? {
            texte: apprCell.texte,
            source: 'ocr',
            confiance: {
              score: apprCell.score,
              bande: classerConfiance(apprCell.score, SEUILS_CONFIANCE_DEFAUT),
            },
            bbox: apprCell.bbox,
          }
        : null,
    });
  }

  const base: FormulairePrerempt = {
    lotId: ctx.lotId,
    versionContrat: VERSION_CONTRAT_ACQUISITION,
    evaluation: ctx.evaluation,
    bareme,
    entete: {
      matiereDetectee: structure.entete?.matiere ?? null,
      evaluationDetectee: structure.entete?.evaluation ?? null,
      dateDetectee: structure.entete?.date ?? null,
      divergence: false,
    },
    colonnesDetectees: structure.colonnes.map((c) => ({ index: c.index, role: c.role })),
    lignes,
    alertes: { horsBareme: horsBaremeCount, lignesNonRapprochees: 0, elevesSansNote: [], doublonsEleve: [] },
    resume: { nbLignes: lignes.length, nbNotes: 0, nbAbsents: 0, nbCorrigees: 0, nbConfirmees: 0, nbAControler: 0 },
    structureReconnue: structure.scoreStructure >= 0.7,
  };
  return recalculerDerive(base, eleves, bareme);
}

/**
 * Recalcule alertes + résumé à partir de l'état courant des lignes (après corrections humaines).
 * Ne touche pas au rapprochement ni aux valeurs : seulement les agrégats affichés.
 */
export function recalculerDerive(
  formulaire: FormulairePrerempt,
  eleves: readonly EleveConnu[],
  bareme: Bareme,
): FormulairePrerempt {
  const lignes = formulaire.lignes.map((l) => {
    const horsBareme = l.note.valeur != null && !controlerValeur(l.note.valeur, bareme).dansLesBornes;
    return { ...l, note: { ...l.note, horsBareme } };
  });

  const compteParEleve = new Map<string, number>();
  for (const l of lignes) {
    if (l.rapprochement.eleveId) {
      compteParEleve.set(l.rapprochement.eleveId, (compteParEleve.get(l.rapprochement.eleveId) ?? 0) + 1);
    }
  }
  const doublonsEleve = [...compteParEleve.entries()].filter(([, n]) => n > 1).map(([id]) => id);
  const elevesMatches = new Set(compteParEleve.keys());
  const elevesSansNote = eleves.filter((e) => !elevesMatches.has(e.eleveId)).map((e) => e.eleveId);
  const lignesNonRapprochees = lignes.filter((l) => l.rapprochement.statut === 'non_rapproche').length;
  const horsBaremeCount = lignes.filter((l) => l.note.horsBareme).length;

  return {
    ...formulaire,
    lignes,
    alertes: { horsBareme: horsBaremeCount, lignesNonRapprochees, elevesSansNote, doublonsEleve },
    resume: {
      nbLignes: lignes.length,
      nbNotes: lignes.filter((l) => l.note.valeur != null || l.note.statut != null).length,
      nbAbsents: lignes.filter((l) => l.note.statut === 'absent').length,
      nbCorrigees: lignes.filter((l) => l.note.source === 'corrige_manuellement').length,
      nbConfirmees: lignes.filter((l) => l.note.source === 'confirme').length,
      nbAControler: lignes.filter(
        (l) => (l.note.confiance.bande !== 'haute' && l.note.source === 'ocr') || l.note.horsBareme,
      ).length,
    },
  };
}
