import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadDatabaseBytes, saveDatabaseBytes } from './storage';

afterEach(async () => {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('spoiler-maps');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
});

describe('storage', () => {
  it('returns null when nothing has been saved yet', async () => {
    expect(await loadDatabaseBytes(1)).toBeNull();
  });

  it('round-trips saved bytes under the same schema version', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    await saveDatabaseBytes(1, bytes);

    // Compared as plain arrays: fake-indexeddb's structured clone can wrap
    // the returned bytes in a differently-shaped Uint8Array (e.g. a Buffer
    // with padding in its underlying ArrayBuffer), which trips up toEqual's
    // typed-array comparison even when the visible values are identical.
    expect(Array.from((await loadDatabaseBytes(1))!)).toEqual(Array.from(bytes));
  });

  it('discards a stored database written under a different schema version', async () => {
    await saveDatabaseBytes(1, new Uint8Array([1, 2, 3]));

    expect(await loadDatabaseBytes(2)).toBeNull();
  });

  it('overwrites a previously saved database', async () => {
    await saveDatabaseBytes(1, new Uint8Array([1]));
    await saveDatabaseBytes(1, new Uint8Array([9, 9]));

    expect(Array.from((await loadDatabaseBytes(1))!)).toEqual([9, 9]);
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

    await expect(loadDatabaseBytes(1)).rejects.toBe(openError);

    vi.unstubAllGlobals();
  });
});
