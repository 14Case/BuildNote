import type { Bareme, Structure } from '@buildnote/shared';

export interface EleveScenario {
  readonly id: string;
  readonly nom: string;
  readonly prenoms: string;
}

export interface OptionsScenario {
  /** Graine pour rendre le scénario reproductible (par défaut : id du lot). */
  readonly graine: string;
  /** Ajoute une ligne « fantôme » (nom reconnu absent de la liste de classe). */
  readonly ligneNonRapprochee?: boolean;
  /** Nombre de valeurs délibérément hors barème. */
  readonly horsBareme?: number;
}

/* RNG déterministe (mulberry32) + hash de chaîne. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CONFUSIONS: Record<string, string> = { '1': '7', '7': '1', '0': '6', '3': '8', '4': '9' };

function bruiter(vraie: string, r: () => number): { texte: string; score: number } {
  const p = r();
  if (p < 0.62) return { texte: vraie, score: 0.9 + r() * 0.09 }; // haute confiance
  if (p < 0.85) {
    // confiance moyenne : parfois une confusion de chiffre
    const chars = vraie.split('');
    const i = Math.floor(r() * chars.length);
    const c = chars[i]!;
    if (CONFUSIONS[c] && r() < 0.5) chars[i] = CONFUSIONS[c]!;
    return { texte: chars.join(''), score: 0.7 + r() * 0.18 };
  }
  // confiance basse : chiffre manquant / caractère parasite
  return { texte: vraie.length > 1 && r() < 0.5 ? vraie.slice(0, -1) : vraie + '?', score: 0.35 + r() * 0.3 };
}

/**
 * Construit un scénario OCR simulé : une ligne par élève, colonnes [nom, note, appréciation],
 * avec bruit, scores de confiance réalistes et cas limites injectés.
 * Reproductible pour une même graine.
 */
export function construireScenarioMock(
  eleves: readonly EleveScenario[],
  bareme: Bareme,
  options: OptionsScenario,
): { structure: Structure; verite: Map<number, { valeurVraie: number | null; statutVrai: string | null }> } {
  const r = rng(hash(options.graine));
  const verite = new Map<number, { valeurVraie: number | null; statutVrai: string | null }>();
  const cellules: Structure['cellules'] = [];
  const largeurLigne = 48;
  const yBase = 200;

  const horsBaremeCible = options.horsBareme ?? 1;
  const indicesHorsBareme = new Set<number>();
  while (indicesHorsBareme.size < Math.min(horsBaremeCible, eleves.length)) {
    indicesHorsBareme.add(Math.floor(r() * eleves.length));
  }

  eleves.forEach((e, ligne) => {
    const y0 = yBase + ligne * largeurLigne;
    const y1 = y0 + largeurLigne - 6;
    const nomComplet = `${e.nom} ${e.prenoms}`;

    // Colonne 0 : nom (léger bruit sur ~10 %)
    const nomBruite = r() < 0.1 ? nomComplet.replace(/e/gi, 'é') : nomComplet;
    cellules.push({
      ligne,
      colonne: 0,
      reconnaissance: {
        texte: nomBruite,
        score: r() < 0.9 ? 0.88 + r() * 0.11 : 0.6 + r() * 0.2,
        variantes: [{ texte: nomComplet, score: 0.8 }],
        bbox: [80, y0, 520, y1],
        ecriture: 'imprime',
      },
    });

    // Colonne 1 : note
    const absent = r() < 0.04;
    if (absent) {
      verite.set(ligne, { valeurVraie: null, statutVrai: 'absent' });
      cellules.push({
        ligne,
        colonne: 1,
        reconnaissance: {
          texte: r() < 0.5 ? 'Abs' : 'A',
          score: 0.72 + r() * 0.2,
          variantes: [{ texte: 'Abs', score: 0.75 }],
          bbox: [540, y0, 700, y1],
          ecriture: 'manuscrit',
        },
      });
    } else {
      let vraie = Math.round((bareme.min + r() * (bareme.max - bareme.min)) * 4) / 4;
      if (indicesHorsBareme.has(ligne)) vraie = bareme.max + 2 + Math.floor(r() * 4); // hors barème injecté
      verite.set(ligne, { valeurVraie: vraie, statutVrai: null });
      const texteVrai = String(vraie);
      const b = bruiter(texteVrai, r);
      cellules.push({
        ligne,
        colonne: 1,
        reconnaissance: {
          texte: b.texte,
          score: b.score,
          variantes:
            b.texte === texteVrai ? [] : [{ texte: texteVrai, score: Math.min(0.95, b.score + 0.15) }],
          bbox: [540, y0, 700, y1],
          ecriture: 'manuscrit',
        },
      });
    }

    // Colonne 2 : appréciation (parfois absente)
    if (r() < 0.55) {
      const appr = ['Bon travail', 'Peut mieux faire', 'Assez bien', 'Des efforts à fournir'][
        Math.floor(r() * 4)
      ]!;
      cellules.push({
        ligne,
        colonne: 2,
        reconnaissance: {
          texte: appr,
          score: 0.55 + r() * 0.35,
          variantes: [],
          bbox: [720, y0, 1180, y1],
          ecriture: 'manuscrit',
        },
      });
    }
  });

  let nbLignes = eleves.length;

  // Ligne non rapprochée : un nom qui n'est pas dans la liste
  if (options.ligneNonRapprochee) {
    const ligne = nbLignes++;
    const y0 = yBase + ligne * largeurLigne;
    cellules.push({
      ligne,
      colonne: 0,
      reconnaissance: {
        texte: 'NGONO Estelle',
        score: 0.86,
        variantes: [],
        bbox: [80, y0, 520, y0 + largeurLigne - 6],
        ecriture: 'imprime',
      },
    });
    cellules.push({
      ligne,
      colonne: 1,
      reconnaissance: {
        texte: '13.5',
        score: 0.8,
        variantes: [],
        bbox: [540, y0, 700, y0 + largeurLigne - 6],
        ecriture: 'manuscrit',
      },
    });
  }

  const structure: Structure = {
    zones: { entete: [40, 60, 1200, 180], tableau: [40, 190, 1200, yBase + nbLignes * largeurLigne + 20], piedDePage: null },
    nbLignes,
    colonnes: [
      { index: 0, role: 'nom_prenom', libelleEntete: 'Nom et prénom', scoreRole: 0.97 },
      { index: 1, role: 'note', libelleEntete: `Note /${bareme.max}`, scoreRole: 0.95 },
      { index: 2, role: 'appreciation', libelleEntete: 'Appréciation', scoreRole: 0.9 },
    ],
    cellules,
    entete: { texteBrut: 'Établissement pilote — Évaluation' },
    scoreStructure: 0.92,
    sansBordure: false,
  };

  return { structure, verite };
}
