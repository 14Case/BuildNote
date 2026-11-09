import type { FastifyInstance } from 'fastify';
import { construireApp } from '../src/app.js';
import { chargerConfig } from '../src/config.js';
import { creerBase, type Database } from '../src/db/client.js';
import { seedDemo, type SeedInfo } from '../src/db/seed-demo.js';
import { LocalBlobStore } from '../src/blob/store.js';

export interface BancEssai {
  app: FastifyInstance;
  database: Database;
  seed: SeedInfo;
  fermer(): Promise<void>;
}

class BlobMemoire extends LocalBlobStore {
  private readonly store = new Map<string, Uint8Array>();
  constructor() {
    super('/dev/null');
  }
  override async ecrire(cle: string, donnees: Uint8Array) {
    this.store.set(cle, donnees);
    const { createHash } = await import('node:crypto');
    return { uri: `mem://${cle}`, hash: createHash('sha256').update(donnees).digest('hex'), taille: donnees.byteLength };
  }
  override async lire(uri: string) {
    return this.store.get(uri.replace('mem://', '')) ?? new Uint8Array();
  }
}

export async function creerBancEssai(): Promise<BancEssai> {
  const database = await creerBase(); // PGlite en mémoire
  const seed = await seedDemo(database.db);
  const config = chargerConfig({
    PGLITE_PATH: '',
    BLOB_DIR: '/tmp',
    WEB_ORIGIN: 'http://test',
    LOG_LEVEL: 'silent',
    PORT: '3999',
    HOST: '127.0.0.1',
  } as NodeJS.ProcessEnv);
  const app = await construireApp({ config, database, blobStore: new BlobMemoire() });
  await app.ready();
  return {
    app,
    database,
    seed,
    async fermer() {
      await app.close();
      await database.close();
    },
  };
}

/** Requête JSON authentifiée. */
export function auth(jeton: string) {
  return { authorization: `Bearer ${jeton}` };
}
