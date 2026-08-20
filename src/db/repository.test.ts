import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetDatabaseForTests } from './client';
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
  deleteBook,
  deleteChapter,
  deleteCharacter,
  deleteCharacterPosition,
  deleteEpisode,
  deleteMarker,
  deleteMarkerSet,
  deleteStory,
  deleteTvSeason,
  getStory,
  listBooksForStory,
  listChaptersForBook,
  listCharacterPositionsForCharacter,
  listCharactersForStory,
  listEpisodesForSeason,
  listMarkerSetsForStory,
  listMarkersForMarkerSet,
  listStories,
  listTvSeasonsForStory,
  updateBook,
  updateChapter,
  updateCharacter,
  updateCharacterPosition,
  updateEpisode,
  updateMarker,
  updateMarkerSet,
  updateStory,
  updateTvSeason,
} from './repository';
import type { NewStory } from './types';

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

const exampleStory: NewStory = {
  name: 'A Song of Ice and Fire',
  tileUrlTemplate: 'https://tile.example.com/{z}/{x}/{y}.png',
  initialCenterLat: 39.8283,
  initialCenterLng: -98.5795,
  initialZoom: 4,
};

async function seedStory() {
  return createStory(exampleStory);
}

describe('stories', () => {
  it('creates and lists stories', async () => {
    const story = await seedStory();

    expect(story).toEqual({ id: story.id, ...exampleStory });
    expect(await listStories()).toEqual([story]);
  });

  it('gets a story by id, or null if it does not exist', async () => {
    const story = await seedStory();

    expect(await getStory(story.id)).toEqual(story);
    expect(await getStory(story.id + 1)).toBeNull();
  });

  it('updates a story', async () => {
    const story = await seedStory();

    await updateStory(story.id, { ...exampleStory, name: 'Renamed' });

    expect(await getStory(story.id)).toEqual({ ...story, name: 'Renamed' });
  });

  it('deletes a story, cascading to its children', async () => {
    const story = await seedStory();
    const book = await createBook({
      storyId: story.id,
      name: 'A Game of Thrones',
      author: null,
      url: null,
      sortOrder: 0,
    });
    const markerSet = await createMarkerSet({ storyId: story.id, name: 'Houses' });

    await deleteStory(story.id);

    expect(await getStory(story.id)).toBeNull();
    expect(await listBooksForStory(story.id)).toEqual([]);
    expect(await listMarkerSetsForStory(story.id)).toEqual([]);
    // Verify via the database directly, since book.id is gone along with its story.
    expect(book.storyId).toBe(story.id);
    expect(markerSet.storyId).toBe(story.id);
  });
});

describe('books and chapters', () => {
  it('creates, lists, updates, and deletes books for a story', async () => {
    const story = await seedStory();
    const book = await createBook({
      storyId: story.id,
      name: 'A Game of Thrones',
      author: 'George R. R. Martin',
      url: null,
      sortOrder: 0,
    });

    expect(await listBooksForStory(story.id)).toEqual([book]);

    await updateBook(book.id, { ...book, name: 'Renamed' });
    expect((await listBooksForStory(story.id))[0].name).toBe('Renamed');

    await deleteBook(book.id);
    expect(await listBooksForStory(story.id)).toEqual([]);
  });

  it('creates, lists, updates, and deletes chapters for a book, cascading on book delete', async () => {
    const story = await seedStory();
    const book = await createBook({
      storyId: story.id,
      name: 'A Game of Thrones',
      author: null,
      url: null,
      sortOrder: 0,
    });
    const chapter = await createChapter({ bookId: book.id, name: 'Bran', sortOrder: 0 });

    expect(await listChaptersForBook(book.id)).toEqual([chapter]);

    await updateChapter(chapter.id, { bookId: book.id, name: 'Bran I', sortOrder: 0 });
    expect((await listChaptersForBook(book.id))[0].name).toBe('Bran I');

    await deleteChapter(chapter.id);
    expect(await listChaptersForBook(book.id)).toEqual([]);

    const secondChapter = await createChapter({ bookId: book.id, name: 'Catelyn', sortOrder: 1 });
    await deleteBook(book.id);
    expect(await listChaptersForBook(secondChapter.bookId)).toEqual([]);
  });
});

describe('tv seasons and episodes', () => {
  it('creates, lists, updates, and deletes tv seasons for a story', async () => {
    const story = await seedStory();
    const season = await createTvSeason({
      storyId: story.id,
      url: 'https://imdb.example.com/s1',
      sortOrder: 0,
    });

    expect(await listTvSeasonsForStory(story.id)).toEqual([season]);

    await updateTvSeason(season.id, { ...season, url: 'https://imdb.example.com/s1-updated' });
    expect((await listTvSeasonsForStory(story.id))[0].url).toBe(
      'https://imdb.example.com/s1-updated',
    );

    await deleteTvSeason(season.id);
    expect(await listTvSeasonsForStory(story.id)).toEqual([]);
  });

  it('creates, lists, updates, and deletes episodes for a season, cascading on season delete', async () => {
    const story = await seedStory();
    const season = await createTvSeason({ storyId: story.id, url: null, sortOrder: 0 });
    const episode = await createEpisode({
      seasonId: season.id,
      name: 'Winter Is Coming',
      url: null,
      sortOrder: 0,
    });

    expect(await listEpisodesForSeason(season.id)).toEqual([episode]);

    await updateEpisode(episode.id, { ...episode, name: 'Renamed' });
    expect((await listEpisodesForSeason(season.id))[0].name).toBe('Renamed');

    await deleteEpisode(episode.id);
    expect(await listEpisodesForSeason(season.id)).toEqual([]);

    const secondEpisode = await createEpisode({
      seasonId: season.id,
      name: 'The Kingsroad',
      url: null,
      sortOrder: 1,
    });
    await deleteTvSeason(season.id);
    expect(await listEpisodesForSeason(secondEpisode.seasonId)).toEqual([]);
  });
});

describe('marker sets and markers', () => {
  it('creates, lists, updates, and deletes marker sets for a story', async () => {
    const story = await seedStory();
    const markerSet = await createMarkerSet({ storyId: story.id, name: 'Houses' });

    expect(await listMarkerSetsForStory(story.id)).toEqual([markerSet]);

    await updateMarkerSet(markerSet.id, { ...markerSet, name: 'Renamed' });
    expect((await listMarkerSetsForStory(story.id))[0].name).toBe('Renamed');

    await deleteMarkerSet(markerSet.id);
    expect(await listMarkerSetsForStory(story.id)).toEqual([]);
  });

  it('creates, lists, updates, and deletes markers for a marker set, cascading on marker set delete', async () => {
    const story = await seedStory();
    const markerSet = await createMarkerSet({ storyId: story.id, name: 'Houses' });
    const marker = await createMarker({
      markerSetId: markerSet.id,
      label: 'Winterfell',
      icon: 'castle',
      lat: 54.5,
      lng: -1.5,
    });

    expect(await listMarkersForMarkerSet(markerSet.id)).toEqual([marker]);

    await updateMarker(marker.id, { ...marker, label: 'Renamed' });
    expect((await listMarkersForMarkerSet(markerSet.id))[0].label).toBe('Renamed');

    await deleteMarker(marker.id);
    expect(await listMarkersForMarkerSet(markerSet.id)).toEqual([]);

    const secondMarker = await createMarker({
      markerSetId: markerSet.id,
      label: "King's Landing",
      icon: null,
      lat: 42.6,
      lng: 8.7,
    });
    await deleteMarkerSet(markerSet.id);
    expect(await listMarkersForMarkerSet(secondMarker.markerSetId)).toEqual([]);
  });
});

describe('characters', () => {
  it('creates, lists, updates, and deletes characters for a story', async () => {
    const story = await seedStory();
    const character = await createCharacter({
      storyId: story.id,
      name: 'Jon Snow',
      group: 'Stark',
      icon: null,
    });

    expect(await listCharactersForStory(story.id)).toEqual([character]);

    await updateCharacter(character.id, { ...character, group: 'Night’s Watch' });
    expect((await listCharactersForStory(story.id))[0].group).toBe('Night’s Watch');

    await deleteCharacter(character.id);
    expect(await listCharactersForStory(story.id)).toEqual([]);
  });
});

describe('character positions', () => {
  async function seedCharacterAndBook() {
    const story = await seedStory();
    const character = await createCharacter({
      storyId: story.id,
      name: 'Jon Snow',
      group: 'Stark',
      icon: null,
    });
    const book = await createBook({
      storyId: story.id,
      name: 'A Game of Thrones',
      author: null,
      url: null,
      sortOrder: 0,
    });
    const chapter1 = await createChapter({ bookId: book.id, name: 'Bran I', sortOrder: 0 });
    const chapter2 = await createChapter({ bookId: book.id, name: 'Jon I', sortOrder: 1 });
    return { character, book, chapter1, chapter2 };
  }

  it('creates, lists, updates, and deletes a position with no ranges', async () => {
    const { character } = await seedCharacterAndBook();
    const position = await createCharacterPosition({
      characterId: character.id,
      lat: 54.5,
      lng: -1.5,
      chapterRange: null,
      episodeRange: null,
    });

    expect(await listCharacterPositionsForCharacter(character.id)).toEqual([position]);

    await updateCharacterPosition(position.id, { ...position, lat: 10, lng: 20 });
    expect((await listCharacterPositionsForCharacter(character.id))[0]).toMatchObject({
      lat: 10,
      lng: 20,
    });

    await deleteCharacterPosition(position.id);
    expect(await listCharacterPositionsForCharacter(character.id)).toEqual([]);
  });

  it('round-trips a bounded chapter range', async () => {
    const { character, book, chapter1, chapter2 } = await seedCharacterAndBook();
    const position = await createCharacterPosition({
      characterId: character.id,
      lat: 54.5,
      lng: -1.5,
      chapterRange: { bookId: book.id, startChapterId: chapter1.id, endChapterId: chapter2.id },
      episodeRange: null,
    });

    expect(await listCharacterPositionsForCharacter(character.id)).toEqual([position]);
  });

  it('round-trips an open-ended chapter range', async () => {
    const { character, book } = await seedCharacterAndBook();
    const position = await createCharacterPosition({
      characterId: character.id,
      lat: 54.5,
      lng: -1.5,
      chapterRange: { bookId: book.id, startChapterId: null, endChapterId: null },
      episodeRange: null,
    });

    expect(await listCharacterPositionsForCharacter(character.id)).toEqual([position]);
  });

  it('round-trips an episode range', async () => {
    const story = await seedStory();
    const character = await createCharacter({
      storyId: story.id,
      name: 'Jon Snow',
      group: 'Stark',
      icon: null,
    });
    const season = await createTvSeason({ storyId: story.id, url: null, sortOrder: 0 });
    const episode = await createEpisode({
      seasonId: season.id,
      name: 'Winter Is Coming',
      url: null,
      sortOrder: 0,
    });
    const position = await createCharacterPosition({
      characterId: character.id,
      lat: 54.5,
      lng: -1.5,
      chapterRange: null,
      episodeRange: { seasonId: season.id, startEpisodeId: episode.id, endEpisodeId: null },
    });

    expect(await listCharacterPositionsForCharacter(character.id)).toEqual([position]);
  });

  it('clears a range boundary when its chapter is deleted, without deleting the position', async () => {
    const { character, book, chapter1, chapter2 } = await seedCharacterAndBook();
    const position = await createCharacterPosition({
      characterId: character.id,
      lat: 54.5,
      lng: -1.5,
      chapterRange: { bookId: book.id, startChapterId: chapter1.id, endChapterId: chapter2.id },
      episodeRange: null,
    });

    await deleteChapter(chapter1.id);

    expect(await listCharacterPositionsForCharacter(character.id)).toEqual([
      {
        ...position,
        chapterRange: { bookId: book.id, startChapterId: null, endChapterId: chapter2.id },
      },
    ]);
  });

  it('deletes a position when its character is deleted', async () => {
    const { character } = await seedCharacterAndBook();
    await createCharacterPosition({
      characterId: character.id,
      lat: 54.5,
      lng: -1.5,
      chapterRange: null,
      episodeRange: null,
    });

    await deleteCharacter(character.id);

    expect(await listCharacterPositionsForCharacter(character.id)).toEqual([]);
  });
});
