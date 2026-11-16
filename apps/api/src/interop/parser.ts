/**
 * Parseur tabulaire robuste (CSV, TSV, point-virgule) pour l'interopérabilité (Lot L5).
 * Réf. docs/07-interoperabilite/architecture-detaillee.md §H.2 et exemples-mapping.md (Archétype B).
 */

export interface FichierTabulaireParse {
  delimiteur: string;
  enTetes: string[];
  lignes: Record<string, string>[];
  totalLignes: number;
}

/**
 * Détecte le délimiteur le plus probable parmi ';', ',', '\t'.
 */
export function detecterDelimiteur(premiereLigne: string): string {
  const pointsVirgules = (premiereLigne.match(/;/g) || []).length;
  const virgules = (premiereLigne.match(/,/g) || []).length;
  const tabulations = (premiereLigne.match(/\t/g) || []).length;

  if (pointsVirgules >= virgules && pointsVirgules >= tabulations && pointsVirgules > 0) return ';';
  if (tabulations > pointsVirgules && tabulations > virgules) return '\t';
  return ',';
}

/**
 * Découpe une ligne en colonnes en respectant les guillemets éventuels ("valeur avec ; ou ,").
 */
export function decouperLigne(ligne: string, delimiteur: string): string[] {
  const resultats: string[] = [];
  let courant = '';
  let dansGuillemets = false;

  for (let i = 0; i < ligne.length; i++) {
    const char = ligne[i];

    if (char === '"') {
      if (dansGuillemets && ligne[i + 1] === '"') {
        courant += '"';
        i++; // Sauter le guillemet échappé
      } else {
        dansGuillemets = !dansGuillemets;
      }
    } else if (char === delimiteur && !dansGuillemets) {
      resultats.push(courant.trim());
      courant = '';
    } else {
      courant += char;
    }
  }
  resultats.push(courant.trim());
  return resultats;
}

/**
 * Parse le contenu texte d'un fichier tabulaire.
 */
export function parserContenuTabulaire(
  contenuBrut: string,
  delimiteurForce?: string,
): FichierTabulaireParse {
  // Retirer l'éventuel BOM UTF-8
  const contenu = contenuBrut.replace(/^\uFEFF/, '').trim();
  if (!contenu) {
    return { delimiteur: ';', enTetes: [], lignes: [], totalLignes: 0 };
  }

  const lignesBrutes = contenu
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lignesBrutes.length === 0) {
    return { delimiteur: ';', enTetes: [], lignes: [], totalLignes: 0 };
  }

  const delimiteur = delimiteurForce ?? detecterDelimiteur(lignesBrutes[0]!);
  const enTetes = decouperLigne(lignesBrutes[0]!, delimiteur).map((h) =>
    h.replace(/^["']|["']$/g, '').trim(),
  );

  const lignes: Record<string, string>[] = [];

  for (let i = 1; i < lignesBrutes.length; i++) {
    const valeurs = decouperLigne(lignesBrutes[i]!, delimiteur).map((v) =>
      v.replace(/^["']|["']$/g, '').trim(),
    );

    const ligneObj: Record<string, string> = {};
    for (let c = 0; c < enTetes.length; c++) {
      const cle = enTetes[c];
      if (cle) {
        ligneObj[cle] = valeurs[c] ?? '';
      }
    }
    lignes.push(ligneObj);
  }

  return {
    delimiteur,
    enTetes,
    lignes,
    totalLignes: lignes.length,
  };
}
