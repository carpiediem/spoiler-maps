import { getDatabase, persist, type SqlDatabase } from './client';
import type {
  Book,
  Character,
  CharacterPosition,
  Chapter,
  ChapterRange,
  Episode,
  EpisodeRange,
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
    initialCenterLat: row.initial_center_lat as number,
    initialCenterLng: row.initial_center_lng as number,
    initialZoom: row.initial_zoom as number,
  };
}

export async function createStory(input: NewStory): Promise<Story> {
  const db = await getDatabase();
  const id = insert(
    db,
    `INSERT INTO stories (name, tile_url_template, initial_center_lat, initial_center_lng, initial_zoom)
     VALUES (?, ?, ?, ?, ?);`,
    [
      input.name,
      input.tileUrlTemplate,
      input.initialCenterLat,
      input.initialCenterLng,
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
     SET name = ?, tile_url_template = ?, initial_center_lat = ?, initial_center_lng = ?, initial_zoom = ?
     WHERE id = ?;`,
    [
      input.name,
      input.tileUrlTemplate,
      input.initialCenterLat,
      input.initialCenterLng,
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
    sortOrder: row.sort_order as number,
  };
}

export async function createChapter(input: NewChapter): Promise<Chapter> {
  const db = await getDatabase();
  const id = insert(db, 'INSERT INTO chapters (book_id, name, sort_order) VALUES (?, ?, ?);', [
    input.bookId,
    input.name,
    input.sortOrder,
  ]);
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
  db.run('UPDATE chapters SET book_id = ?, name = ?, sort_order = ? WHERE id = ?;', [
    input.bookId,
    input.name,
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

function rowToMarker(row: Row): Marker {
  return {
    id: row.id as number,
    markerSetId: row.marker_set_id as number,
    label: row.label as string,
    icon: row.icon as string | null,
    lat: row.lat as number,
    lng: row.lng as number,
  };
}

export async function createMarker(input: NewMarker): Promise<Marker> {
  const db = await getDatabase();
  const id = insert(
    db,
    'INSERT INTO markers (marker_set_id, label, icon, lat, lng) VALUES (?, ?, ?, ?, ?);',
    [input.markerSetId, input.label, input.icon, input.lat, input.lng],
  );
  await persist();
  return { id, ...input };
}

export async function listMarkersForMarkerSet(markerSetId: number): Promise<Marker[]> {
  const db = await getDatabase();
  return selectAll(db, 'SELECT * FROM markers WHERE marker_set_id = ? ORDER BY id;', rowToMarker, [
    markerSetId,
  ]);
}

export async function updateMarker(id: number, input: NewMarker): Promise<void> {
  const db = await getDatabase();
  db.run(
    'UPDATE markers SET marker_set_id = ?, label = ?, icon = ?, lat = ?, lng = ? WHERE id = ?;',
    [input.markerSetId, input.label, input.icon, input.lat, input.lng, id],
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
  };
}

export async function createCharacter(input: NewCharacter): Promise<Character> {
  const db = await getDatabase();
  const id = insert(
    db,
    'INSERT INTO characters (story_id, name, "group", icon) VALUES (?, ?, ?, ?);',
    [input.storyId, input.name, input.group, input.icon],
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
  db.run('UPDATE characters SET story_id = ?, name = ?, "group" = ?, icon = ? WHERE id = ?;', [
    input.storyId,
    input.name,
    input.group,
    input.icon,
    id,
  ]);
  await persist();
}

export async function deleteCharacter(id: number): Promise<void> {
  const db = await getDatabase();
  db.run('DELETE FROM characters WHERE id = ?;', [id]);
  await persist();
}

function chapterRangeColumns(
  range: ChapterRange | null,
): [number | null, number | null, number | null] {
  return range ? [range.bookId, range.startChapterId, range.endChapterId] : [null, null, null];
}

function episodeRangeColumns(
  range: EpisodeRange | null,
): [number | null, number | null, number | null] {
  return range ? [range.seasonId, range.startEpisodeId, range.endEpisodeId] : [null, null, null];
}

function rowToCharacterPosition(row: Row): CharacterPosition {
  const chapterRangeBookId = row.chapter_range_book_id as number | null;
  const episodeRangeSeasonId = row.episode_range_season_id as number | null;

  return {
    id: row.id as number,
    characterId: row.character_id as number,
    lat: row.lat as number,
    lng: row.lng as number,
    chapterRange:
      chapterRangeBookId === null
        ? null
        : {
            bookId: chapterRangeBookId,
            startChapterId: row.chapter_range_start_chapter_id as number | null,
            endChapterId: row.chapter_range_end_chapter_id as number | null,
          },
    episodeRange:
      episodeRangeSeasonId === null
        ? null
        : {
            seasonId: episodeRangeSeasonId,
            startEpisodeId: row.episode_range_start_episode_id as number | null,
            endEpisodeId: row.episode_range_end_episode_id as number | null,
          },
  };
}

export async function createCharacterPosition(
  input: NewCharacterPosition,
): Promise<CharacterPosition> {
  const db = await getDatabase();
  const id = insert(
    db,
    `INSERT INTO character_positions (
       character_id, lat, lng,
       chapter_range_book_id, chapter_range_start_chapter_id, chapter_range_end_chapter_id,
       episode_range_season_id, episode_range_start_episode_id, episode_range_end_episode_id
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      input.characterId,
      input.lat,
      input.lng,
      ...chapterRangeColumns(input.chapterRange),
      ...episodeRangeColumns(input.episodeRange),
    ],
  );
  await persist();
  return { id, ...input };
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
  db.run(
    `UPDATE character_positions
     SET character_id = ?, lat = ?, lng = ?,
         chapter_range_book_id = ?, chapter_range_start_chapter_id = ?, chapter_range_end_chapter_id = ?,
         episode_range_season_id = ?, episode_range_start_episode_id = ?, episode_range_end_episode_id = ?
     WHERE id = ?;`,
    [
      input.characterId,
      input.lat,
      input.lng,
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
