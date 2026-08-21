export const SCHEMA_VERSION = 7;

export interface Migration {
  version: number;
  sql: string;
}

// Each migration brings the database from `version - 1` to `version`. A
// fresh database runs every migration in order; an existing one only runs
// the migrations newer than whatever version it was last saved under (see
// client.ts) — so a schema change upgrades stored data in place instead of
// discarding it. Once a migration has shipped, its SQL is what it is:
// don't edit it retroactively, add a new migration instead.
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE stories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        tile_url_template TEXT,
        initial_center_lat REAL NOT NULL,
        initial_center_lng REAL NOT NULL,
        initial_zoom REAL NOT NULL
      );

      -- sort_order orders books/chapters/tv_seasons/episodes within their
      -- parent using fractional indexing: appending sets
      -- sort_order = max(existing) + 1, inserting between two items sets
      -- sort_order = (before + after) / 2. That keeps reordering an O(1)
      -- single-row update instead of renumbering siblings, while
      -- ORDER BY sort_order still gives a stable total order.
      CREATE TABLE books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        author TEXT,
        url TEXT,
        sort_order REAL NOT NULL
      );

      CREATE TABLE chapters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        sort_order REAL NOT NULL
      );

      CREATE TABLE tv_seasons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
        url TEXT,
        sort_order REAL NOT NULL
      );

      CREATE TABLE episodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        season_id INTEGER NOT NULL REFERENCES tv_seasons(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        url TEXT,
        sort_order REAL NOT NULL
      );

      CREATE TABLE marker_sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
        name TEXT NOT NULL
      );

      CREATE TABLE markers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        marker_set_id INTEGER NOT NULL REFERENCES marker_sets(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        icon TEXT,
        lat REAL NOT NULL,
        lng REAL NOT NULL
      );

      CREATE TABLE characters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        "group" TEXT,
        icon TEXT
      );

      -- Where a character should appear on the map once the reader/viewer
      -- has reached a given point in the story. chapter_range and
      -- episode_range are independent (a row can define either, or both,
      -- so it resolves regardless of whether progress is tracked via books
      -- or the show) and each is open-ended when its start/end id is NULL
      -- ("from the beginning" / "through the end"). Range membership is a
      -- chapter's/episode's sort_order falling between its range's start
      -- and end sort_order, so this references the boundary rows directly
      -- rather than copying their sort_order values, which stay valid even
      -- if sort orders are renumbered.
      CREATE TABLE character_positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        chapter_range_book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
        chapter_range_start_chapter_id INTEGER REFERENCES chapters(id) ON DELETE SET NULL,
        chapter_range_end_chapter_id INTEGER REFERENCES chapters(id) ON DELETE SET NULL,
        episode_range_season_id INTEGER REFERENCES tv_seasons(id) ON DELETE CASCADE,
        episode_range_start_episode_id INTEGER REFERENCES episodes(id) ON DELETE SET NULL,
        episode_range_end_episode_id INTEGER REFERENCES episodes(id) ON DELETE SET NULL
      );

      CREATE INDEX idx_books_story_id ON books(story_id);
      CREATE INDEX idx_chapters_book_id ON chapters(book_id);
      CREATE INDEX idx_tv_seasons_story_id ON tv_seasons(story_id);
      CREATE INDEX idx_episodes_season_id ON episodes(season_id);
      CREATE INDEX idx_marker_sets_story_id ON marker_sets(story_id);
      CREATE INDEX idx_markers_marker_set_id ON markers(marker_set_id);
      CREATE INDEX idx_characters_story_id ON characters(story_id);
      CREATE INDEX idx_character_positions_character_id ON character_positions(character_id);
    `,
  },
  {
    version: 2,
    sql: `
      -- chapter_range_* / episode_range_* let a marker (not just a
      -- character_positions row) appear only once the reader/viewer has
      -- reached a given point in the story; see the character_positions
      -- comment in migration 1 for the range semantics, which apply
      -- identically here.
      ALTER TABLE markers ADD COLUMN chapter_range_start_chapter_id INTEGER REFERENCES chapters(id) ON DELETE SET NULL;
      ALTER TABLE markers ADD COLUMN chapter_range_end_chapter_id INTEGER REFERENCES chapters(id) ON DELETE SET NULL;
      ALTER TABLE markers ADD COLUMN episode_range_start_episode_id INTEGER REFERENCES episodes(id) ON DELETE SET NULL;
      ALTER TABLE markers ADD COLUMN episode_range_end_episode_id INTEGER REFERENCES episodes(id) ON DELETE SET NULL;

      -- A chapter/episode range no longer needs to be pinned to one
      -- book/season: boundaries are now compared via the two-level
      -- ordering (book.sort_order, chapter.sort_order) /
      -- (season.sort_order, episode.sort_order) instead, so a range can
      -- span book/season boundaries.
      ALTER TABLE character_positions DROP COLUMN chapter_range_book_id;
      ALTER TABLE character_positions DROP COLUMN episode_range_season_id;
    `,
  },
  {
    version: 3,
    sql: `
      -- polygon is a JSON-encoded array of {lat, lng} points (an optional
      -- area outline, e.g. a territory boundary, alongside the lat/lng
      -- pin) — a separate table isn't worth it since polygon points are
      -- never queried individually, only ever read/written as a whole
      -- with their marker.
      ALTER TABLE markers ADD COLUMN color TEXT;
      ALTER TABLE markers ADD COLUMN polygon TEXT;
    `,
  },
  {
    version: 4,
    sql: `
      ALTER TABLE characters ADD COLUMN color TEXT;
      -- Stored as 0/1, since SQLite has no native boolean type.
      ALTER TABLE character_positions ADD COLUMN dead INTEGER NOT NULL DEFAULT 0;
    `,
  },
  {
    version: 5,
    sql: `
      ALTER TABLE stories ADD COLUMN tile_layer_author TEXT;
      ALTER TABLE stories ADD COLUMN tile_layer_attribution_url TEXT;
    `,
  },
  {
    version: 6,
    sql: `
      ALTER TABLE chapters ADD COLUMN url TEXT;
    `,
  },
  {
    version: 7,
    sql: `
      ALTER TABLE character_positions ADD COLUMN note TEXT;
    `,
  },
];
