import { fr, type MessageKey } from './fr.js';
import { en } from './en.js';

export type { MessageKey };
export { fr, en };

export const LANGUES = ['fr', 'en'] as const;
export type Langue = (typeof LANGUES)[number];
export const LANGUE_DEFAUT: Langue = 'fr';

const CATALOGUES: Record<Langue, Record<MessageKey, string>> = { fr, en };

export function estLangue(v: unknown): v is Langue {
  return typeof v === 'string' && (LANGUES as readonly string[]).includes(v);
}

/**
 * Traduit une clé avec interpolation `{param}`.
 * Repli sur FR puis sur la clé elle-même (jamais de texte vide à l'écran).
 */
export function traduire(
  langue: Langue,
  cle: MessageKey,
  params?: Record<string, string | number>,
): string {
  const modele = CATALOGUES[langue]?.[cle] ?? fr[cle] ?? cle;
  if (!params) return modele;
  return modele.replace(/\{(\w+)\}/g, (_, p: string) =>
    p in params ? String(params[p]) : `{${p}}`,
  );
}

export function catalogue(langue: Langue): Record<MessageKey, string> {
  return CATALOGUES[langue] ?? fr;
}
