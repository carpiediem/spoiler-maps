const DB_NAME = 'spoiler-maps';
const STORE_NAME = 'sqlite';
// The key the database bytes are stored under within STORE_NAME. Bundled
// with SCHEMA_VERSION so a schema change starts fresh instead of trying (and
// failing) to open an incompatible file.
const RECORD_KEY = 'database';

interface StoredDatabase {
  schemaVersion: number;
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
 * Loads the persisted database bytes, if any were saved under the given
 * schema version. Returns null on first run, or if the stored database was
 * written under a different (and therefore incompatible) schema version.
 */
export async function loadDatabaseBytes(schemaVersion: number): Promise<Uint8Array | null> {
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

    if (!stored || stored.schemaVersion !== schemaVersion) {
      return null;
    }
    return stored.bytes;
  } finally {
    db.close();
  }
}

export async function saveDatabaseBytes(schemaVersion: number, bytes: Uint8Array): Promise<void> {
  const db = await openStore();
  try {
    const record: StoredDatabase = { schemaVersion, bytes };
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
