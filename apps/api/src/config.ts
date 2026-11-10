import { z } from 'zod';

/** Configuration de l'API, lue depuis l'environnement. Valeurs de dev par défaut. */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default('127.0.0.1'),
  /** Chemin de persistance PGlite ; vide = base en mémoire (tests). */
  PGLITE_PATH: z.string().default('./.data/db'),
  /** URL de connexion PostgreSQL (production / Docker) */
  DATABASE_URL: z.string().optional(),
  /** Racine du stockage local des médias Raw (hors base). */
  BLOB_DIR: z.string().default('./.data/blobs'),
  /** Type de stockage objet : local (dossier) ou s3 (MinIO) */
  BLOB_STORE: z.enum(['local', 's3']).default('local'),
  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  /** Moteur OCR : 'mock' (défaut) ou 'http' (adaptateur optionnel POC 1/2) */
  OCR_PROVIDER: z.enum(['mock', 'http']).default('mock'),
  OCR_HTTP_URL: z.string().optional(),
  /** Origines autorisées pour le CORS (front). */
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Config = z.infer<typeof schema> & { readonly enMemoire: boolean };

export function chargerConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const base = schema.parse(env);
  return { ...base, enMemoire: !base.DATABASE_URL && base.PGLITE_PATH.trim() === '' };
}
