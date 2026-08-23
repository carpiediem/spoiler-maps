const DB_NAME = 'spoiler-maps';
const STORE_NAME = 'sqlite';
const RECORD_KEY = 'database';

export interface StoredDatabase {
  /**
   * Present only in records saved by a version of this app before schema
   * versioning moved into the database's own `PRAGMA user_version` (see
   * client.ts) — kept here only so createDatabase() has a one-time
   * fallback for data persisted under that older, separately-tracked
   * scheme. saveDatabaseBytes() no longer writes it.
   */
  schemaVersion?: number;
  bytes: Uint8Array;
}

function openStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Loads whatever database was last persisted, along with the schema
 * version it was saved under — regardless of what the current schema
 * version is, so the caller can migrate it forward rather than discarding
 * it. Returns null on first run, when nothing has been saved yet.
 */
export async function loadStoredDatabase(): Promise<StoredDatabase | null> {
  const db = await openStore();
  try {
    const stored = await new Promise<StoredDatabase | undefined>((resolve, reject) => {
      const request = db
        .transaction(STORE_NAME, 'readonly')
        .objectStore(STORE_NAME)
        .get(RECORD_KEY);
      request.onsuccess = () => resolve(request.result as StoredDatabase | undefined);
      /* v8 ignore next -- thin request.onerror forwarder; see openStore()'s equivalent, exercised in storage.test.ts */
      request.onerror = () => reject(request.error);
    });

    return stored ?? null;
  } finally {
    db.close();
  }
}

async function putRecord(record: StoredDatabase): Promise<void> {
  const db = await openStore();
  try {
    await new Promise<void>((resolve, reject) => {
      const request = db
        .transaction(STORE_NAME, 'readwrite')
        .objectStore(STORE_NAME)
        .put(record, RECORD_KEY);
      request.onsuccess = () => resolve();
      /* v8 ignore next -- thin request.onerror forwarder; see openStore()'s equivalent, exercised in storage.test.ts */
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

/**
 * Saves the current database bytes. The schema version they represent
 * travels with them via `PRAGMA user_version`, embedded in the bytes
 * themselves (see client.ts), rather than as a sibling field here — the two
 * being separately-updatable was exactly what let them drift out of sync
 * and crash a migration with "duplicate column name".
 */
export async function saveDatabaseBytes(bytes: Uint8Array): Promise<void> {
  await putRecord({ bytes });
}

/**
 * Test-only: saves a stored database record shaped like one written by an
 * older version of this app, with a sibling schemaVersion field instead of
 * (or alongside) a version embedded in the bytes themselves — exercises
 * createDatabase()'s fallback for that legacy shape.
 */
export async function saveLegacyDatabaseBytesForTests(
  schemaVersion: number,
  bytes: Uint8Array,
): Promise<void> {
  await putRecord({ schemaVersion, bytes });
}
