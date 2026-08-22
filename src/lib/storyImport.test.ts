import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createBook,
  createChapter,
  createCharacter,
  createCharacterPosition,
  createEpisode,
  createMarker,
  createMarkerSet,
  createStory,
  createTvSeason,
  listBooksForStory,
  listChaptersForBook,
  listCharacterPositionsForCharacter,
  listCharactersForStory,
  listMarkerSetsForStory,
  listMarkersForMarkerSet,
  listStories,
  listTvSeasonsForStory,
} from '../db';
import { resetDatabaseForTests } from '../db/client';
import { buildStoryDocument } from './storyExport';
import { importStoryDocument, importStoryFromYaml, parseStoryDocument } from './storyImport';
import type { StoryDocument } from './storyDocument';

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

function minimalDocument(overrides: Partial<StoryDocument> = {}): StoryDocument {
  return {
    name: 'A Song of Ice and Fire',
    initialCenter: { lat: 1, lng: 2 },
    initialZoom: 4,
    minZoom: 0,
    maxZoom: 19,
    books: [],
    television: [],
    characters: [],
    markerSets: [],
    ...overrides,
  };
}

describe('parseStoryDocument', () => {
  it('parses a minimal valid document', () => {
    const yamlText = `
name: A Song of Ice and Fire
initialCenter: { lat: 1, lng: 2 }
initialZoom: 4
minZoom: 0
maxZoom: 19
`;
    expect(parseStoryDocument(yamlText)).toEqual(minimalDocument());
  });

  it('throws a clear error for invalid YAML syntax', () => {
    expect(() => parseStoryDocument('name: [unclosed')).toThrow(/Could not parse YAML/);
  });

  it('throws when the document is not a mapping', () => {
    expect(() => parseStoryDocument('- just a list')).toThrow(
      'The document must be a YAML mapping.',
    );
  });

  it('throws when a required field is missing', () => {
    expect(() =>
      parseStoryDocument(
        'initialCenter: { lat: 1, lng: 2 }\ninitialZoom: 4\nminZoom: 0\nmaxZoom: 19',
      ),
    ).toThrow('name must be a string.');
  });

  it('throws when a range tuple is malformed', () => {
    const yamlText = `
name: Test
initialCenter: { lat: 1, lng: 2 }
initialZoom: 4
minZoom: 0
maxZoom: 19
books:
  - name: Book One
    chapters:
      - name: Chapter One
characters:
  - name: Jon Snow
    positions:
      - lat: 1
        lng: 1
        chapters: [0]
`;
    expect(() => parseStoryDocument(yamlText)).toThrow(
      'characters[0].positions[0].chapters must be a two-element [start, end] list.',
    );
  });

  it('throws when an optional string field has the wrong type', () => {
    const yamlText = `
name: Test
initialCenter: { lat: 1, lng: 2 }
initialZoom: 4
minZoom: 0
maxZoom: 19
books:
  - name: Book One
    author: 123
    chapters: []
`;
    expect(() => parseStoryDocument(yamlText)).toThrow('books[0].author must be a string.');
  });

  it('parses television seasons/episodes, marker sets/markers, and a tail', () => {
    const yamlText = `
name: A Song of Ice and Fire
initialCenter: { lat: 1, lng: 2 }
initialZoom: 4
minZoom: 0
maxZoom: 19
television:
  - url: https://example.com/season1
    episodes:
      - name: Winter Is Coming
        url: https://example.com/e1
characters:
  - name: Jon Snow
    icon: https://example.com/jon.png
    positions:
      - lat: 1
        lng: 1
        tail: [{ lat: 0.5, lng: 0.5 }]
        episodes: [0, 0]
markerSets:
  - name: Cities
    markers:
      - label: Winterfell
        icon: https://example.com/winterfell.png
        color: "#00ff00"
        lat: 3
        lng: 3
        polygon: [{ lat: 3.1, lng: 3.1 }]
        chapters: [null, null]
`;
    const document = parseStoryDocument(yamlText);

    expect(document.television).toEqual([
      {
        url: 'https://example.com/season1',
        episodes: [{ name: 'Winter Is Coming', url: 'https://example.com/e1' }],
      },
    ]);
    expect(document.characters[0]!.icon).toBe('https://example.com/jon.png');
    expect(document.characters[0]!.positions[0]!.tail).toEqual([{ lat: 0.5, lng: 0.5 }]);
    expect(document.characters[0]!.positions[0]!.episodes).toEqual([0, 0]);
    expect(document.markerSets).toEqual([
      {
        name: 'Cities',
        markers: [
          {
            label: 'Winterfell',
            icon: 'https://example.com/winterfell.png',
            color: '#00ff00',
            lat: 3,
            lng: 3,
            polygon: [{ lat: 3.1, lng: 3.1 }],
            chapters: [null, null],
            episodes: undefined,
          },
        ],
      },
    ]);
  });

  it('defaults each nested list to empty when its key is omitted entirely', () => {
    const yamlText = `
name: Test
initialCenter: { lat: 1, lng: 2 }
initialZoom: 4
minZoom: 0
maxZoom: 19
books:
  - name: Book One
television:
  - url: https://example.com/season1
characters:
  - name: Jon Snow
markerSets:
  - name: Cities
    markers:
      - label: Winterfell
        lat: 3
        lng: 3
`;
    const document = parseStoryDocument(yamlText);

    expect(document.books[0]!.chapters).toEqual([]);
    expect(document.television[0]!.episodes).toEqual([]);
    expect(document.characters[0]!.positions).toEqual([]);
    expect(document.markerSets[0]!.markers[0]!.polygon).toBeUndefined();
  });

  it('defaults a marker set with no markers key to an empty list', () => {
    const yamlText = `
name: Test
initialCenter: { lat: 1, lng: 2 }
initialZoom: 4
minZoom: 0
maxZoom: 19
markerSets:
  - name: Cities
`;
    const document = parseStoryDocument(yamlText);

    expect(document.markerSets[0]!.markers).toEqual([]);
  });
});

describe('importStoryDocument', () => {
  it('creates a new story with " v2" appended to its name', async () => {
    const story = await importStoryDocument(minimalDocument({ name: 'The Wheel of Time' }));

    expect(story.name).toBe('The Wheel of Time v2');
    expect(story.initialCenter).toEqual({ lat: 1, lng: 2 });
    expect(story.initialZoom).toBe(4);
  });

  it('creates books and chapters in order', async () => {
    const story = await importStoryDocument(
      minimalDocument({
        books: [
          {
            name: 'A Game of Thrones',
            author: 'George R. R. Martin',
            chapters: [{ name: 'Prologue' }, { name: 'Bran', url: 'https://example.com/bran' }],
          },
        ],
      }),
    );

    const [book] = await listBooksForStory(story.id);
    expect(book).toMatchObject({ name: 'A Game of Thrones', author: 'George R. R. Martin' });
    const chapters = await listChaptersForBook(book!.id);
    expect(chapters.map((c) => c.name)).toEqual(['Prologue', 'Bran']);
    expect(chapters[1]!.url).toBe('https://example.com/bran');
  });

  it('creates tv seasons and episodes in order', async () => {
    const story = await importStoryDocument(
      minimalDocument({
        television: [{ episodes: [{ name: 'Winter Is Coming' }, { name: 'The Kingsroad' }] }],
      }),
    );

    const [season] = await listTvSeasonsForStory(story.id);
    expect(season).toBeTruthy();
  });

  it('resolves a chapter range tuple spanning two books back to chapter ids', async () => {
    const story = await importStoryDocument(
      minimalDocument({
        books: [
          {
            name: 'A Game of Thrones',
            chapters: [{ name: 'Prologue' }, { name: 'Bran' }],
          },
          {
            name: 'A Clash of Kings',
            chapters: [{ name: 'Prologue' }],
          },
        ],
        characters: [
          {
            name: 'Jon Snow',
            positions: [{ lat: 1, lng: 1, chapters: [0, 2] }],
          },
        ],
      }),
    );

    const [character] = await listCharactersForStory(story.id);
    const [position] = await listCharacterPositionsForCharacter(character!.id);
    const books = await listBooksForStory(story.id);
    const book1Chapters = await listChaptersForBook(books[0]!.id);
    const book2Chapters = await listChaptersForBook(books[1]!.id);

    expect(position!.chapterRange).toEqual({
      startChapterId: book1Chapters[0]!.id,
      endChapterId: book2Chapters[0]!.id,
    });
  });

  it('resolves an open-ended range (null boundary)', async () => {
    const story = await importStoryDocument(
      minimalDocument({
        books: [{ name: 'A Game of Thrones', chapters: [{ name: 'Bran' }] }],
        characters: [{ name: 'Jon Snow', positions: [{ lat: 1, lng: 1, chapters: [0, null] }] }],
      }),
    );

    const [character] = await listCharactersForStory(story.id);
    const [position] = await listCharacterPositionsForCharacter(character!.id);

    expect(position!.chapterRange?.endChapterId).toBeNull();
  });

  it('creates marker sets and markers, resolving their ranges', async () => {
    const story = await importStoryDocument(
      minimalDocument({
        books: [{ name: 'A Game of Thrones', chapters: [{ name: 'Bran' }] }],
        markerSets: [
          {
            name: 'Cities',
            markers: [
              {
                label: 'Winterfell',
                lat: 3,
                lng: 3,
                polygon: [{ lat: 3.1, lng: 3.1 }],
                chapters: [0, 0],
              },
            ],
          },
        ],
      }),
    );

    const [markerSet] = await listMarkerSetsForStory(story.id);
    const [marker] = await listMarkersForMarkerSet(markerSet!.id);
    expect(marker).toMatchObject({
      label: 'Winterfell',
      position: { lat: 3, lng: 3 },
      polygon: [{ lat: 3.1, lng: 3.1 }],
    });
    expect(marker!.chapterRange).not.toBeNull();
  });

  it('deletes the partially created story and rethrows when a range references an out-of-bounds index', async () => {
    await expect(
      importStoryDocument(
        minimalDocument({
          books: [{ name: 'A Game of Thrones', chapters: [{ name: 'Bran' }] }],
          characters: [{ name: 'Jon Snow', positions: [{ lat: 1, lng: 1, chapters: [0, 5] }] }],
        }),
      ),
    ).rejects.toThrow(/references index 5/);

    expect(await listStories()).toEqual([]);
  });
});

describe('importStoryFromYaml', () => {
  it('parses and imports in one step', async () => {
    const story = await importStoryFromYaml(
      'name: Test Story\ninitialCenter: { lat: 0, lng: 0 }\ninitialZoom: 4\nminZoom: 0\nmaxZoom: 19',
    );
    expect(story.name).toBe('Test Story v2');
  });
});

describe('round trip', () => {
  it('exports and re-imports a story with the same structure (aside from the name suffix)', async () => {
    const story = await createStory({
      name: 'A Song of Ice and Fire',
      tileUrlTemplate: 'https://tile.example.com/{z}/{x}/{y}.png',
      tileLayerAuthor: null,
      tileLayerAttributionUrl: null,
      initialCenter: { lat: 39.8283, lng: -98.5795 },
      initialZoom: 4,
      minZoom: 0,
      maxZoom: 19,
    });
    const book = await createBook({
      storyId: story.id,
      name: 'A Game of Thrones',
      author: 'George R. R. Martin',
      url: null,
      sortOrder: 0,
    });
    const chapter1 = await createChapter({
      bookId: book.id,
      name: 'Prologue',
      url: null,
      sortOrder: 0,
    });
    await createChapter({ bookId: book.id, name: 'Bran', url: null, sortOrder: 1 });
    const season = await createTvSeason({ storyId: story.id, url: null, sortOrder: 0 });
    const episode = await createEpisode({
      seasonId: season.id,
      name: 'Winter Is Coming',
      url: null,
      sortOrder: 0,
    });
    const character = await createCharacter({
      storyId: story.id,
      name: 'Jon Snow',
      group: "Night's Watch",
      icon: null,
      color: '#ff0000',
      sortOrder: 0,
      url: null,
    });
    await createCharacterPosition({
      characterId: character.id,
      position: { lat: 1, lng: 1 },
      dead: false,
      note: 'At the Wall',
      tail: [{ lat: 0.9, lng: 0.9 }],
      chapterRange: { startChapterId: chapter1.id, endChapterId: null },
      episodeRange: { startEpisodeId: episode.id, endEpisodeId: episode.id },
    });
    const markerSet = await createMarkerSet({ storyId: story.id, name: 'Cities' });
    await createMarker({
      markerSetId: markerSet.id,
      label: 'Winterfell',
      icon: null,
      color: '#00ff00',
      position: { lat: 3, lng: 3 },
      polygon: null,
      chapterRange: null,
      episodeRange: null,
    });

    const originalDocument = await buildStoryDocument(story.id);
    const imported = await importStoryDocument(originalDocument);
    const reExportedDocument = await buildStoryDocument(imported.id);

    expect(imported.name).toBe(`${originalDocument.name} v2`);
    expect(reExportedDocument).toEqual({ ...originalDocument, name: imported.name });
  });
});
