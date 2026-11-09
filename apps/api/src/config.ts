import { z } from 'zod';

/** Configuration de l'API, lue depuis l'environnement. Valeurs de dev par défaut. */
const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default('127.0.0.1'),
  /** Chemin de persistance PGlite ; vide = base en mémoire (tests). */
  PGLITE_PATH: z.string().default('./.data/db'),
  /** Racine du stockage des médias Raw (hors base). */
  BLOB_DIR: z.string().default('./.data/blobs'),
  /** Origines autorisées pour le CORS (front). */
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Config = z.infer<typeof schema> & { readonly enMemoire: boolean };

export function chargerConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const base = schema.parse(env);
  return { ...base, enMemoire: base.PGLITE_PATH.trim() === '' };
}
