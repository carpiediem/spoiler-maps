import { parse } from 'yaml';
import {
  createBook,
  createCharacter,
  createCharacterPosition,
  createChapter,
  createEpisode,
  createMarker,
  createMarkerSet,
  createStory,
  createTvSeason,
  deleteStory,
  type ChapterRange,
  type EpisodeRange,
  type Story,
} from '../db';
import type {
  StoryDocument,
  StoryDocumentBook,
  StoryDocumentCharacter,
  StoryDocumentMarkerSet,
  StoryDocumentRangeTuple,
  StoryDocumentSeason,
} from './storyDocument';

class StoryDocumentError extends Error {}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new StoryDocumentError(message);
}

function assertString(value: unknown, path: string): string {
  assert(typeof value === 'string', `${path} must be a string.`);
  return value as string;
}

function assertOptionalString(value: unknown, path: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  return assertString(value, path);
}

function assertNumber(value: unknown, path: string): number {
  assert(typeof value === 'number' && Number.isFinite(value), `${path} must be a number.`);
  return value as number;
}

function assertArray(value: unknown, path: string): unknown[] {
  assert(Array.isArray(value), `${path} must be a list.`);
  return value as unknown[];
}

function assertLatLng(value: unknown, path: string): { lat: number; lng: number } {
  assert(value && typeof value === 'object', `${path} must be a {lat, lng} object.`);
  const record = value as Record<string, unknown>;
  return {
    lat: assertNumber(record.lat, `${path}.lat`),
    lng: assertNumber(record.lng, `${path}.lng`),
  };
}

function assertRangeTuple(value: unknown, path: string): StoryDocumentRangeTuple | undefined {
  if (value === undefined || value === null) return undefined;
  const tuple = assertArray(value, path);
  assert(tuple.length === 2, `${path} must be a two-element [start, end] list.`);
  const [start, end] = tuple;
  assert(
    (start === null || typeof start === 'number') && (end === null || typeof end === 'number'),
    `${path} entries must be numbers or null.`,
  );
  return [start as number | null, end as number | null];
}

/** Parses and structurally validates a YAML string into a StoryDocument. */
export function parseStoryDocument(yamlText: string): StoryDocument {
  let raw: unknown;
  try {
    raw = parse(yamlText);
  } catch (error) {
    /* v8 ignore next -- the yaml package's parser only ever throws YAMLParseError, an Error subclass; the String(error) fallback exists only in case that contract ever changes. */
    const message = error instanceof Error ? error.message : String(error);
    throw new StoryDocumentError(`Could not parse YAML: ${message}`);
  }
  assert(
    raw && typeof raw === 'object' && !Array.isArray(raw),
    'The document must be a YAML mapping.',
  );
  const root = raw as Record<string, unknown>;

  const books = assertArray(root.books ?? [], 'books').map((rawBook, bookIndex) => {
    assert(rawBook && typeof rawBook === 'object', `books[${bookIndex}] must be a mapping.`);
    const book = rawBook as Record<string, unknown>;
    const chapters = assertArray(book.chapters ?? [], `books[${bookIndex}].chapters`).map(
      (rawChapter, chapterIndex) => {
        assert(
          rawChapter && typeof rawChapter === 'object',
          `books[${bookIndex}].chapters[${chapterIndex}] must be a mapping.`,
        );
        const chapter = rawChapter as Record<string, unknown>;
        return {
          name: assertString(chapter.name, `books[${bookIndex}].chapters[${chapterIndex}].name`),
          url: assertOptionalString(
            chapter.url,
            `books[${bookIndex}].chapters[${chapterIndex}].url`,
          ),
        };
      },
    );
    return {
      name: assertString(book.name, `books[${bookIndex}].name`),
      author: assertOptionalString(book.author, `books[${bookIndex}].author`),
      url: assertOptionalString(book.url, `books[${bookIndex}].url`),
      chapters,
    };
  });

  const television = assertArray(root.television ?? [], 'television').map(
    (rawSeason, seasonIndex) => {
      assert(
        rawSeason && typeof rawSeason === 'object',
        `television[${seasonIndex}] must be a mapping.`,
      );
      const season = rawSeason as Record<string, unknown>;
      const episodes = assertArray(
        season.episodes ?? [],
        `television[${seasonIndex}].episodes`,
      ).map((rawEpisode, episodeIndex) => {
        assert(
          rawEpisode && typeof rawEpisode === 'object',
          `television[${seasonIndex}].episodes[${episodeIndex}] must be a mapping.`,
        );
        const episode = rawEpisode as Record<string, unknown>;
        return {
          name: assertString(
            episode.name,
            `television[${seasonIndex}].episodes[${episodeIndex}].name`,
          ),
          url: assertOptionalString(
            episode.url,
            `television[${seasonIndex}].episodes[${episodeIndex}].url`,
          ),
        };
      });
      return { url: assertOptionalString(season.url, `television[${seasonIndex}].url`), episodes };
    },
  );

  const characters = assertArray(root.characters ?? [], 'characters').map(
    (rawCharacter, characterIndex) => {
      assert(
        rawCharacter && typeof rawCharacter === 'object',
        `characters[${characterIndex}] must be a mapping.`,
      );
      const character = rawCharacter as Record<string, unknown>;
      const positions = assertArray(
        character.positions ?? [],
        `characters[${characterIndex}].positions`,
      ).map((rawPosition, positionIndex) => {
        assert(
          rawPosition && typeof rawPosition === 'object',
          `characters[${characterIndex}].positions[${positionIndex}] must be a mapping.`,
        );
        const position = rawPosition as Record<string, unknown>;
        return {
          lat: assertNumber(
            position.lat,
            `characters[${characterIndex}].positions[${positionIndex}].lat`,
          ),
          lng: assertNumber(
            position.lng,
            `characters[${characterIndex}].positions[${positionIndex}].lng`,
          ),
          dead: position.dead === true,
          note: assertOptionalString(
            position.note,
            `characters[${characterIndex}].positions[${positionIndex}].note`,
          ),
          tail: position.tail
            ? assertArray(
                position.tail,
                `characters[${characterIndex}].positions[${positionIndex}].tail`,
              ).map((point, pointIndex) =>
                assertLatLng(
                  point,
                  `characters[${characterIndex}].positions[${positionIndex}].tail[${pointIndex}]`,
                ),
              )
            : undefined,
          chapters: assertRangeTuple(
            position.chapters,
            `characters[${characterIndex}].positions[${positionIndex}].chapters`,
          ),
          episodes: assertRangeTuple(
            position.episodes,
            `characters[${characterIndex}].positions[${positionIndex}].episodes`,
          ),
        };
      });
      return {
        name: assertString(character.name, `characters[${characterIndex}].name`),
        group: assertOptionalString(character.group, `characters[${characterIndex}].group`),
        icon: assertOptionalString(character.icon, `characters[${characterIndex}].icon`),
        color: assertOptionalString(character.color, `characters[${characterIndex}].color`),
        url: assertOptionalString(character.url, `characters[${characterIndex}].url`),
        positions,
      };
    },
  );

  const markerSets = assertArray(root.markerSets ?? [], 'markerSets').map(
    (rawMarkerSet, markerSetIndex) => {
      assert(
        rawMarkerSet && typeof rawMarkerSet === 'object',
        `markerSets[${markerSetIndex}] must be a mapping.`,
      );
      const markerSet = rawMarkerSet as Record<string, unknown>;
      const markers = assertArray(
        markerSet.markers ?? [],
        `markerSets[${markerSetIndex}].markers`,
      ).map((rawMarker, markerIndex) => {
        assert(
          rawMarker && typeof rawMarker === 'object',
          `markerSets[${markerSetIndex}].markers[${markerIndex}] must be a mapping.`,
        );
        const marker = rawMarker as Record<string, unknown>;
        return {
          label: assertString(
            marker.label,
            `markerSets[${markerSetIndex}].markers[${markerIndex}].label`,
          ),
          icon: assertOptionalString(
            marker.icon,
            `markerSets[${markerSetIndex}].markers[${markerIndex}].icon`,
          ),
          color: assertOptionalString(
            marker.color,
            `markerSets[${markerSetIndex}].markers[${markerIndex}].color`,
          ),
          lat: assertNumber(
            marker.lat,
            `markerSets[${markerSetIndex}].markers[${markerIndex}].lat`,
          ),
          lng: assertNumber(
            marker.lng,
            `markerSets[${markerSetIndex}].markers[${markerIndex}].lng`,
          ),
          polygon: marker.polygon
            ? assertArray(
                marker.polygon,
                `markerSets[${markerSetIndex}].markers[${markerIndex}].polygon`,
              ).map((point, pointIndex) =>
                assertLatLng(
                  point,
                  `markerSets[${markerSetIndex}].markers[${markerIndex}].polygon[${pointIndex}]`,
                ),
              )
            : undefined,
          chapters: assertRangeTuple(
            marker.chapters,
            `markerSets[${markerSetIndex}].markers[${markerIndex}].chapters`,
          ),
          episodes: assertRangeTuple(
            marker.episodes,
            `markerSets[${markerSetIndex}].markers[${markerIndex}].episodes`,
          ),
        };
      });
      return { name: assertString(markerSet.name, `markerSets[${markerSetIndex}].name`), markers };
    },
  );

  return {
    name: assertString(root.name, 'name'),
    tileUrlTemplate: assertOptionalString(root.tileUrlTemplate, 'tileUrlTemplate'),
    tileLayerAuthor: assertOptionalString(root.tileLayerAuthor, 'tileLayerAuthor'),
    tileLayerAttributionUrl: assertOptionalString(
      root.tileLayerAttributionUrl,
      'tileLayerAttributionUrl',
    ),
    initialCenter: assertLatLng(root.initialCenter, 'initialCenter'),
    initialZoom: assertNumber(root.initialZoom, 'initialZoom'),
    minZoom: assertNumber(root.minZoom, 'minZoom'),
    maxZoom: assertNumber(root.maxZoom, 'maxZoom'),
    books,
    television,
    characters,
    markerSets,
  };
}

function resolveRangeEndpoint(
  index: number | null,
  idsByIndex: number[],
  path: string,
): number | null {
  if (index === null) return null;
  const id = idsByIndex[index];
  assert(
    id !== undefined,
    `${path} references index ${index}, but the story only has ${idsByIndex.length} entries.`,
  );
  return id;
}

function resolveChapterRange(
  tuple: StoryDocumentRangeTuple | undefined,
  chapterIdsByIndex: number[],
  path: string,
): ChapterRange | null {
  if (!tuple) return null;
  const [start, end] = tuple;
  return {
    startChapterId: resolveRangeEndpoint(start, chapterIdsByIndex, `${path}[0]`),
    endChapterId: resolveRangeEndpoint(end, chapterIdsByIndex, `${path}[1]`),
  };
}

function resolveEpisodeRange(
  tuple: StoryDocumentRangeTuple | undefined,
  episodeIdsByIndex: number[],
  path: string,
): EpisodeRange | null {
  if (!tuple) return null;
  const [start, end] = tuple;
  return {
    startEpisodeId: resolveRangeEndpoint(start, episodeIdsByIndex, `${path}[0]`),
    endEpisodeId: resolveRangeEndpoint(end, episodeIdsByIndex, `${path}[1]`),
  };
}

async function importBooks(storyId: number, books: StoryDocumentBook[]): Promise<number[]> {
  const chapterIdsByIndex: number[] = [];
  for (const [bookIndex, book] of books.entries()) {
    const createdBook = await createBook({
      storyId,
      name: book.name,
      author: book.author ?? null,
      url: book.url ?? null,
      sortOrder: bookIndex,
    });
    for (const [chapterIndex, chapter] of book.chapters.entries()) {
      const createdChapter = await createChapter({
        bookId: createdBook.id,
        name: chapter.name,
        url: chapter.url ?? null,
        sortOrder: chapterIndex,
      });
      chapterIdsByIndex.push(createdChapter.id);
    }
  }
  return chapterIdsByIndex;
}

async function importTelevision(
  storyId: number,
  seasons: StoryDocumentSeason[],
): Promise<number[]> {
  const episodeIdsByIndex: number[] = [];
  for (const [seasonIndex, season] of seasons.entries()) {
    const createdSeason = await createTvSeason({
      storyId,
      url: season.url ?? null,
      sortOrder: seasonIndex,
    });
    for (const [episodeIndex, episode] of season.episodes.entries()) {
      const createdEpisode = await createEpisode({
        seasonId: createdSeason.id,
        name: episode.name,
        url: episode.url ?? null,
        sortOrder: episodeIndex,
      });
      episodeIdsByIndex.push(createdEpisode.id);
    }
  }
  return episodeIdsByIndex;
}

async function importCharacters(
  storyId: number,
  characters: StoryDocumentCharacter[],
  chapterIdsByIndex: number[],
  episodeIdsByIndex: number[],
): Promise<void> {
  for (const [characterIndex, character] of characters.entries()) {
    const createdCharacter = await createCharacter({
      storyId,
      name: character.name,
      group: character.group ?? null,
      icon: character.icon ?? null,
      color: character.color ?? null,
      url: character.url ?? null,
      sortOrder: characterIndex,
    });
    for (const [positionIndex, position] of character.positions.entries()) {
      const path = `characters[${characterIndex}].positions[${positionIndex}]`;
      await createCharacterPosition({
        characterId: createdCharacter.id,
        position: { lat: position.lat, lng: position.lng },
        dead: position.dead ?? false,
        note: position.note ?? null,
        tail: position.tail ?? null,
        chapterRange: resolveChapterRange(position.chapters, chapterIdsByIndex, `${path}.chapters`),
        episodeRange: resolveEpisodeRange(position.episodes, episodeIdsByIndex, `${path}.episodes`),
      });
    }
  }
}

async function importMarkerSets(
  storyId: number,
  markerSets: StoryDocumentMarkerSet[],
  chapterIdsByIndex: number[],
  episodeIdsByIndex: number[],
): Promise<void> {
  for (const [markerSetIndex, markerSet] of markerSets.entries()) {
    const createdMarkerSet = await createMarkerSet({ storyId, name: markerSet.name });
    for (const [markerIndex, marker] of markerSet.markers.entries()) {
      const path = `markerSets[${markerSetIndex}].markers[${markerIndex}]`;
      await createMarker({
        markerSetId: createdMarkerSet.id,
        label: marker.label,
        icon: marker.icon ?? null,
        color: marker.color ?? null,
        position: { lat: marker.lat, lng: marker.lng },
        polygon: marker.polygon ?? null,
        chapterRange: resolveChapterRange(marker.chapters, chapterIdsByIndex, `${path}.chapters`),
        episodeRange: resolveEpisodeRange(marker.episodes, episodeIdsByIndex, `${path}.episodes`),
      });
    }
  }
}

/**
 * Creates a brand-new story (and everything under it) from a StoryDocument.
 * Never updates an existing story — even re-importing the same file always
 * produces a new one, its name suffixed with " v2" to tell it apart from
 * wherever it came from. If anything fails partway through, the partially
 * created story is deleted (cascading to its books/characters/etc.) before
 * the error is re-thrown.
 */
export async function importStoryDocument(document: StoryDocument): Promise<Story> {
  const story = await createStory({
    name: `${document.name} v2`,
    tileUrlTemplate: document.tileUrlTemplate ?? null,
    tileLayerAuthor: document.tileLayerAuthor ?? null,
    tileLayerAttributionUrl: document.tileLayerAttributionUrl ?? null,
    initialCenter: document.initialCenter,
    initialZoom: document.initialZoom,
    minZoom: document.minZoom,
    maxZoom: document.maxZoom,
  });

  try {
    const chapterIdsByIndex = await importBooks(story.id, document.books);
    const episodeIdsByIndex = await importTelevision(story.id, document.television);
    await importCharacters(story.id, document.characters, chapterIdsByIndex, episodeIdsByIndex);
    await importMarkerSets(story.id, document.markerSets, chapterIdsByIndex, episodeIdsByIndex);
    return story;
  } catch (error) {
    await deleteStory(story.id);
    throw error;
  }
}

/** Parses, validates, and imports a story from a YAML string. */
export async function importStoryFromYaml(yamlText: string): Promise<Story> {
  const document = parseStoryDocument(yamlText);
  return importStoryDocument(document);
}
