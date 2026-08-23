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
} from '../db';
import { resetDatabaseForTests } from '../db/client';
import { buildStoryDocument, exportStoryToYaml } from './storyExport';

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

async function seedStoryId(): Promise<number> {
  const story = await createStory({
    name: 'A Song of Ice and Fire',
    tileUrlTemplate: 'https://tile.example.com/{z}/{x}/{y}.png',
    tileLayerAuthor: 'Some Cartographer',
    tileLayerAttributionUrl: 'https://example.com',
    initialCenter: { lat: 39.8283, lng: -98.5795 },
    initialZoom: 4,
    minZoom: 0,
    maxZoom: 19,
  });
  return story.id;
}

describe('buildStoryDocument', () => {
  it('throws for a story that does not exist', async () => {
    await expect(buildStoryDocument(999)).rejects.toThrow('Story 999 does not exist.');
  });

  it('builds the top-level story fields, omitting unset optional ones', async () => {
    const story = await createStory({
      name: 'The Wheel of Time',
      tileUrlTemplate: null,
      tileLayerAuthor: null,
      tileLayerAttributionUrl: null,
      initialCenter: { lat: 1, lng: 2 },
      initialZoom: 5,
      minZoom: 1,
      maxZoom: 18,
    });

    const document = await buildStoryDocument(story.id);

    expect(document).toEqual({
      name: 'The Wheel of Time',
      initialCenter: { lat: 1, lng: 2 },
      initialZoom: 5,
      minZoom: 1,
      maxZoom: 18,
      books: [],
      television: [],
      characters: [],
      markerSets: [],
    });
  });

  it('includes tile fields when set', async () => {
    const storyId = await seedStoryId();

    const document = await buildStoryDocument(storyId);

    expect(document.tileUrlTemplate).toBe('https://tile.example.com/{z}/{x}/{y}.png');
    expect(document.tileLayerAuthor).toBe('Some Cartographer');
    expect(document.tileLayerAttributionUrl).toBe('https://example.com');
  });

  it('nests chapters under their book, omitting unset author/url', async () => {
    const storyId = await seedStoryId();
    const book = await createBook({
      storyId,
      name: 'A Game of Thrones',
      author: null,
      url: null,
      sortOrder: 0,
    });
    await createChapter({ bookId: book.id, name: 'Prologue', url: null, sortOrder: 0 });
    await createChapter({
      bookId: book.id,
      name: 'Bran',
      url: 'https://example.com/bran',
      sortOrder: 1,
    });

    const document = await buildStoryDocument(storyId);

    expect(document.books).toEqual([
      {
        name: 'A Game of Thrones',
        chapters: [{ name: 'Prologue' }, { name: 'Bran', url: 'https://example.com/bran' }],
      },
    ]);
  });

  it('includes a book author/url when set', async () => {
    const storyId = await seedStoryId();
    await createBook({
      storyId,
      name: 'A Game of Thrones',
      author: 'George RR Martin',
      url: 'https://example.com/agot',
      sortOrder: 0,
    });

    const document = await buildStoryDocument(storyId);

    expect(document.books[0]!.author).toBe('George RR Martin');
    expect(document.books[0]!.url).toBe('https://example.com/agot');
  });

  it('nests episodes under their season', async () => {
    const storyId = await seedStoryId();
    const season = await createTvSeason({ storyId, url: null, sortOrder: 0 });
    await createEpisode({
      seasonId: season.id,
      name: 'Winter Is Coming',
      url: null,
      sortOrder: 0,
    });

    const document = await buildStoryDocument(storyId);

    expect(document.television).toEqual([{ episodes: [{ name: 'Winter Is Coming' }] }]);
  });

  it('includes an episode url when set', async () => {
    const storyId = await seedStoryId();
    const season = await createTvSeason({ storyId, url: null, sortOrder: 0 });
    await createEpisode({
      seasonId: season.id,
      name: 'Winter Is Coming',
      url: 'https://example.com/s1e1',
      sortOrder: 0,
    });

    const document = await buildStoryDocument(storyId);

    expect(document.television[0]!.episodes[0]!.url).toBe('https://example.com/s1e1');
  });

  it('resolves a chapter range spanning two books to flat 0-based indices', async () => {
    const storyId = await seedStoryId();
    const book1 = await createBook({
      storyId,
      name: 'A Game of Thrones',
      author: null,
      url: null,
      sortOrder: 0,
    });
    const chapter1 = await createChapter({
      bookId: book1.id,
      name: 'Prologue',
      url: null,
      sortOrder: 0,
    });
    await createChapter({ bookId: book1.id, name: 'Bran', url: null, sortOrder: 1 });
    const book2 = await createBook({
      storyId,
      name: 'A Clash of Kings',
      author: null,
      url: null,
      sortOrder: 1,
    });
    const chapter3 = await createChapter({
      bookId: book2.id,
      name: 'Prologue',
      url: null,
      sortOrder: 0,
    });
    const character = await createCharacter({
      storyId,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: null,
      sortOrder: 0,
      url: null,
    });
    await createCharacterPosition({
      characterId: character.id,
      position: { lat: 1, lng: 1 },
      dead: false,
      note: null,
      tail: null,
      chapterRange: { startChapterId: chapter1.id, endChapterId: chapter3.id },
      episodeRange: null,
    });

    const document = await buildStoryDocument(storyId);

    expect(document.characters[0]!.positions[0]!.chapters).toEqual([0, 2]);
  });

  it('represents an open-ended range with a null boundary', async () => {
    const storyId = await seedStoryId();
    const book = await createBook({
      storyId,
      name: 'A Game of Thrones',
      author: null,
      url: null,
      sortOrder: 0,
    });
    const chapter = await createChapter({ bookId: book.id, name: 'Bran', url: null, sortOrder: 0 });
    const character = await createCharacter({
      storyId,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: null,
      sortOrder: 0,
      url: null,
    });
    await createCharacterPosition({
      characterId: character.id,
      position: { lat: 1, lng: 1 },
      dead: false,
      note: null,
      tail: null,
      chapterRange: { startChapterId: chapter.id, endChapterId: null },
      episodeRange: null,
    });

    const document = await buildStoryDocument(storyId);

    expect(document.characters[0]!.positions[0]!.chapters).toEqual([0, null]);
  });

  it('represents a range with an open start as a null first boundary', async () => {
    const storyId = await seedStoryId();
    const book = await createBook({
      storyId,
      name: 'A Game of Thrones',
      author: null,
      url: null,
      sortOrder: 0,
    });
    const chapter = await createChapter({ bookId: book.id, name: 'Bran', url: null, sortOrder: 0 });
    const character = await createCharacter({
      storyId,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: null,
      sortOrder: 0,
      url: null,
    });
    await createCharacterPosition({
      characterId: character.id,
      position: { lat: 1, lng: 1 },
      dead: false,
      note: null,
      tail: null,
      chapterRange: { startChapterId: null, endChapterId: chapter.id },
      episodeRange: null,
    });

    const document = await buildStoryDocument(storyId);

    expect(document.characters[0]!.positions[0]!.chapters).toEqual([null, 0]);
  });

  it('includes a dead/note/tail position, omitting them for a default one', async () => {
    const storyId = await seedStoryId();
    const character = await createCharacter({
      storyId,
      name: 'Jon Snow',
      group: 'Night’s Watch',
      icon: null,
      color: '#ff0000',
      sortOrder: 0,
      url: null,
    });
    await createCharacterPosition({
      characterId: character.id,
      position: { lat: 1, lng: 1 },
      dead: true,
      note: 'At the Wall',
      tail: [{ lat: 0.5, lng: 0.5 }],
      chapterRange: null,
      episodeRange: null,
    });
    await createCharacterPosition({
      characterId: character.id,
      position: { lat: 2, lng: 2 },
      dead: false,
      note: null,
      tail: null,
      chapterRange: null,
      episodeRange: null,
    });

    const document = await buildStoryDocument(storyId);

    expect(document.characters[0]).toEqual({
      name: 'Jon Snow',
      group: 'Night’s Watch',
      color: '#ff0000',
      positions: [
        { lat: 1, lng: 1, dead: true, note: 'At the Wall', tail: [{ lat: 0.5, lng: 0.5 }] },
        { lat: 2, lng: 2 },
      ],
    });
  });

  it('resolves an episode range and a season url/character icon', async () => {
    const storyId = await seedStoryId();
    const season = await createTvSeason({
      storyId,
      url: 'https://example.com/season1',
      sortOrder: 0,
    });
    const episode = await createEpisode({
      seasonId: season.id,
      name: 'Winter Is Coming',
      url: null,
      sortOrder: 0,
    });
    const character = await createCharacter({
      storyId,
      name: 'Jon Snow',
      group: null,
      icon: 'https://example.com/jon.png',
      color: null,
      sortOrder: 0,
      url: 'https://awoiaf.westeros.org/index.php/Jon_Snow',
    });
    await createCharacterPosition({
      characterId: character.id,
      position: { lat: 1, lng: 1 },
      dead: false,
      note: null,
      tail: null,
      chapterRange: null,
      episodeRange: { startEpisodeId: episode.id, endEpisodeId: episode.id },
    });

    const document = await buildStoryDocument(storyId);

    expect(document.television[0]!.url).toBe('https://example.com/season1');
    expect(document.characters[0]!.icon).toBe('https://example.com/jon.png');
    expect(document.characters[0]!.url).toBe('https://awoiaf.westeros.org/index.php/Jon_Snow');
    expect(document.characters[0]!.positions[0]!.episodes).toEqual([0, 0]);
  });

  it('represents an episode range with an open start as a null first boundary', async () => {
    const storyId = await seedStoryId();
    const season = await createTvSeason({ storyId, url: null, sortOrder: 0 });
    const episode = await createEpisode({
      seasonId: season.id,
      name: 'Winter Is Coming',
      url: null,
      sortOrder: 0,
    });
    const character = await createCharacter({
      storyId,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: null,
      sortOrder: 0,
      url: null,
    });
    await createCharacterPosition({
      characterId: character.id,
      position: { lat: 1, lng: 1 },
      dead: false,
      note: null,
      tail: null,
      chapterRange: null,
      episodeRange: { startEpisodeId: null, endEpisodeId: episode.id },
    });

    const document = await buildStoryDocument(storyId);

    expect(document.characters[0]!.positions[0]!.episodes).toEqual([null, 0]);
  });

  it('nests markers under their marker set, with a polygon and range when set', async () => {
    const storyId = await seedStoryId();
    const book = await createBook({
      storyId,
      name: 'A Game of Thrones',
      author: null,
      url: null,
      sortOrder: 0,
    });
    const chapter = await createChapter({ bookId: book.id, name: 'Bran', url: null, sortOrder: 0 });
    const markerSet = await createMarkerSet({ storyId, name: 'Cities' });
    await createMarker({
      markerSetId: markerSet.id,
      label: 'Winterfell',
      icon: 'https://example.com/winterfell.png',
      color: '#00ff00',
      position: { lat: 3, lng: 3 },
      polygon: [
        { lat: 3.1, lng: 3.1 },
        { lat: 3.2, lng: 3.2 },
      ],
      chapterRange: { startChapterId: chapter.id, endChapterId: chapter.id },
      episodeRange: null,
    });

    const document = await buildStoryDocument(storyId);

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
            polygon: [
              { lat: 3.1, lng: 3.1 },
              { lat: 3.2, lng: 3.2 },
            ],
            chapters: [0, 0],
          },
        ],
      },
    ]);
  });

  it('omits an unset marker color, and includes an episode range when set', async () => {
    const storyId = await seedStoryId();
    const season = await createTvSeason({ storyId, url: null, sortOrder: 0 });
    const episode = await createEpisode({
      seasonId: season.id,
      name: 'Winter Is Coming',
      url: null,
      sortOrder: 0,
    });
    const markerSet = await createMarkerSet({ storyId, name: 'Cities' });
    await createMarker({
      markerSetId: markerSet.id,
      label: 'Winterfell',
      icon: null,
      color: null,
      position: { lat: 3, lng: 3 },
      polygon: null,
      chapterRange: null,
      episodeRange: { startEpisodeId: episode.id, endEpisodeId: episode.id },
    });

    const document = await buildStoryDocument(storyId);

    expect(document.markerSets[0]!.markers[0]).toEqual({
      label: 'Winterfell',
      lat: 3,
      lng: 3,
      episodes: [0, 0],
    });
  });
});

describe('exportStoryToYaml', () => {
  it('serializes the document to a YAML string', async () => {
    const storyId = await seedStoryId();

    const yamlText = await exportStoryToYaml(storyId);

    expect(yamlText).toContain('name: A Song of Ice and Fire');
    expect(yamlText).toContain('initialZoom: 4');
  });
});
