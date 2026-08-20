import initSqlJs from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { SCHEMA_SQL, SCHEMA_VERSION } from './schema';
import { loadDatabaseBytes, saveDatabaseBytes } from './storage';

type SqlJsStatic = Awaited<ReturnType<typeof initSqlJs>>;
export type SqlDatabase = InstanceType<SqlJsStatic['Database']>;

let databasePromise: Promise<SqlDatabase> | null = null;

// True under both plain Node and Vitest (which runs in a real Node process
// even with the jsdom test environment), false in an actual browser bundle.
const isNodeRuntime = typeof process !== 'undefined' && !!process.versions?.node;

async function resolveWasmLocation(): Promise<string> {
  /* v8 ignore else -- real-browser-only path; verified manually via `npm run build` (see PR description) since Vitest always runs under Node. */
  if (isNodeRuntime) {
    // sql.js's Node build reads the wasm file straight off disk. The
    // `?url` import below resolves to a dev-server-relative path under
    // Vitest instead of a real one, so resolve the actual file path via
    // Node's module resolution instead.
    const { createRequire } = await import(/* @vite-ignore */ 'node:module');
    return createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm');
  }
  /* v8 ignore next -- see the "v8 ignore else" note above */
  return sqlWasmUrl;
}

async function createDatabase(): Promise<SqlDatabase> {
  const wasmLocation = await resolveWasmLocation();
  const SQL = await initSqlJs({ locateFile: () => wasmLocation });

  const storedBytes = await loadDatabaseBytes(SCHEMA_VERSION);
  const db = storedBytes ? new SQL.Database(storedBytes) : new SQL.Database();
  db.run('PRAGMA foreign_keys = ON;');
  if (!storedBytes) {
    db.run(SCHEMA_SQL);
  }
  return db;
}

/**
 * Returns the app's shared database connection, creating it (and loading
 * any previously persisted data) on first call.
 */
export function getDatabase(): Promise<SqlDatabase> {
  databasePromise ??= createDatabase();
  return databasePromise;
}

/**
 * Saves the current state of the database to IndexedDB. Callers that
 * mutate data are responsible for awaiting this afterward.
 */
export async function persist(): Promise<void> {
  const db = await getDatabase();
  const bytes = db.export();
  // db.export() drops connection-scoped state, including this pragma, so it
  // must be reapplied or foreign key / cascade-delete enforcement silently
  // turns off for the rest of the connection's lifetime.
  db.run('PRAGMA foreign_keys = ON;');
  await saveDatabaseBytes(SCHEMA_VERSION, bytes);
}

/**
 * Test-only: discards the shared connection so the next getDatabase() call
 * creates a fresh one. Each test can then start from a clean database.
 */
export function resetDatabaseForTests(): void {
  databasePromise = null;
}
