// Bumped whenever SCHEMA_SQL changes, so a stored database from an older
// schema version can be detected and discarded rather than opened as-is.
export const SCHEMA_VERSION = 3;

export const SCHEMA_SQL = `
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

  -- chapter_range_* / episode_range_* (here and on character_positions
  -- below) record when a map item should appear: once the reader/viewer
  -- has reached a given point in the story. The two ranges are independent
  -- (a row can define either, or both, so it resolves regardless of
  -- whether progress is tracked via books or the show). Each boundary
  -- references a chapter/episode row directly rather than copying its
  -- sort_order, so it stays valid even if sort orders are renumbered, and
  -- a NULL boundary leaves that end open ("from the beginning" / "through
  -- the end"); NULL on both is treated as no range at all (always shown).
  -- A chapter's/episode's place in the story is the two-level ordering
  -- (book.sort_order, chapter.sort_order) / (season.sort_order,
  -- episode.sort_order), so a range's boundaries are free to fall in
  -- different books/seasons — e.g. book 1 chapter 10 through book 2
  -- chapter 5.
  -- polygon is a JSON-encoded array of {lat, lng} points (an optional area
  -- outline, e.g. a territory boundary, alongside the lat/lng pin) — a
  -- separate table isn't worth it since polygon points are never queried
  -- individually, only ever read/written as a whole with their marker.
  CREATE TABLE markers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    marker_set_id INTEGER NOT NULL REFERENCES marker_sets(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    polygon TEXT,
    chapter_range_start_chapter_id INTEGER REFERENCES chapters(id) ON DELETE SET NULL,
    chapter_range_end_chapter_id INTEGER REFERENCES chapters(id) ON DELETE SET NULL,
    episode_range_start_episode_id INTEGER REFERENCES episodes(id) ON DELETE SET NULL,
    episode_range_end_episode_id INTEGER REFERENCES episodes(id) ON DELETE SET NULL
  );

  CREATE TABLE characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    "group" TEXT,
    icon TEXT
  );

  CREATE TABLE character_positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    chapter_range_start_chapter_id INTEGER REFERENCES chapters(id) ON DELETE SET NULL,
    chapter_range_end_chapter_id INTEGER REFERENCES chapters(id) ON DELETE SET NULL,
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
`;
