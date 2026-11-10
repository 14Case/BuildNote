import type { OcrProvider } from '@buildnote/shared';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import type { Config } from './config.js';
import type { Database } from './db/client.js';
import * as t from './db/schema.js';
import { LocalBlobStore, S3BlobStore, type BlobStore } from './blob/store.js';
import { ErreurMetier, obtenirMessageErreur } from './errors.js';
import { HttpOcrProvider } from './ocr/http-provider.js';
import { authPlugin } from './plugins/auth.js';
import { routesAuth } from './routes/auth.js';
import { routesLots } from './routes/lots.js';
import { routesOrientation } from './routes/orientation.js';
import { routesReference } from './routes/reference.js';

function extraireLangue(req: FastifyRequest): 'fr' | 'en' {
  const queryLang = (req.query as Record<string, string> | undefined)?.lang;
  if (queryLang === 'en' || queryLang === 'fr') return queryLang;
  const accept = req.headers['accept-language'];
  if (accept && accept.toLowerCase().startsWith('en')) return 'en';
  return 'fr';
}

export interface AppDeps {
  readonly config: Config;
  readonly database: Database;
  readonly blobStore?: BlobStore;
  readonly ocrProvider?: OcrProvider;
}

export async function construireApp(deps: AppDeps): Promise<FastifyInstance> {
  const { config, database } = deps;
  const blobStore =
    deps.blobStore ??
    (config.BLOB_STORE === 's3' && config.S3_ENDPOINT && config.S3_BUCKET
      ? new S3BlobStore({
          endpoint: config.S3_ENDPOINT,
          bucket: config.S3_BUCKET,
          accessKey: config.S3_ACCESS_KEY,
          secretKey: config.S3_SECRET_KEY,
        })
      : new LocalBlobStore(config.BLOB_DIR));

  const ocrProvider =
    deps.ocrProvider ??
    (config.OCR_PROVIDER === 'http' && config.OCR_HTTP_URL
      ? new HttpOcrProvider({ endpointUrl: config.OCR_HTTP_URL })
      : undefined);

  const app = Fastify({
    logger: { level: config.LOG_LEVEL },
    bodyLimit: 15 * 1024 * 1024,
  });

  app.decorate('db', database.db);
  app.decorate('blobStore', blobStore);
  app.decorate('ocrProvider', ocrProvider);

  // En-têtes de sécurité HTTP (ADR-0006 §4)
  app.addHook('onSend', async (_request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Content-Security-Policy', "default-src 'self'");
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (config.NODE_ENV === 'production') {
      reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
  });

  await app.register(cors, { origin: config.WEB_ORIGIN.split(','), credentials: true });
  await app.register(multipart, { limits: { fileSize: 15 * 1024 * 1024, files: 1 } });
  await app.register(authPlugin, { db: database.db, nodeEnv: config.NODE_ENV });

  // Gestionnaire d'erreurs global bilingue FR/EN
  app.setErrorHandler((err, req, reply) => {
    const lang = extraireLangue(req);
    if (err instanceof ErreurMetier) {
      const msg = obtenirMessageErreur(err.code, lang, err.message);
      return reply.status(err.statut).send({ code: err.code, message: msg, details: err.details ?? null });
    }
    if (err instanceof ZodError) {
      const msg = obtenirMessageErreur('validation', lang, 'Requête invalide.');
      return reply.status(400).send({ code: 'validation', message: msg, details: err.issues });
    }
    const anyErr = err as { statusCode?: number; code?: string };
    if (anyErr.statusCode === 413 || anyErr.code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
      const msg = obtenirMessageErreur('taille_trop_grande', lang, 'Fichier trop volumineux.');
      return reply.status(413).send({ code: 'taille_trop_grande', message: msg, details: null });
    }
    app.log.error(err);
    const msg = obtenirMessageErreur('interne', lang, 'Erreur interne.');
    return reply.status(500).send({ code: 'interne', message: msg });
  });

  // Observabilité : endpoints de santé et d'état (ADR-0005)
  app.get('/health', async () => ({ ok: true, service: 'buildnote-api' }));

  app.get('/ready', async (_req, reply) => {
    try {
      await database.db.select().from(t.etablissement).limit(1);
      return { ok: true, database: 'connected' };
    } catch {
      reply.status(503);
      return { ok: false, database: 'error' };
    }
  });

  // Enregistrement des routes de l'API v1
  await app.register(routesAuth, { prefix: '/api/v1' });
  await app.register(routesReference, { prefix: '/api/v1' });
  await app.register(routesLots, { prefix: '/api/v1' });
  await app.register(routesOrientation, { prefix: '/api/v1' });

  return app;
}

declare module 'fastify' {
  interface FastifyInstance {
    db: Database['db'];
    blobStore: BlobStore;
    ocrProvider?: OcrProvider;
  }
}
