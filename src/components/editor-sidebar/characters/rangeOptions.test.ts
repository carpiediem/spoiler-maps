import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createBook, createChapter, createStory, type Episode, type TvSeason } from '../../../db';
import { resetDatabaseForTests } from '../../../db/client';
import {
  flattenEpisodeOptions,
  RangeOptionsProvider,
  summarizePositionRange,
  toAcronym,
  useRangeOptions,
  type FlatOption,
  type RangeOptions,
} from './rangeOptions';

const chapterOptions: FlatOption[] = [
  { id: 1, index: 1, label: '1. AGOT: Prologue', url: null },
  { id: 2, index: 2, label: '2. AGOT: Bran', url: null },
];
const episodeOptions: FlatOption[] = [
  { id: 10, index: 1, label: '1. S01E01: Winter Is Coming', url: null },
  { id: 11, index: 2, label: '2. S01E02: The Kingsroad', url: null },
];

describe('toAcronym', () => {
  it('takes the first letter of each word, uppercased', () => {
    expect(toAcronym('A Game of Thrones')).toBe('AGOT');
  });

  it('collapses repeated whitespace', () => {
    expect(toAcronym('A  Clash   of Kings')).toBe('ACOK');
  });
});

describe('flattenEpisodeOptions', () => {
  it('labels each episode with a zero-padded SxxExx code and an overall running index', () => {
    const seasons: TvSeason[] = [
      { id: 1, storyId: 1, url: null, sortOrder: 0 },
      { id: 2, storyId: 1, url: null, sortOrder: 1 },
    ];
    const episodesBySeasonId: Record<number, Episode[]> = {
      1: [
        { id: 10, seasonId: 1, name: 'Winter Is Coming', url: null, sortOrder: 0 },
        { id: 11, seasonId: 1, name: 'The Kingsroad', url: null, sortOrder: 1 },
      ],
      2: [{ id: 20, seasonId: 2, name: 'The North Remembers', url: null, sortOrder: 0 }],
    };

    expect(flattenEpisodeOptions(seasons, episodesBySeasonId)).toEqual([
      { id: 10, index: 1, label: '1. S01E01: Winter Is Coming', url: null },
      { id: 11, index: 2, label: '2. S01E02: The Kingsroad', url: null },
      { id: 20, index: 3, label: '3. S02E01: The North Remembers', url: null },
    ]);
  });

  it('pads season/episode numbers past 9 into double digits, and falls back for an untitled episode', () => {
    const seasons: TvSeason[] = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      storyId: 1,
      url: null,
      sortOrder: i,
    }));
    const episodesBySeasonId: Record<number, Episode[]> = Object.fromEntries(
      seasons.map((season) => [
        season.id,
        Array.from({ length: 10 }, (_, i) => ({
          id: season.id * 100 + i,
          seasonId: season.id,
          name: season.id === 10 && i === 9 ? '' : `Episode ${i + 1}`,
          url: null,
          sortOrder: i,
        })),
      ]),
    );

    const options = flattenEpisodeOptions(seasons, episodesBySeasonId);
    expect(options[options.length - 1]).toEqual({
      id: 1009,
      index: 100,
      label: '100. S10E10: Untitled Episode',
      url: null,
    });
  });
});

describe('summarizePositionRange', () => {
  it('hides both when the ranges are null', () => {
    expect(summarizePositionRange(null, null, chapterOptions, episodeOptions)).toEqual({
      chapters: null,
      episodes: null,
    });
  });

  it('hides a range whose boundaries are both explicitly unset', () => {
    expect(
      summarizePositionRange(
        { startChapterId: null, endChapterId: null },
        null,
        chapterOptions,
        episodeOptions,
      ),
    ).toEqual({ chapters: null, episodes: null });
  });

  it('summarizes a chapter range with both boundaries set', () => {
    expect(
      summarizePositionRange(
        { startChapterId: 1, endChapterId: 2 },
        null,
        chapterOptions,
        episodeOptions,
      ).chapters,
    ).toEqual({ shortLabel: '1 → 2', fullLabel: '1. AGOT: Prologue → 2. AGOT: Bran' });
  });

  it('collapses to a single value when both boundaries name the same chapter', () => {
    expect(
      summarizePositionRange(
        { startChapterId: 1, endChapterId: 1 },
        null,
        chapterOptions,
        episodeOptions,
      ).chapters,
    ).toEqual({ shortLabel: '1', fullLabel: '1. AGOT: Prologue' });
  });

  it('describes a chapter range open on the start', () => {
    expect(
      summarizePositionRange(
        { startChapterId: null, endChapterId: 2 },
        null,
        chapterOptions,
        episodeOptions,
      ).chapters,
    ).toEqual({ shortLabel: '→ 2', fullLabel: 'beginning → 2. AGOT: Bran' });
  });

  it('describes a chapter range open on the end', () => {
    expect(
      summarizePositionRange(
        { startChapterId: 1, endChapterId: null },
        null,
        chapterOptions,
        episodeOptions,
      ).chapters,
    ).toEqual({ shortLabel: '1 →', fullLabel: '1. AGOT: Prologue → end' });
  });

  it('summarizes an episode range', () => {
    expect(
      summarizePositionRange(
        null,
        { startEpisodeId: 10, endEpisodeId: 11 },
        chapterOptions,
        episodeOptions,
      ).episodes,
    ).toEqual({
      shortLabel: '1 → 2',
      fullLabel: '1. S01E01: Winter Is Coming → 2. S01E02: The Kingsroad',
    });
  });

  it('summarizes both a chapter range and an episode range together', () => {
    const summary = summarizePositionRange(
      { startChapterId: 1, endChapterId: null },
      { startEpisodeId: null, endEpisodeId: 11 },
      chapterOptions,
      episodeOptions,
    );
    expect(summary.chapters).toEqual({ shortLabel: '1 →', fullLabel: '1. AGOT: Prologue → end' });
    expect(summary.episodes).toEqual({
      shortLabel: '→ 2',
      fullLabel: 'beginning → 2. S01E02: The Kingsroad',
    });
  });

  it('falls back to "#id" when a boundary chapter/episode is not in the options list', () => {
    expect(
      summarizePositionRange(
        { startChapterId: 999, endChapterId: null },
        null,
        chapterOptions,
        episodeOptions,
      ).chapters,
    ).toEqual({ shortLabel: '#999 →', fullLabel: '#999 → end' });
  });
});

describe('useRangeOptions', () => {
  beforeEach(() => {
    resetDatabaseForTests();
  });

  afterEach(async () => {
    resetDatabaseForTests();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase('spoiler-maps');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });

  async function seedStoryWithChapter(): Promise<number> {
    const story = await createStory({
      name: 'A Song of Ice and Fire',
      tileUrlTemplate: null,
      tileLayerAuthor: null,
      tileLayerAttributionUrl: null,
      initialCenter: { lat: 0, lng: 0 },
      initialZoom: 4,
      minZoom: 0,
      maxZoom: 19,
      description: null,
      paletteKey: null,
    });
    const book = await createBook({
      storyId: story.id,
      name: 'A Game of Thrones',
      author: null,
      url: null,
      sortOrder: 0,
    });
    await createChapter({ bookId: book.id, name: 'Prologue', url: null, sortOrder: 0 });
    return story.id;
  }

  it('loads the story’s chapters itself when no provider is above it', async () => {
    const storyId = await seedStoryWithChapter();

    const { result } = renderHook(() => useRangeOptions(storyId));

    await waitFor(() => expect(result.current.hasBooks).toBe(true));
    expect(result.current.chapterOptions.map((option) => option.label)).toEqual([
      '1. AGOT: Prologue',
    ]);
  });

  it('returns a provider’s value as-is, without loading anything of its own', async () => {
    // The story has a chapter in the database, but the provider says there
    // are none: if the hook still queried for itself, hasBooks would flip.
    const storyId = await seedStoryWithChapter();
    const shared: RangeOptions = {
      chapterOptions: [],
      episodeOptions: [],
      hasBooks: false,
      hasSeasons: false,
    };
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(RangeOptionsProvider, { value: shared }, children);

    const { result } = renderHook(() => useRangeOptions(storyId), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(result.current).toBe(shared);
    expect(result.current.hasBooks).toBe(false);
  });
});
