import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  batchWrites,
  createRawDatabaseForTests,
  getDatabase,
  persist,
  resetDatabaseForTests,
} from './client';
import { MIGRATIONS } from './schema';
import { saveDatabaseBytes, saveLegacyDatabaseBytesForTests } from './storage';

// Wraps the real saveDatabaseBytes so a test can make one save fail.
vi.mock('./storage', async (importOriginal) => {
  const original = await importOriginal<typeof import('./storage')>();
  return { ...original, saveDatabaseBytes: vi.fn(original.saveDatabaseBytes) };
});

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
      'character_aliases',
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

  it('warns when saving takes at least 100ms', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const now = vi.spyOn(performance, 'now');
    // persist() reads performance.now() once before saving and once after;
    // a 150ms gap between them should trip the warning.
    now.mockReturnValueOnce(0).mockReturnValueOnce(150);

    await persist();

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[db] persist() took 150.0ms for'));
    now.mockRestore();
    warn.mockRestore();
  });

  it('does not warn for a fast save', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await persist();

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

async function insertStory(name: string): Promise<void> {
  const db = await getDatabase();
  db.run(
    `INSERT INTO stories (name, tile_url_template, initial_center_lat, initial_center_lng, initial_zoom)
     VALUES (?, 'https://tile.example.com/{z}/{x}/{y}.png', 1, 2, 3);`,
    [name],
  );
}

async function persistedStoryNames(): Promise<string[]> {
  resetDatabaseForTests();
  const reloaded = await getDatabase();
  return reloaded
    .exec('SELECT name FROM stories ORDER BY id;')[0]
    .values.map((row) => row[0] as string);
}

describe('persist coalescing', () => {
  it('saves once per call when writes are sequential', async () => {
    const db = await getDatabase();
    const exportSpy = vi.spyOn(db, 'export');

    await persist();
    await persist();
    await persist();

    expect(exportSpy).toHaveBeenCalledTimes(3);
  });

  it('shares one follow-up save between writes that arrive while one is in flight', async () => {
    const db = await getDatabase();
    const exportSpy = vi.spyOn(db, 'export');

    const saves: Promise<void>[] = [];
    for (let i = 0; i < 10; i++) {
      await insertStory(`Story ${i}`);
      saves.push(persist());
    }
    await Promise.all(saves);

    // The first save, plus one shared by the other nine — not ten.
    expect(exportSpy).toHaveBeenCalledTimes(2);
  });

  it('includes every write in the save its caller awaited', async () => {
    const saves: Promise<void>[] = [];
    for (let i = 0; i < 5; i++) {
      await insertStory(`Story ${i}`);
      saves.push(persist());
    }
    await Promise.all(saves);

    expect(await persistedStoryNames()).toEqual([
      'Story 0',
      'Story 1',
      'Story 2',
      'Story 3',
      'Story 4',
    ]);
  });

  it('never runs two saves at once', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const original = vi.mocked(saveDatabaseBytes).getMockImplementation()!;
    vi.mocked(saveDatabaseBytes).mockImplementation(async (bytes) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await original(bytes);
      inFlight--;
    });

    await Promise.all([persist(), persist(), persist(), persist()]);

    expect(maxInFlight).toBe(1);
    vi.mocked(saveDatabaseBytes).mockImplementation(original);
  });

  it('rejects for a failed save, still runs the queued follow-up, and recovers afterwards', async () => {
    const original = vi.mocked(saveDatabaseBytes).getMockImplementation()!;
    vi.mocked(saveDatabaseBytes).mockRejectedValueOnce(new Error('disk full'));
    await insertStory('First');

    const failing = persist();
    await insertStory('Second');
    const followUp = persist();

    await expect(failing).rejects.toThrow('disk full');
    await expect(followUp).resolves.toBeUndefined();
    expect(await persistedStoryNames()).toEqual(['First', 'Second']);

    await expect(persist()).resolves.toBeUndefined();
    vi.mocked(saveDatabaseBytes).mockImplementation(original);
  });
});

describe('batchWrites', () => {
  it('defers every persist() inside it to one save at the end', async () => {
    const db = await getDatabase();
    const exportSpy = vi.spyOn(db, 'export');

    await batchWrites(async () => {
      for (let i = 0; i < 5; i++) {
        await insertStory(`Story ${i}`);
        await persist();
      }
      expect(exportSpy).not.toHaveBeenCalled();
    });

    expect(exportSpy).toHaveBeenCalledTimes(1);
    expect(await persistedStoryNames()).toHaveLength(5);
  });

  it('does not save at all when nothing inside it persisted', async () => {
    const db = await getDatabase();
    const exportSpy = vi.spyOn(db, 'export');

    await expect(batchWrites(async () => 'result')).resolves.toBe('result');

    expect(exportSpy).not.toHaveBeenCalled();
  });

  it('saves once, at the outermost batch, when batches are nested', async () => {
    const db = await getDatabase();
    const exportSpy = vi.spyOn(db, 'export');

    await batchWrites(async () => {
      await batchWrites(async () => {
        await insertStory('Inner');
        await persist();
      });
      expect(exportSpy).not.toHaveBeenCalled();
      await insertStory('Outer');
      await persist();
    });

    expect(exportSpy).toHaveBeenCalledTimes(1);
    expect(await persistedStoryNames()).toEqual(['Inner', 'Outer']);
  });

  it('still saves what was written, and rethrows, when the work throws', async () => {
    await expect(
      batchWrites(async () => {
        await insertStory('Partial');
        await persist();
        throw new Error('import failed');
      }),
    ).rejects.toThrow('import failed');

    expect(await persistedStoryNames()).toEqual(['Partial']);
  });
});

describe('migrations', () => {
  it('upgrades a database stored under an older schema version, preserving its data', async () => {
    // Build a database shaped like schema version 1 only, insert a row,
    // and save it under that version — the same as if it had been
    // persisted by an older build of the app.
    const oldDb = await createRawDatabaseForTests();
    oldDb.run(MIGRATIONS[0].sql);
    oldDb.run(
      `INSERT INTO stories (name, tile_url_template, initial_center_lat, initial_center_lng, initial_zoom)
       VALUES ('Old Story', 'https://tile.example.com/{z}/{x}/{y}.png', 1, 2, 3);`,
    );
    await saveLegacyDatabaseBytesForTests(1, oldDb.export());
    oldDb.close();

    resetDatabaseForTests();
    const db = await getDatabase();

    // Columns added by later migrations exist and default to unset, and
    // the original row survived untouched.
    const rows = db.exec(
      'SELECT name, tile_url_template, tile_layer_author, tile_layer_attribution_url FROM stories;',
    );
    expect(rows[0].values).toEqual([
      ['Old Story', 'https://tile.example.com/{z}/{x}/{y}.png', null, null],
    ]);

    // The migration that dropped character_positions.chapter_range_book_id
    // and episode_range_season_id (version 2) also ran, so those columns
    // are gone.
    const columns = db
      .exec("SELECT name FROM pragma_table_info('character_positions');")[0]
      .values.map((row) => row[0]);
    expect(columns).not.toContain('chapter_range_book_id');
    expect(columns).not.toContain('episode_range_season_id');
  });

  it('records the schema version in PRAGMA user_version after creating a database', async () => {
    const db = await getDatabase();

    const userVersion = db.exec('PRAGMA user_version;')[0]!.values[0]![0];
    expect(userVersion).toBe(MIGRATIONS[MIGRATIONS.length - 1]!.version);
  });

  it('survives a migration whose effects were already applied without being recorded', async () => {
    // Simulate the drift bug this fix was written for: bytes that already
    // have the last migration's SQL applied (whatever it is — an ADD
    // COLUMN or a CREATE TABLE), but with a legacy schemaVersion recorded
    // as one version behind — so that migration reruns and hits "duplicate
    // column name" or "already exists" instead of crashing.
    const lastMigration = MIGRATIONS[MIGRATIONS.length - 1]!;
    const oldDb = await createRawDatabaseForTests();
    for (const migration of MIGRATIONS) {
      oldDb.run(migration.sql);
    }
    await saveLegacyDatabaseBytesForTests(lastMigration.version - 1, oldDb.export());
    oldDb.close();

    resetDatabaseForTests();

    await expect(getDatabase()).resolves.toBeDefined();
  });

  it('survives a migration whose column was already applied without being recorded', async () => {
    // Same drift scenario as above, but specifically for an ADD COLUMN
    // migration's "duplicate column name" failure — kept as its own case
    // regardless of whether the *last* migration happens to be one, since
    // both failure messages are tolerated for different reasons. Finds the
    // most recent ADD COLUMN-only migration rather than hardcoding one, so
    // this doesn't silently stop exercising that path as new migrations
    // are added.
    const lastAddColumnMigration = [...MIGRATIONS]
      .reverse()
      .find(
        (migration) =>
          migration.sql.includes('ADD COLUMN') && !migration.sql.includes('CREATE TABLE'),
      )!;
    const oldDb = await createRawDatabaseForTests();
    for (const migration of MIGRATIONS) {
      oldDb.run(migration.sql);
    }
    await saveLegacyDatabaseBytesForTests(lastAddColumnMigration.version - 1, oldDb.export());
    oldDb.close();

    resetDatabaseForTests();

    await expect(getDatabase()).resolves.toBeDefined();
  });

  it('rethrows a migration failure unrelated to an already-applied column', async () => {
    // A completely empty database, recorded as if migration 1 (which
    // creates every table, including the one migration 2 alters) had
    // already run: migration 2 then fails with "no such table", a
    // different error than "duplicate column name", which shouldn't be
    // silently swallowed.
    const oldDb = await createRawDatabaseForTests();
    await saveLegacyDatabaseBytesForTests(1, oldDb.export());
    oldDb.close();

    resetDatabaseForTests();

    await expect(getDatabase()).rejects.toThrow(/no such table/);
  });
});
