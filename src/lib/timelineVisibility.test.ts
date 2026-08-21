import { describe, expect, it } from 'vitest';
import type { CharacterPosition } from '../db';
import type { FlatOption } from '../components/editor-sidebar/characters/rangeOptions';
import { makeTimelineVisibilityChecker } from './timelineVisibility';

const chapterOptions: FlatOption[] = [
  { id: 1, index: 1, label: '1. AGOT: Prologue', url: null },
  { id: 2, index: 2, label: '2. AGOT: Bran', url: null },
];
const episodeOptions: FlatOption[] = [
  { id: 10, index: 1, label: '1. S01E01: Winter Is Coming', url: null },
  { id: 11, index: 2, label: '2. S01E02: The Kingsroad', url: null },
];

function makePosition(overrides: Partial<CharacterPosition> = {}): CharacterPosition {
  return {
    id: 1,
    characterId: 1,
    position: { lat: 0, lng: 0 },
    dead: false,
    note: null,
    tail: null,
    chapterRange: null,
    episodeRange: null,
    ...overrides,
  };
}

describe('makeTimelineVisibilityChecker', () => {
  it('is visible when its start chapter is at the timeline index', () => {
    const isVisible = makeTimelineVisibilityChecker('book', 2, chapterOptions, episodeOptions);
    const position = makePosition({
      chapterRange: { startChapterId: 2, endChapterId: null },
    });
    expect(isVisible(position)).toBe(true);
  });

  it('is visible when its start chapter is before the timeline index', () => {
    const isVisible = makeTimelineVisibilityChecker('book', 2, chapterOptions, episodeOptions);
    const position = makePosition({
      chapterRange: { startChapterId: 1, endChapterId: null },
    });
    expect(isVisible(position)).toBe(true);
  });

  it('is hidden when its start chapter is after the timeline index', () => {
    const isVisible = makeTimelineVisibilityChecker('book', 1, chapterOptions, episodeOptions);
    const position = makePosition({
      chapterRange: { startChapterId: 2, endChapterId: null },
    });
    expect(isVisible(position)).toBe(false);
  });

  it('is visible when the chapterRange is entirely unset', () => {
    const isVisible = makeTimelineVisibilityChecker('book', 1, chapterOptions, episodeOptions);
    expect(isVisible(makePosition({ chapterRange: null }))).toBe(true);
  });

  it('is visible when the start chapter is open (null)', () => {
    const isVisible = makeTimelineVisibilityChecker('book', 1, chapterOptions, episodeOptions);
    const position = makePosition({
      chapterRange: { startChapterId: null, endChapterId: 2 },
    });
    expect(isVisible(position)).toBe(true);
  });

  it('is visible when the start chapter id is not in the options list', () => {
    const isVisible = makeTimelineVisibilityChecker('book', 1, chapterOptions, episodeOptions);
    const position = makePosition({
      chapterRange: { startChapterId: 999, endChapterId: null },
    });
    expect(isVisible(position)).toBe(true);
  });

  it('checks the episode range instead of the chapter range in tv mode', () => {
    const isVisible = makeTimelineVisibilityChecker('tv', 1, chapterOptions, episodeOptions);
    const position = makePosition({
      chapterRange: { startChapterId: 1, endChapterId: null },
      episodeRange: { startEpisodeId: 11, endEpisodeId: null },
    });
    // The chapter range alone would put this at/before index 1, but tv mode
    // should look at the episode range (starts at episode index 2) instead.
    expect(isVisible(position)).toBe(false);
  });
});
