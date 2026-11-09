import type { PerformanceMatiere, ProfilAcademique } from '@buildnote/shared';
import type { NoteValidee, SnapshotEleve } from './gateway.js';

export const VERSION_ALGO_PROFIL = 'profil-2026-09-1';

/** Régression linéaire simple : renvoie la pente (x = index chronologique). */
const pente = (valeurs: readonly number[]): number => {
  const n = valeurs.length;
  if (n < 2) return 0;
  const moyX = (n - 1) / 2;
  const moyY = valeurs.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - moyX) * (valeurs[i]! - moyY);
    den += (i - moyX) ** 2;
  }
  return den === 0 ? 0 : num / den;
};

/** Régularité : 1 - écart-type normalisé, borné dans [0,1]. */
const regularite = (valeurs: readonly number[]): number => {
  if (valeurs.length < 2) return 1;
  const moy = valeurs.reduce((s, v) => s + v, 0) / valeurs.length;
  const variance = valeurs.reduce((s, v) => s + (v - moy) ** 2, 0) / valeurs.length;
  return Math.max(0, Math.min(1, 1 - Math.sqrt(variance) * 2));
};

const noteNormalisee = (n: NoteValidee): number =>
  n.bareme_max > 0 ? Math.max(0, Math.min(1, n.valeur / n.bareme_max)) : 0;

/**
 * Construit le profil académique à partir de l'instantané (architecture-detaillee.md §J.3.2).
 * Tout est recalculable depuis Normalized ; on écrit une trace de version.
 */
export const construireProfil = (snapshot: SnapshotEleve): ProfilAcademique => {
  const parMatiere = new Map<string, NoteValidee[]>();
  for (const note of snapshot.notes_validees) {
    const liste = parMatiere.get(note.matiere) ?? [];
    liste.push(note);
    parMatiere.set(note.matiere, liste);
  }

  const performances: PerformanceMatiere[] = [...parMatiere.entries()]
    .map(([matiere, notes]): PerformanceMatiere => {
      const chrono = [...notes].sort((a, b) => a.date.localeCompare(b.date));
      const normalisees = chrono.map(noteNormalisee);
      const poids = chrono.reduce((s, n) => s + n.coefficient, 0);
      const niveau =
        poids > 0
          ? chrono.reduce((s, n) => s + noteNormalisee(n) * n.coefficient, 0) / poids
          : 0;
      return {
        matiere,
        niveau,
        position_relative: null,
        tendance: pente(normalisees),
        regularite: regularite(normalisees),
        nb_notes: chrono.length,
      };
    })
    .sort((a, b) => b.niveau - a.niveau);

  const seuilFort = 0.65;
  const seuilFragile = 0.45;

  return {
    eleve_id: snapshot.eleve_id,
    calcule_le: snapshot.instantane.horodatage,
    version_algo: VERSION_ALGO_PROFIL,
    performances,
    matieres_fortes: performances.filter((p) => p.niveau >= seuilFort).map((p) => p.matiere),
    matieres_fragiles: performances.filter((p) => p.niveau < seuilFragile).map((p) => p.matiere),
    style_travail:
      performances.length === 0
        ? 'indetermine'
        : performances.reduce((s, p) => s + p.regularite, 0) / performances.length >= 0.6
          ? 'regulier'
          : 'irregulier',
    competences: [],
    profondeur_historique_annees: snapshot.completude.profondeur_historique_annees,
  };
};
