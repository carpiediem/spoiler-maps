import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getDatabase, persist, resetDatabaseForTests } from './client';

async function deleteStoredDatabase(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('spoiler-maps');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

beforeEach(() => {
  resetDatabaseForTests();
});

afterEach(async () => {
  resetDatabaseForTests();
  await deleteStoredDatabase();
});

describe('getDatabase', () => {
  it('creates a fresh database with the schema applied', async () => {
    const db = await getDatabase();

    const tables = db
      .exec("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;")[0]
      .values.map((row) => row[0]);

    expect(tables).toEqual([
      'books',
      'chapters',
      'character_positions',
      'characters',
      'episodes',
      'marker_sets',
      'markers',
      // Created automatically by SQLite alongside our AUTOINCREMENT columns.
      'sqlite_sequence',
      'stories',
      'tv_seasons',
    ]);
  });

  it('reuses the same connection on subsequent calls', async () => {
    const first = await getDatabase();
    const second = await getDatabase();

    expect(first).toBe(second);
  });

  it('enforces foreign key constraints', async () => {
    const db = await getDatabase();

    expect(() =>
      db.run('INSERT INTO books (story_id, name, sort_order) VALUES (999, "Orphan", 0);'),
    ).toThrow();
  });
});

describe('persist', () => {
  it('reloads previously persisted data after resetting the connection', async () => {
    const db = await getDatabase();
    db.run(
      `INSERT INTO stories (name, tile_url_template, initial_center_lat, initial_center_lng, initial_zoom)
       VALUES ('Reloaded Story', 'https://tile.example.com/{z}/{x}/{y}.png', 1, 2, 3);`,
    );
    await persist();

    resetDatabaseForTests();
    const reloaded = await getDatabase();
    const names = reloaded.exec('SELECT name FROM stories;')[0].values.map((row) => row[0]);

    expect(names).toEqual(['Reloaded Story']);
  });
});
