import { getDatabase, persist, type SqlDatabase } from './client';
import type {
  Book,
  Character,
  CharacterPosition,
  Chapter,
  ChapterRange,
  Episode,
  EpisodeRange,
  LatLng,
  Marker,
  MarkerSet,
  NewBook,
  NewCharacter,
  NewCharacterPosition,
  NewChapter,
  NewEpisode,
  NewMarker,
  NewMarkerSet,
  NewStory,
  NewTvSeason,
  Story,
  TvSeason,
} from './types';

type Row = Record<string, unknown>;

function selectAll<T>(
  db: SqlDatabase,
  sql: string,
  mapRow: (row: Row) => T,
  params?: unknown[],
): T[] {
  const statement = db.prepare(sql);
  try {
    if (params) statement.bind(params as never);
    const rows: T[] = [];
    while (statement.step()) {
      rows.push(mapRow(statement.getAsObject()));
    }
    return rows;
  } finally {
    statement.free();
  }
}

function selectOne<T>(
  db: SqlDatabase,
  sql: string,
  mapRow: (row: Row) => T,
  params: unknown[],
): T | null {
  return selectAll(db, sql, mapRow, params)[0] ?? null;
}

function insert(db: SqlDatabase, sql: string, params: unknown[]): number {
  db.run(sql, params as never);
  const result = db.exec('SELECT last_insert_rowid() AS id;');
  return result[0].values[0][0] as number;
}

function rowToStory(row: Row): Story {
  return {
    id: row.id as number,
    name: row.name as string,
    tileUrlTemplate: row.tile_url_template as string | null,
    tileLayerAuthor: row.tile_layer_author as string | null,
    tileLayerAttributionUrl: row.tile_layer_attribution_url as string | null,
    initialCenter: {
      lat: row.initial_center_lat as number,
      lng: row.initial_center_lng as number,
    },
    initialZoom: row.initial_zoom as number,
  };
}

export async function createStory(input: NewStory): Promise<Story> {
  const db = await getDatabase();
  const id = insert(
    db,
    `INSERT INTO stories (
       name, tile_url_template, tile_layer_author, tile_layer_attribution_url,
       initial_center_lat, initial_center_lng, initial_zoom
     ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [
      input.name,
      input.tileUrlTemplate,
      input.tileLayerAuthor,
      input.tileLayerAttributionUrl,
      input.initialCenter.lat,
      input.initialCenter.lng,
      input.initialZoom,
    ],
  );
  await persist();
  return { id, ...input };
}

export async function getStory(id: number): Promise<Story | null> {
  const db = await getDatabase();
  return selectOne(db, 'SELECT * FROM stories WHERE id = ?;', rowToStory, [id]);
}

export async function listStories(): Promise<Story[]> {
  const db = await getDatabase();
  return selectAll(db, 'SELECT * FROM stories ORDER BY id;', rowToStory);
}

export async function updateStory(id: number, input: NewStory): Promise<void> {
  const db = await getDatabase();
  db.run(
    `UPDATE stories
     SET name = ?, tile_url_template = ?, tile_layer_author = ?, tile_layer_attribution_url = ?,
         initial_center_lat = ?, initial_center_lng = ?, initial_zoom = ?
     WHERE id = ?;`,
    [
      input.name,
      input.tileUrlTemplate,
      input.tileLayerAuthor,
      input.tileLayerAttributionUrl,
      input.initialCenter.lat,
      input.initialCenter.lng,
      input.initialZoom,
      id,
    ],
  );
  await persist();
}

export async function deleteStory(id: number): Promise<void> {
  const db = await getDatabase();
  db.run('DELETE FROM stories WHERE id = ?;', [id]);
  await persist();
}

function rowToBook(row: Row): Book {
  return {
    id: row.id as number,
    storyId: row.story_id as number,
    name: row.name as string,
    author: row.author as string | null,
    url: row.url as string | null,
    sortOrder: row.sort_order as number,
  };
}

export async function createBook(input: NewBook): Promise<Book> {
  const db = await getDatabase();
  const id = insert(
    db,
    'INSERT INTO books (story_id, name, author, url, sort_order) VALUES (?, ?, ?, ?, ?);',
    [input.storyId, input.name, input.author, input.url, input.sortOrder],
  );
  await persist();
  return { id, ...input };
}

export async function listBooksForStory(storyId: number): Promise<Book[]> {
  const db = await getDatabase();
  return selectAll(db, 'SELECT * FROM books WHERE story_id = ? ORDER BY sort_order;', rowToBook, [
    storyId,
  ]);
}

export async function updateBook(id: number, input: NewBook): Promise<void> {
  const db = await getDatabase();
  db.run(
    'UPDATE books SET story_id = ?, name = ?, author = ?, url = ?, sort_order = ? WHERE id = ?;',
    [input.storyId, input.name, input.author, input.url, input.sortOrder, id],
  );
  await persist();
}

export async function deleteBook(id: number): Promise<void> {
  const db = await getDatabase();
  db.run('DELETE FROM books WHERE id = ?;', [id]);
  await persist();
}

function rowToChapter(row: Row): Chapter {
  return {
    id: row.id as number,
    bookId: row.book_id as number,
    name: row.name as string,
    url: row.url as string | null,
    sortOrder: row.sort_order as number,
  };
}

export async function createChapter(input: NewChapter): Promise<Chapter> {
  const db = await getDatabase();
  const id = insert(
    db,
    'INSERT INTO chapters (book_id, name, url, sort_order) VALUES (?, ?, ?, ?);',
    [input.bookId, input.name, input.url, input.sortOrder],
  );
  await persist();
  return { id, ...input };
}

export async function listChaptersForBook(bookId: number): Promise<Chapter[]> {
  const db = await getDatabase();
  return selectAll(
    db,
    'SELECT * FROM chapters WHERE book_id = ? ORDER BY sort_order;',
    rowToChapter,
    [bookId],
  );
}

export async function updateChapter(id: number, input: NewChapter): Promise<void> {
  const db = await getDatabase();
  db.run('UPDATE chapters SET book_id = ?, name = ?, url = ?, sort_order = ? WHERE id = ?;', [
    input.bookId,
    input.name,
    input.url,
    input.sortOrder,
    id,
  ]);
  await persist();
}

export async function deleteChapter(id: number): Promise<void> {
  const db = await getDatabase();
  db.run('DELETE FROM chapters WHERE id = ?;', [id]);
  await persist();
}

function rowToTvSeason(row: Row): TvSeason {
  return {
    id: row.id as number,
    storyId: row.story_id as number,
    url: row.url as string | null,
    sortOrder: row.sort_order as number,
  };
}

export async function createTvSeason(input: NewTvSeason): Promise<TvSeason> {
  const db = await getDatabase();
  const id = insert(db, 'INSERT INTO tv_seasons (story_id, url, sort_order) VALUES (?, ?, ?);', [
    input.storyId,
    input.url,
    input.sortOrder,
  ]);
  await persist();
  return { id, ...input };
}

export async function listTvSeasonsForStory(storyId: number): Promise<TvSeason[]> {
  const db = await getDatabase();
  return selectAll(
    db,
    'SELECT * FROM tv_seasons WHERE story_id = ? ORDER BY sort_order;',
    rowToTvSeason,
    [storyId],
  );
}

export async function updateTvSeason(id: number, input: NewTvSeason): Promise<void> {
  const db = await getDatabase();
  db.run('UPDATE tv_seasons SET story_id = ?, url = ?, sort_order = ? WHERE id = ?;', [
    input.storyId,
    input.url,
    input.sortOrder,
    id,
  ]);
  await persist();
}

export async function deleteTvSeason(id: number): Promise<void> {
  const db = await getDatabase();
  db.run('DELETE FROM tv_seasons WHERE id = ?;', [id]);
  await persist();
}

function rowToEpisode(row: Row): Episode {
  return {
    id: row.id as number,
    seasonId: row.season_id as number,
    name: row.name as string,
    url: row.url as string | null,
    sortOrder: row.sort_order as number,
  };
}

export async function createEpisode(input: NewEpisode): Promise<Episode> {
  const db = await getDatabase();
  const id = insert(
    db,
    'INSERT INTO episodes (season_id, name, url, sort_order) VALUES (?, ?, ?, ?);',
    [input.seasonId, input.name, input.url, input.sortOrder],
  );
  await persist();
  return { id, ...input };
}

export async function listEpisodesForSeason(seasonId: number): Promise<Episode[]> {
  const db = await getDatabase();
  return selectAll(
    db,
    'SELECT * FROM episodes WHERE season_id = ? ORDER BY sort_order;',
    rowToEpisode,
    [seasonId],
  );
}

export async function updateEpisode(id: number, input: NewEpisode): Promise<void> {
  const db = await getDatabase();
  db.run('UPDATE episodes SET season_id = ?, name = ?, url = ?, sort_order = ? WHERE id = ?;', [
    input.seasonId,
    input.name,
    input.url,
    input.sortOrder,
    id,
  ]);
  await persist();
}

export async function deleteEpisode(id: number): Promise<void> {
  const db = await getDatabase();
  db.run('DELETE FROM episodes WHERE id = ?;', [id]);
  await persist();
}

function rowToMarkerSet(row: Row): MarkerSet {
  return {
    id: row.id as number,
    storyId: row.story_id as number,
    name: row.name as string,
  };
}

export async function createMarkerSet(input: NewMarkerSet): Promise<MarkerSet> {
  const db = await getDatabase();
  const id = insert(db, 'INSERT INTO marker_sets (story_id, name) VALUES (?, ?);', [
    input.storyId,
    input.name,
  ]);
  await persist();
  return { id, ...input };
}

export async function listMarkerSetsForStory(storyId: number): Promise<MarkerSet[]> {
  const db = await getDatabase();
  return selectAll(
    db,
    'SELECT * FROM marker_sets WHERE story_id = ? ORDER BY id;',
    rowToMarkerSet,
    [storyId],
  );
}

export async function updateMarkerSet(id: number, input: NewMarkerSet): Promise<void> {
  const db = await getDatabase();
  db.run('UPDATE marker_sets SET story_id = ?, name = ? WHERE id = ?;', [
    input.storyId,
    input.name,
    id,
  ]);
  await persist();
}

export async function deleteMarkerSet(id: number): Promise<void> {
  const db = await getDatabase();
  db.run('DELETE FROM marker_sets WHERE id = ?;', [id]);
  await persist();
}

/** A chapter's or episode's place within its story, for range-order comparisons. */
interface StoryOrderKey {
  parentSortOrder: number;
  sortOrder: number;
}

function isBefore(a: StoryOrderKey, b: StoryOrderKey): boolean {
  return a.parentSortOrder !== b.parentSortOrder
    ? a.parentSortOrder < b.parentSortOrder
    : a.sortOrder < b.sortOrder;
}

function getChapterOrderKey(db: SqlDatabase, chapterId: number): StoryOrderKey {
  const key = selectOne(
    db,
    `SELECT b.sort_order AS parent_sort_order, c.sort_order AS sort_order
     FROM chapters c JOIN books b ON b.id = c.book_id
     WHERE c.id = ?;`,
    (row) => ({
      parentSortOrder: row.parent_sort_order as number,
      sortOrder: row.sort_order as number,
    }),
    [chapterId],
  );
  if (!key) throw new Error(`Chapter ${chapterId} does not exist.`);
  return key;
}

function getEpisodeOrderKey(db: SqlDatabase, episodeId: number): StoryOrderKey {
  const key = selectOne(
    db,
    `SELECT s.sort_order AS parent_sort_order, e.sort_order AS sort_order
     FROM episodes e JOIN tv_seasons s ON s.id = e.season_id
     WHERE e.id = ?;`,
    (row) => ({
      parentSortOrder: row.parent_sort_order as number,
      sortOrder: row.sort_order as number,
    }),
    [episodeId],
  );
  if (!key) throw new Error(`Episode ${episodeId} does not exist.`);
  return key;
}

function assertChapterRangeOrder(db: SqlDatabase, range: ChapterRange | null): void {
  if (!range || range.startChapterId === null || range.endChapterId === null) return;
  const start = getChapterOrderKey(db, range.startChapterId);
  const end = getChapterOrderKey(db, range.endChapterId);
  if (isBefore(end, start)) {
    throw new Error('chapterRange.endChapterId must not come before chapterRange.startChapterId.');
  }
}

function assertEpisodeRangeOrder(db: SqlDatabase, range: EpisodeRange | null): void {
  if (!range || range.startEpisodeId === null || range.endEpisodeId === null) return;
  const start = getEpisodeOrderKey(db, range.startEpisodeId);
  const end = getEpisodeOrderKey(db, range.endEpisodeId);
  if (isBefore(end, start)) {
    throw new Error('episodeRange.endEpisodeId must not come before episodeRange.startEpisodeId.');
  }
}

function chapterRangeColumns(range: ChapterRange | null): [number | null, number | null] {
  return range ? [range.startChapterId, range.endChapterId] : [null, null];
}

function episodeRangeColumns(range: EpisodeRange | null): [number | null, number | null] {
  return range ? [range.startEpisodeId, range.endEpisodeId] : [null, null];
}

// A range with both boundaries open carries no information (it's
// indistinguishable from having no range at all), so it's normalized to
// null both on the way into the database and on the way out — keeping
// what create/update functions return consistent with what a later
// list/get call would see.
function normalizeChapterRange(range: ChapterRange | null): ChapterRange | null {
  return range && (range.startChapterId !== null || range.endChapterId !== null) ? range : null;
}

function normalizeEpisodeRange(range: EpisodeRange | null): EpisodeRange | null {
  return range && (range.startEpisodeId !== null || range.endEpisodeId !== null) ? range : null;
}

function rowToChapterRange(row: Row): ChapterRange | null {
  return normalizeChapterRange({
    startChapterId: row.chapter_range_start_chapter_id as number | null,
    endChapterId: row.chapter_range_end_chapter_id as number | null,
  });
}

function rowToEpisodeRange(row: Row): EpisodeRange | null {
  return normalizeEpisodeRange({
    startEpisodeId: row.episode_range_start_episode_id as number | null,
    endEpisodeId: row.episode_range_end_episode_id as number | null,
  });
}

function polygonToColumn(polygon: LatLng[] | null): string | null {
  return polygon ? JSON.stringify(polygon) : null;
}

function rowToPolygon(row: Row): LatLng[] | null {
  const column = row.polygon as string | null;
  return column ? (JSON.parse(column) as LatLng[]) : null;
}

function rowToMarker(row: Row): Marker {
  return {
    id: row.id as number,
    markerSetId: row.marker_set_id as number,
    label: row.label as string,
    icon: row.icon as string | null,
    color: row.color as string | null,
    position: { lat: row.lat as number, lng: row.lng as number },
    polygon: rowToPolygon(row),
    chapterRange: rowToChapterRange(row),
    episodeRange: rowToEpisodeRange(row),
  };
}

export async function createMarker(input: NewMarker): Promise<Marker> {
  const db = await getDatabase();
  assertChapterRangeOrder(db, input.chapterRange);
  assertEpisodeRangeOrder(db, input.episodeRange);
  const id = insert(
    db,
    `INSERT INTO markers (
       marker_set_id, label, icon, color, lat, lng, polygon,
       chapter_range_start_chapter_id, chapter_range_end_chapter_id,
       episode_range_start_episode_id, episode_range_end_episode_id
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      input.markerSetId,
      input.label,
      input.icon,
      input.color,
      input.position.lat,
      input.position.lng,
      polygonToColumn(input.polygon),
      ...chapterRangeColumns(input.chapterRange),
      ...episodeRangeColumns(input.episodeRange),
    ],
  );
  await persist();
  return {
    id,
    ...input,
    chapterRange: normalizeChapterRange(input.chapterRange),
    episodeRange: normalizeEpisodeRange(input.episodeRange),
  };
}

export async function listMarkersForMarkerSet(markerSetId: number): Promise<Marker[]> {
  const db = await getDatabase();
  return selectAll(db, 'SELECT * FROM markers WHERE marker_set_id = ? ORDER BY id;', rowToMarker, [
    markerSetId,
  ]);
}

export async function updateMarker(id: number, input: NewMarker): Promise<void> {
  const db = await getDatabase();
  assertChapterRangeOrder(db, input.chapterRange);
  assertEpisodeRangeOrder(db, input.episodeRange);
  db.run(
    `UPDATE markers
     SET marker_set_id = ?, label = ?, icon = ?, color = ?, lat = ?, lng = ?, polygon = ?,
         chapter_range_start_chapter_id = ?, chapter_range_end_chapter_id = ?,
         episode_range_start_episode_id = ?, episode_range_end_episode_id = ?
     WHERE id = ?;`,
    [
      input.markerSetId,
      input.label,
      input.icon,
      input.color,
      input.position.lat,
      input.position.lng,
      polygonToColumn(input.polygon),
      ...chapterRangeColumns(input.chapterRange),
      ...episodeRangeColumns(input.episodeRange),
      id,
    ],
  );
  await persist();
}

export async function deleteMarker(id: number): Promise<void> {
  const db = await getDatabase();
  db.run('DELETE FROM markers WHERE id = ?;', [id]);
  await persist();
}

function rowToCharacter(row: Row): Character {
  return {
    id: row.id as number,
    storyId: row.story_id as number,
    name: row.name as string,
    group: row.group as string | null,
    icon: row.icon as string | null,
    color: row.color as string | null,
  };
}

export async function createCharacter(input: NewCharacter): Promise<Character> {
  const db = await getDatabase();
  const id = insert(
    db,
    'INSERT INTO characters (story_id, name, "group", icon, color) VALUES (?, ?, ?, ?, ?);',
    [input.storyId, input.name, input.group, input.icon, input.color],
  );
  await persist();
  return { id, ...input };
}

export async function listCharactersForStory(storyId: number): Promise<Character[]> {
  const db = await getDatabase();
  return selectAll(db, 'SELECT * FROM characters WHERE story_id = ? ORDER BY id;', rowToCharacter, [
    storyId,
  ]);
}

export async function updateCharacter(id: number, input: NewCharacter): Promise<void> {
  const db = await getDatabase();
  db.run(
    'UPDATE characters SET story_id = ?, name = ?, "group" = ?, icon = ?, color = ? WHERE id = ?;',
    [input.storyId, input.name, input.group, input.icon, input.color, id],
  );
  await persist();
}

export async function deleteCharacter(id: number): Promise<void> {
  const db = await getDatabase();
  db.run('DELETE FROM characters WHERE id = ?;', [id]);
  await persist();
}

function tailToColumn(tail: LatLng[] | null): string | null {
  return tail ? JSON.stringify(tail) : null;
}

function rowToTail(row: Row): LatLng[] | null {
  const column = row.tail as string | null;
  return column ? (JSON.parse(column) as LatLng[]) : null;
}

function rowToCharacterPosition(row: Row): CharacterPosition {
  return {
    id: row.id as number,
    characterId: row.character_id as number,
    position: { lat: row.lat as number, lng: row.lng as number },
    dead: (row.dead as number) !== 0,
    note: row.note as string | null,
    tail: rowToTail(row),
    chapterRange: rowToChapterRange(row),
    episodeRange: rowToEpisodeRange(row),
  };
}

export async function createCharacterPosition(
  input: NewCharacterPosition,
): Promise<CharacterPosition> {
  const db = await getDatabase();
  assertChapterRangeOrder(db, input.chapterRange);
  assertEpisodeRangeOrder(db, input.episodeRange);
  const id = insert(
    db,
    `INSERT INTO character_positions (
       character_id, lat, lng, dead, note, tail,
       chapter_range_start_chapter_id, chapter_range_end_chapter_id,
       episode_range_start_episode_id, episode_range_end_episode_id
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      input.characterId,
      input.position.lat,
      input.position.lng,
      input.dead ? 1 : 0,
      input.note,
      tailToColumn(input.tail),
      ...chapterRangeColumns(input.chapterRange),
      ...episodeRangeColumns(input.episodeRange),
    ],
  );
  await persist();
  return {
    id,
    ...input,
    chapterRange: normalizeChapterRange(input.chapterRange),
    episodeRange: normalizeEpisodeRange(input.episodeRange),
  };
}

export async function listCharacterPositionsForCharacter(
  characterId: number,
): Promise<CharacterPosition[]> {
  const db = await getDatabase();
  return selectAll(
    db,
    'SELECT * FROM character_positions WHERE character_id = ? ORDER BY id;',
    rowToCharacterPosition,
    [characterId],
  );
}

export async function updateCharacterPosition(
  id: number,
  input: NewCharacterPosition,
): Promise<void> {
  const db = await getDatabase();
  assertChapterRangeOrder(db, input.chapterRange);
  assertEpisodeRangeOrder(db, input.episodeRange);
  db.run(
    `UPDATE character_positions
     SET character_id = ?, lat = ?, lng = ?, dead = ?, note = ?, tail = ?,
         chapter_range_start_chapter_id = ?, chapter_range_end_chapter_id = ?,
         episode_range_start_episode_id = ?, episode_range_end_episode_id = ?
     WHERE id = ?;`,
    [
      input.characterId,
      input.position.lat,
      input.position.lng,
      input.dead ? 1 : 0,
      input.note,
      tailToColumn(input.tail),
      ...chapterRangeColumns(input.chapterRange),
      ...episodeRangeColumns(input.episodeRange),
      id,
    ],
  );
  await persist();
}

export async function deleteCharacterPosition(id: number): Promise<void> {
  const db = await getDatabase();
  db.run('DELETE FROM character_positions WHERE id = ?;', [id]);
  await persist();
}
