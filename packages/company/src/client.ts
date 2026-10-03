/**
 * Database clients.
 *
 * Two drivers, one schema:
 *   · PGlite  — real PostgreSQL compiled to WASM, in-process. Used by tests and by
 *               `npm run dev` so a new developer needs nothing installed.
 *   · node-postgres — production (`DATABASE_URL`).
 *
 * Both speak the same Drizzle API, so repository code is identical in tests and in production.
 */
import { drizzle as drizzlePglite, type PgliteDatabase } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as schema from './schema.js';

export const MIGRATIONS_FOLDER = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'migrations',
);

export type Schema = typeof schema;
export type Db = PgliteDatabase<Schema> | NodePgDatabase<Schema>;

/** In-process database. `dataDir` empty = in-memory (tests). */
export async function createPgliteDb(dataDir?: string) {
  // PGlite creates the database files but not their parent folders.
  if (dataDir) mkdirSync(dataDir, { recursive: true });
  const client = dataDir ? new PGlite(dataDir) : new PGlite();
  const db = drizzlePglite(client, { schema });
  await migratePglite(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return { db, client, close: () => client.close() };
}

/**
 * Production database over a connection pool.
 * Migrations run here, exactly as they do for PGlite — a deployment that has never been
 * migrated would otherwise fail at the first query instead of at start-up.
 */
export async function createPgDb(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl, max: 10 });
  const db = drizzlePg(pool, { schema });
  await migratePg(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return { db, pool, close: () => pool.end() };
}

export { schema };
