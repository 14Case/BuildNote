import { createHash } from 'node:crypto';

/** Empreinte stable d'un objet JSON (clés triées) — sert d'anti-écrasement à la validation. */
export function empreinteStable(valeur: unknown): string {
  return createHash('sha256').update(canonique(valeur)).digest('hex');
}

function canonique(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return `[${v.map(canonique).join(',')}]`;
  const entrees = Object.entries(v as Record<string, unknown>)
    .filter(([, val]) => val !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entrees.map(([k, val]) => `${JSON.stringify(k)}:${canonique(val)}`).join(',')}}`;
}
