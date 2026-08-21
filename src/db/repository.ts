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

/**
 * Config for a table whose rows map 1:1 onto {id, ...fields} with a single
 * parent foreign key, covering the create/list-for-parent/update/delete
 * shape shared by most entities in this file. `columns` and `toParams` must
 * agree on order: `toParams(input)[i]` is bound to `columns[i]`.
 */
interface CrudConfig<T, TNew> {
  table: string;
  columns: string[];
  toParams: (input: TNew) => unknown[];
  fromRow: (row: Row) => T;
  parentColumn: string;
  orderBy: string;
  /** Runs before an insert/update is written, e.g. to validate input against other rows. */
  beforeWrite?: (db: SqlDatabase, input: TNew) => void;
  /** Builds the created record from the input and its new id. Defaults to `{ id, ...input }`. */
  buildResult?: (id: number, input: TNew) => T;
}

function makeCrud<T, TNew>(config: CrudConfig<T, TNew>) {
  const { table, columns, toParams, fromRow, parentColumn, orderBy, beforeWrite, buildResult } =
    config;
  const columnList = columns.join(', ');
  const placeholders = columns.map(() => '?').join(', ');
  const setClause = columns.map((column) => `${column} = ?`).join(', ');

  return {
    async create(input: TNew): Promise<T> {
      const db = await getDatabase();
      beforeWrite?.(db, input);
      const id = insert(
        db,
        `INSERT INTO ${table} (${columnList}) VALUES (${placeholders});`,
        toParams(input),
      );
      await persist();
      return buildResult ? buildResult(id, input) : ({ id, ...input } as T);
    },

    async listForParent(parentId: number): Promise<T[]> {
      const db = await getDatabase();
      return selectAll(
        db,
        `SELECT * FROM ${table} WHERE ${parentColumn} = ? ORDER BY ${orderBy};`,
        fromRow,
        [parentId],
      );
    },

    async update(id: number, input: TNew): Promise<void> {
      const db = await getDatabase();
      beforeWrite?.(db, input);
      db.run(`UPDATE ${table} SET ${setClause} WHERE id = ?;`, [...toParams(input), id] as never);
      await persist();
    },

    async delete(id: number): Promise<void> {
      const db = await getDatabase();
      db.run(`DELETE FROM ${table} WHERE id = ?;`, [id]);
      await persist();
    },
  };
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
    minZoom: row.min_zoom as number,
    maxZoom: row.max_zoom as number,
  };
}

export async function createStory(input: NewStory): Promise<Story> {
  const db = await getDatabase();
  const id = insert(
    db,
    `INSERT INTO stories (
       name, tile_url_template, tile_layer_author, tile_layer_attribution_url,
       initial_center_lat, initial_center_lng, initial_zoom, min_zoom, max_zoom
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      input.name,
      input.tileUrlTemplate,
      input.tileLayerAuthor,
      input.tileLayerAttributionUrl,
      input.initialCenter.lat,
      input.initialCenter.lng,
      input.initialZoom,
      input.minZoom,
      input.maxZoom,
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
         initial_center_lat = ?, initial_center_lng = ?, initial_zoom = ?, min_zoom = ?, max_zoom = ?
     WHERE id = ?;`,
    [
      input.name,
      input.tileUrlTemplate,
      input.tileLayerAuthor,
      input.tileLayerAttributionUrl,
      input.initialCenter.lat,
      input.initialCenter.lng,
      input.initialZoom,
      input.minZoom,
      input.maxZoom,
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

const bookCrud = makeCrud<Book, NewBook>({
  table: 'books',
  columns: ['story_id', 'name', 'author', 'url', 'sort_order'],
  toParams: (input) => [input.storyId, input.name, input.author, input.url, input.sortOrder],
  fromRow: (row) => ({
    id: row.id as number,
    storyId: row.story_id as number,
    name: row.name as string,
    author: row.author as string | null,
    url: row.url as string | null,
    sortOrder: row.sort_order as number,
  }),
  parentColumn: 'story_id',
  orderBy: 'sort_order',
});

export const createBook = bookCrud.create;
export const listBooksForStory = bookCrud.listForParent;
export const updateBook = bookCrud.update;
export const deleteBook = bookCrud.delete;

const chapterCrud = makeCrud<Chapter, NewChapter>({
  table: 'chapters',
  columns: ['book_id', 'name', 'url', 'sort_order'],
  toParams: (input) => [input.bookId, input.name, input.url, input.sortOrder],
  fromRow: (row) => ({
    id: row.id as number,
    bookId: row.book_id as number,
    name: row.name as string,
    url: row.url as string | null,
    sortOrder: row.sort_order as number,
  }),
  parentColumn: 'book_id',
  orderBy: 'sort_order',
});

export const createChapter = chapterCrud.create;
export const listChaptersForBook = chapterCrud.listForParent;
export const updateChapter = chapterCrud.update;
export const deleteChapter = chapterCrud.delete;

const tvSeasonCrud = makeCrud<TvSeason, NewTvSeason>({
  table: 'tv_seasons',
  columns: ['story_id', 'url', 'sort_order'],
  toParams: (input) => [input.storyId, input.url, input.sortOrder],
  fromRow: (row) => ({
    id: row.id as number,
    storyId: row.story_id as number,
    url: row.url as string | null,
    sortOrder: row.sort_order as number,
  }),
  parentColumn: 'story_id',
  orderBy: 'sort_order',
});

export const createTvSeason = tvSeasonCrud.create;
export const listTvSeasonsForStory = tvSeasonCrud.listForParent;
export const updateTvSeason = tvSeasonCrud.update;
export const deleteTvSeason = tvSeasonCrud.delete;

const episodeCrud = makeCrud<Episode, NewEpisode>({
  table: 'episodes',
  columns: ['season_id', 'name', 'url', 'sort_order'],
  toParams: (input) => [input.seasonId, input.name, input.url, input.sortOrder],
  fromRow: (row) => ({
    id: row.id as number,
    seasonId: row.season_id as number,
    name: row.name as string,
    url: row.url as string | null,
    sortOrder: row.sort_order as number,
  }),
  parentColumn: 'season_id',
  orderBy: 'sort_order',
});

export const createEpisode = episodeCrud.create;
export const listEpisodesForSeason = episodeCrud.listForParent;
export const updateEpisode = episodeCrud.update;
export const deleteEpisode = episodeCrud.delete;

const markerSetCrud = makeCrud<MarkerSet, NewMarkerSet>({
  table: 'marker_sets',
  columns: ['story_id', 'name'],
  toParams: (input) => [input.storyId, input.name],
  fromRow: (row) => ({
    id: row.id as number,
    storyId: row.story_id as number,
    name: row.name as string,
  }),
  parentColumn: 'story_id',
  orderBy: 'id',
});

export const createMarkerSet = markerSetCrud.create;
export const listMarkerSetsForStory = markerSetCrud.listForParent;
export const updateMarkerSet = markerSetCrud.update;
export const deleteMarkerSet = markerSetCrud.delete;

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

function assertRanges(
  db: SqlDatabase,
  input: { chapterRange: ChapterRange | null; episodeRange: EpisodeRange | null },
): void {
  assertChapterRangeOrder(db, input.chapterRange);
  assertEpisodeRangeOrder(db, input.episodeRange);
}

function withNormalizedRanges<
  T extends { chapterRange: ChapterRange | null; episodeRange: EpisodeRange | null },
>(id: number, input: Omit<T, 'id'>): T {
  return {
    id,
    ...input,
    chapterRange: normalizeChapterRange(input.chapterRange),
    episodeRange: normalizeEpisodeRange(input.episodeRange),
  } as unknown as T;
}

const markerCrud = makeCrud<Marker, NewMarker>({
  table: 'markers',
  columns: [
    'marker_set_id',
    'label',
    'icon',
    'color',
    'lat',
    'lng',
    'polygon',
    'chapter_range_start_chapter_id',
    'chapter_range_end_chapter_id',
    'episode_range_start_episode_id',
    'episode_range_end_episode_id',
  ],
  toParams: (input) => [
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
  fromRow: (row) => ({
    id: row.id as number,
    markerSetId: row.marker_set_id as number,
    label: row.label as string,
    icon: row.icon as string | null,
    color: row.color as string | null,
    position: { lat: row.lat as number, lng: row.lng as number },
    polygon: rowToPolygon(row),
    chapterRange: rowToChapterRange(row),
    episodeRange: rowToEpisodeRange(row),
  }),
  parentColumn: 'marker_set_id',
  orderBy: 'id',
  beforeWrite: assertRanges,
  buildResult: withNormalizedRanges<Marker>,
});

export const createMarker = markerCrud.create;
export const listMarkersForMarkerSet = markerCrud.listForParent;
export const updateMarker = markerCrud.update;
export const deleteMarker = markerCrud.delete;

const characterCrud = makeCrud<Character, NewCharacter>({
  table: 'characters',
  columns: ['story_id', 'name', '"group"', 'icon', 'color', 'sort_order'],
  toParams: (input) => [
    input.storyId,
    input.name,
    input.group,
    input.icon,
    input.color,
    input.sortOrder,
  ],
  fromRow: (row) => ({
    id: row.id as number,
    storyId: row.story_id as number,
    name: row.name as string,
    group: row.group as string | null,
    icon: row.icon as string | null,
    color: row.color as string | null,
    sortOrder: row.sort_order as number,
  }),
  parentColumn: 'story_id',
  orderBy: 'sort_order',
});

export const createCharacter = characterCrud.create;
export const listCharactersForStory = characterCrud.listForParent;
export const updateCharacter = characterCrud.update;
export const deleteCharacter = characterCrud.delete;

function tailToColumn(tail: LatLng[] | null): string | null {
  return tail ? JSON.stringify(tail) : null;
}

function rowToTail(row: Row): LatLng[] | null {
  const column = row.tail as string | null;
  return column ? (JSON.parse(column) as LatLng[]) : null;
}

const characterPositionCrud = makeCrud<CharacterPosition, NewCharacterPosition>({
  table: 'character_positions',
  columns: [
    'character_id',
    'lat',
    'lng',
    'dead',
    'note',
    'tail',
    'chapter_range_start_chapter_id',
    'chapter_range_end_chapter_id',
    'episode_range_start_episode_id',
    'episode_range_end_episode_id',
  ],
  toParams: (input) => [
    input.characterId,
    input.position.lat,
    input.position.lng,
    input.dead ? 1 : 0,
    input.note,
    tailToColumn(input.tail),
    ...chapterRangeColumns(input.chapterRange),
    ...episodeRangeColumns(input.episodeRange),
  ],
  fromRow: (row) => ({
    id: row.id as number,
    characterId: row.character_id as number,
    position: { lat: row.lat as number, lng: row.lng as number },
    dead: (row.dead as number) !== 0,
    note: row.note as string | null,
    tail: rowToTail(row),
    chapterRange: rowToChapterRange(row),
    episodeRange: rowToEpisodeRange(row),
  }),
  parentColumn: 'character_id',
  orderBy: 'id',
  beforeWrite: assertRanges,
  buildResult: withNormalizedRanges<CharacterPosition>,
});

export const createCharacterPosition = characterPositionCrud.create;
export const listCharacterPositionsForCharacter = characterPositionCrud.listForParent;
export const updateCharacterPosition = characterPositionCrud.update;
export const deleteCharacterPosition = characterPositionCrud.delete;
