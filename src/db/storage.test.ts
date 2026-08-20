import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadStoredDatabase, saveDatabaseBytes } from './storage';

afterEach(async () => {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('spoiler-maps');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
});

describe('storage', () => {
  it('returns null when nothing has been saved yet', async () => {
    expect(await loadStoredDatabase()).toBeNull();
  });

  it('round-trips saved bytes and their schema version', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    await saveDatabaseBytes(3, bytes);

    const stored = await loadStoredDatabase();
    expect(stored?.schemaVersion).toBe(3);
    // Compared as a plain array: fake-indexeddb's structured clone can wrap
    // the returned bytes in a differently-shaped Uint8Array (e.g. a Buffer
    // with padding in its underlying ArrayBuffer), which trips up toEqual's
    // typed-array comparison even when the visible values are identical.
    expect(Array.from(stored!.bytes)).toEqual(Array.from(bytes));
  });

  it('returns the stored schema version even when it differs from what was last requested', async () => {
    await saveDatabaseBytes(1, new Uint8Array([1, 2, 3]));

    const stored = await loadStoredDatabase();
    expect(stored?.schemaVersion).toBe(1);
  });

  it('overwrites a previously saved database', async () => {
    await saveDatabaseBytes(1, new Uint8Array([1]));
    await saveDatabaseBytes(2, new Uint8Array([9, 9]));

    const stored = await loadStoredDatabase();
    expect(stored?.schemaVersion).toBe(2);
    expect(Array.from(stored!.bytes)).toEqual([9, 9]);
  });

  it('rejects when opening the underlying database fails', async () => {
    const openError = new Error('IndexedDB unavailable');
    const fakeRequest = {} as IDBOpenDBRequest;
    vi.stubGlobal('indexedDB', {
      open: () => {
        queueMicrotask(() => {
          Object.assign(fakeRequest, { error: openError });
          fakeRequest.onerror?.(new Event('error'));
        });
        return fakeRequest;
      },
    });

    await expect(loadStoredDatabase()).rejects.toBe(openError);

    vi.unstubAllGlobals();
  });
});
