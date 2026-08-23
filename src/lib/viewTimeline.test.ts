import { describe, expect, it } from 'vitest';
import type { StoryDocument, StoryDocumentPosition } from './storyDocument';
import {
  buildDocumentChapterOptions,
  buildDocumentEpisodeOptions,
  isPositionVisible,
  parseTimelineHash,
} from './viewTimeline';

function minimalDocument(overrides: Partial<StoryDocument> = {}): StoryDocument {
  return {
    name: 'Test',
    initialCenter: { lat: 0, lng: 0 },
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

describe('buildDocumentChapterOptions', () => {
  it('flattens every book’s chapters in order, with a growing 0-based index', () => {
    const document = minimalDocument({
      books: [
        {
          name: 'A Game of Thrones',
          chapters: [{ name: 'Prologue' }, { name: 'Bran', url: 'https://example.com/bran' }],
        },
        { name: 'A Clash of Kings', chapters: [{ name: 'Prologue' }] },
      ],
    });

    expect(buildDocumentChapterOptions(document)).toEqual([
      { id: 0, index: 0, label: '1. AGOT: Prologue', url: null },
      { id: 1, index: 1, label: '2. AGOT: Bran', url: 'https://example.com/bran' },
      { id: 2, index: 2, label: '3. ACOK: Prologue', url: null },
    ]);
  });

  it('falls back to "Untitled Book"/"Untitled Chapter" for blank names', () => {
    const document = minimalDocument({ books: [{ name: '', chapters: [{ name: '' }] }] });

    expect(buildDocumentChapterOptions(document)).toEqual([
      { id: 0, index: 0, label: '1. Untitled Book: Untitled Chapter', url: null },
    ]);
  });
});

describe('buildDocumentEpisodeOptions', () => {
  it('falls back to "Untitled Episode" for a blank name', () => {
    const document = minimalDocument({ television: [{ episodes: [{ name: '' }] }] });

    expect(buildDocumentEpisodeOptions(document)).toEqual([
      { id: 0, index: 0, label: '1. S01E01: Untitled Episode', url: null },
    ]);
  });

  it('flattens every season’s episodes in order, with an SxxExx code', () => {
    const document = minimalDocument({
      television: [
        { episodes: [{ name: 'Winter Is Coming' }, { name: 'The Kingsroad' }] },
        { episodes: [{ name: 'Valar Dohaeris' }] },
      ],
    });

    expect(buildDocumentEpisodeOptions(document)).toEqual([
      { id: 0, index: 0, label: '1. S01E01: Winter Is Coming', url: null },
      { id: 1, index: 1, label: '2. S01E02: The Kingsroad', url: null },
      { id: 2, index: 2, label: '3. S02E01: Valar Dohaeris', url: null },
    ]);
  });
});

describe('isPositionVisible', () => {
  it('is always visible when the range for the active medium is unset', () => {
    expect(isPositionVisible({ lat: 0, lng: 0 }, 'book', 1)).toBe(true);
    expect(isPositionVisible({ lat: 0, lng: 0, chapters: [null, null] }, 'book', 1)).toBe(true);
  });

  it('is visible once the 1-based current index passes the 0-based start boundary', () => {
    const position: StoryDocumentPosition = { lat: 0, lng: 0, chapters: [2, null] };

    expect(isPositionVisible(position, 'book', 2)).toBe(false);
    expect(isPositionVisible(position, 'book', 3)).toBe(true);
    expect(isPositionVisible(position, 'book', 4)).toBe(true);
  });

  it('checks the episode range only in tv mode', () => {
    const position: StoryDocumentPosition = {
      lat: 0,
      lng: 0,
      chapters: [5, null],
      episodes: [0, null],
    };

    expect(isPositionVisible(position, 'book', 1)).toBe(false);
    expect(isPositionVisible(position, 'tv', 1)).toBe(true);
  });

  it('is hidden in book mode when the position is restricted only by an episode range', () => {
    const position: StoryDocumentPosition = { lat: 0, lng: 0, episodes: [0, null] };

    expect(isPositionVisible(position, 'book', 1)).toBe(false);
  });

  it('is hidden in tv mode when the position is restricted only by a chapter range', () => {
    const position: StoryDocumentPosition = { lat: 0, lng: 0, chapters: [0, null] };

    expect(isPositionVisible(position, 'tv', 1)).toBe(false);
  });

  it('is visible in both mediums when neither range is set at all', () => {
    const position: StoryDocumentPosition = { lat: 0, lng: 0 };

    expect(isPositionVisible(position, 'book', 1)).toBe(true);
    expect(isPositionVisible(position, 'tv', 1)).toBe(true);
  });
});

describe('parseTimelineHash', () => {
  it('parses a #chapter-N fragment into book mode', () => {
    expect(parseTimelineHash('#chapter-20')).toEqual({ mode: 'book', index: 20 });
  });

  it('parses a #episode-N fragment into tv mode', () => {
    expect(parseTimelineHash('#episode-3')).toEqual({ mode: 'tv', index: 3 });
  });

  it('is case-insensitive', () => {
    expect(parseTimelineHash('#Chapter-5')).toEqual({ mode: 'book', index: 5 });
    expect(parseTimelineHash('#EPISODE-5')).toEqual({ mode: 'tv', index: 5 });
  });

  it('returns null for an empty hash', () => {
    expect(parseTimelineHash('')).toBeNull();
  });

  it('returns null for an unrelated hash', () => {
    expect(parseTimelineHash('#books-2')).toBeNull();
  });

  it('returns null for a fragment missing its index', () => {
    expect(parseTimelineHash('#chapter')).toBeNull();
    expect(parseTimelineHash('#chapter-')).toBeNull();
  });

  it('returns null for a zero index', () => {
    expect(parseTimelineHash('#chapter-0')).toBeNull();
  });
});
