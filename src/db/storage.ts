const DB_NAME = 'spoiler-maps';
const STORE_NAME = 'sqlite';
const RECORD_KEY = 'database';

export interface StoredDatabase {
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
