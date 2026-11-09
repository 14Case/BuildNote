import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import type { Config } from './config.js';
import type { Database } from './db/client.js';
import { LocalBlobStore, type BlobStore } from './blob/store.js';
import { ErreurMetier } from './errors.js';
import { authPlugin } from './plugins/auth.js';
import { routesLots } from './routes/lots.js';
import { routesReference } from './routes/reference.js';

export interface AppDeps {
  readonly config: Config;
  readonly database: Database;
  readonly blobStore?: BlobStore;
}

export async function construireApp(deps: AppDeps): Promise<FastifyInstance> {
  const { config, database } = deps;
  const blobStore = deps.blobStore ?? new LocalBlobStore(config.BLOB_DIR);

  const app = Fastify({
    logger: { level: config.LOG_LEVEL },
    bodyLimit: 15 * 1024 * 1024,
  });

  app.decorate('db', database.db);
  app.decorate('blobStore', blobStore);

  await app.register(cors, { origin: config.WEB_ORIGIN.split(','), credentials: true });
  await app.register(multipart, { limits: { fileSize: 15 * 1024 * 1024, files: 1 } });
  await app.register(authPlugin, { db: database.db });

  // Le gestionnaire d'erreurs doit être posé AVANT l'enregistrement des routes :
  // un plugin encapsulé hérite du gestionnaire présent sur le parent au moment
  // de son enregistrement. Sinon les `ErreurMetier` levées dans les routes
  // ressortent en 500 (gestionnaire Fastify par défaut).
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ErreurMetier) {
      return reply.status(err.statut).send({ code: err.code, message: err.message, details: err.details });
    }
    if (err instanceof ZodError) {
      return reply.status(400).send({ code: 'validation', message: 'Requête invalide.', details: err.issues });
    }
    app.log.error(err);
    return reply.status(500).send({ code: 'interne', message: 'Erreur interne.' });
  });

  app.get('/health', async () => ({ ok: true, service: 'buildnote-api' }));

  await app.register(routesReference, { prefix: '/api/v1' });
  await app.register(routesLots, { prefix: '/api/v1' });

  return app;
}

declare module 'fastify' {
  interface FastifyInstance {
    db: Database['db'];
    blobStore: BlobStore;
  }
}
