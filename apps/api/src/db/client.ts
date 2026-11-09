import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { DDL } from './ddl.js';
import { schema } from './schema.js';

export type Db = ReturnType<typeof drizzle<typeof schema>>;

export interface Database {
  readonly db: Db;
  readonly pg: PGlite;
  close(): Promise<void>;
}

/**
 * Crée la base (PGlite, dialecte PostgreSQL) et applique le DDL (idempotent).
 * @param chemin dossier de persistance ; `undefined`/'' → base en mémoire (tests).
 */
export async function creerBase(chemin?: string): Promise<Database> {
  const pg = chemin && chemin.trim() !== '' ? new PGlite(chemin) : new PGlite();
  await pg.waitReady;
  await pg.exec(DDL);
  const db = drizzle(pg, { schema });
  return {
    db,
    pg,
    async close() {
      await pg.close();
    },
  };
}
