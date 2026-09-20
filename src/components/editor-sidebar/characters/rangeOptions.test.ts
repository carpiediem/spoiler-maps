import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createBook, createChapter, createStory } from '../../../db';
import { resetDatabaseForTests } from '../../../db/client';
import { RangeOptionsProvider, useRangeOptions, type RangeOptions } from './rangeOptions';

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
