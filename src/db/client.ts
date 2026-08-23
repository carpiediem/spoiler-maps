import initSqlJs from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { MIGRATIONS, SCHEMA_VERSION } from './schema';
import { loadStoredDatabase, saveDatabaseBytes } from './storage';

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

/** Reads the schema version embedded in the database file itself. 0 for a database that's never had it set (including a brand-new one). */
function getUserVersion(db: SqlDatabase): number {
  const result = db.exec('PRAGMA user_version;');
  /* v8 ignore next -- PRAGMA user_version always returns exactly one row/column. */
  return (result[0]?.values[0]?.[0] as number | undefined) ?? 0;
}

// PRAGMA doesn't support bound parameters; safe to interpolate since this is
// always called with SCHEMA_VERSION, never external input.
function setUserVersion(db: SqlDatabase, version: number): void {
  db.run(`PRAGMA user_version = ${version};`);
}

async function createDatabase(): Promise<SqlDatabase> {
  const wasmLocation = await resolveWasmLocation();
  const SQL = await initSqlJs({ locateFile: () => wasmLocation });

  const stored = await loadStoredDatabase();
  const db = stored ? new SQL.Database(stored.bytes) : new SQL.Database();
  db.run('PRAGMA foreign_keys = ON;');

  // The schema version lives inside the database file itself (PRAGMA
  // user_version, set below), in the same blob as the schema it describes,
  // so the two can never drift apart the way two separately-persisted
  // values could — which is exactly what once let an already-applied
  // migration run again and crash with "duplicate column name". stored's
  // own schemaVersion field is only a fallback for data persisted before
  // user_version was adopted; once read here, it's superseded below.
  const fromVersion = Math.max(getUserVersion(db), stored?.schemaVersion ?? 0);
  for (const migration of MIGRATIONS) {
    if (migration.version > fromVersion && migration.version <= SCHEMA_VERSION) {
      try {
        db.run(migration.sql);
      } catch (error) {
        // Best-effort recovery for data that already drifted out of sync
        // before this fix, where a migration's columns already exist even
        // though its version wasn't recorded as applied — treat that
        // specific failure as "already done" and move on, rather than
        // leaving the app permanently unable to start.
        /* v8 ignore next -- sql.js's db.run only ever throws Error instances; the String(error) fallback exists only in case that contract ever changes. */
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes('duplicate column name')) throw error;
        console.warn(
          `Skipping migration ${migration.version}: its SQL failed with "${message}", suggesting it already ran previously without being recorded.`,
        );
      }
    }
  }
  setUserVersion(db, SCHEMA_VERSION);

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
  await saveDatabaseBytes(bytes);
}

/**
 * Test-only: discards the shared connection so the next getDatabase() call
 * creates a fresh one. Each test can then start from a clean database.
 */
export function resetDatabaseForTests(): void {
  databasePromise = null;
}

/**
 * Test-only: opens a bare sql.js connection with no schema applied, for
 * building fixture databases (e.g. one shaped like an older schema
 * version, to exercise migrations against).
 */
export async function createRawDatabaseForTests(): Promise<SqlDatabase> {
  const wasmLocation = await resolveWasmLocation();
  // initSqlJs caches the loaded wasm module process-wide, so once
  // getDatabase() has already initialized it once, this locateFile is
  // never actually invoked again.
  /* v8 ignore next */
  const SQL = await initSqlJs({ locateFile: () => wasmLocation });
  return new SQL.Database();
}
