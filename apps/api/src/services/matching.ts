/**
 * Rapprochement ligne ↔ élève de la classe (pipeline §I.6, EF-M1-05).
 * Tolérant aux fautes, aux ordres nom/prénoms et aux noms composés.
 */

export interface EleveConnu {
  readonly eleveId: string;
  readonly nom: string;
  readonly prenoms: string;
  readonly matricule?: string | null;
}

export interface ResultatRapprochement {
  readonly statut: 'auto' | 'non_rapproche';
  readonly eleveId: string | null;
  readonly score: number | null;
}

export function normaliserNom(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function distanceLevenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let precedente = Array.from({ length: n + 1 }, (_, i) => i);
  let courante = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    courante[0] = i;
    for (let j = 1; j <= n; j++) {
      const cout = a[i - 1] === b[j - 1] ? 0 : 1;
      courante[j] = Math.min(courante[j - 1]! + 1, precedente[j]! + 1, precedente[j - 1]! + cout);
    }
    [precedente, courante] = [courante, precedente];
  }
  return precedente[n]!;
}

/** Similarité 0..1 combinant recouvrement de jetons et distance d'édition. */
export function similariteNom(reconnu: string, candidat: string): number {
  const a = normaliserNom(reconnu);
  const b = normaliserNom(candidat);
  if (a === '' || b === '') return 0;
  if (a === b) return 1;

  const ja = new Set(a.split(' '));
  const jb = new Set(b.split(' '));
  const inter = [...ja].filter((t) => jb.has(t)).length;
  const recouvrement = inter / Math.max(ja.size, jb.size);

  const edit = 1 - distanceLevenshtein(a, b) / Math.max(a.length, b.length);

  return 0.6 * recouvrement + 0.4 * edit;
}

const SEUIL_AUTO = 0.72;

export function rapprocher(
  nomReconnu: string,
  eleves: readonly EleveConnu[],
  matriculeReconnu?: string,
): ResultatRapprochement {
  if (matriculeReconnu) {
    const parMatricule = eleves.find((e) => e.matricule && e.matricule === matriculeReconnu);
    if (parMatricule) return { statut: 'auto', eleveId: parMatricule.eleveId, score: 1 };
  }

  let meilleur: { eleveId: string; score: number } | null = null;
  for (const e of eleves) {
    const s = Math.max(
      similariteNom(nomReconnu, `${e.nom} ${e.prenoms}`),
      similariteNom(nomReconnu, `${e.prenoms} ${e.nom}`),
    );
    if (!meilleur || s > meilleur.score) meilleur = { eleveId: e.eleveId, score: s };
  }

  if (meilleur && meilleur.score >= SEUIL_AUTO) {
    return { statut: 'auto', eleveId: meilleur.eleveId, score: Number(meilleur.score.toFixed(3)) };
  }
  return { statut: 'non_rapproche', eleveId: null, score: meilleur ? Number(meilleur.score.toFixed(3)) : null };
}
