import { describe, expect, it } from 'vitest';
import { describePositionRange, toAcronym, type FlatOption } from './rangeOptions';

const chapterOptions: FlatOption[] = [
  { id: 1, label: '1. AGOT: Prologue' },
  { id: 2, label: '2. AGOT: Bran' },
];
const episodeOptions: FlatOption[] = [
  { id: 10, label: '1. Season 1: Winter Is Coming' },
  { id: 11, label: '2. Season 1: The Kingsroad' },
];

describe('toAcronym', () => {
  it('takes the first letter of each word, uppercased', () => {
    expect(toAcronym('A Game of Thrones')).toBe('AGOT');
  });

  it('collapses repeated whitespace', () => {
    expect(toAcronym('A  Clash   of Kings')).toBe('ACOK');
  });
});

describe('describePositionRange', () => {
  it('falls back to "Always visible" when both ranges are null', () => {
    expect(describePositionRange(null, null, chapterOptions, episodeOptions)).toBe(
      'Always visible',
    );
  });

  it('describes a chapter range with both boundaries set', () => {
    expect(
      describePositionRange(
        { startChapterId: 1, endChapterId: 2 },
        null,
        chapterOptions,
        episodeOptions,
      ),
    ).toBe('Chapters 1. AGOT: Prologue → 2. AGOT: Bran');
  });

  it('describes a chapter range open on the start', () => {
    expect(
      describePositionRange(
        { startChapterId: null, endChapterId: 2 },
        null,
        chapterOptions,
        episodeOptions,
      ),
    ).toBe('Chapters Start → 2. AGOT: Bran');
  });

  it('describes a chapter range open on the end', () => {
    expect(
      describePositionRange(
        { startChapterId: 1, endChapterId: null },
        null,
        chapterOptions,
        episodeOptions,
      ),
    ).toBe('Chapters 1. AGOT: Prologue → End');
  });

  it('describes an episode range', () => {
    expect(
      describePositionRange(
        null,
        { startEpisodeId: 10, endEpisodeId: 11 },
        chapterOptions,
        episodeOptions,
      ),
    ).toBe('Episodes 1. Season 1: Winter Is Coming → 2. Season 1: The Kingsroad');
  });

  it('describes both a chapter range and an episode range together', () => {
    expect(
      describePositionRange(
        { startChapterId: 1, endChapterId: null },
        { startEpisodeId: null, endEpisodeId: 11 },
        chapterOptions,
        episodeOptions,
      ),
    ).toBe('Chapters 1. AGOT: Prologue → End · Episodes Start → 2. Season 1: The Kingsroad');
  });

  it('falls back to "#id" when a boundary chapter/episode is not in the options list', () => {
    expect(
      describePositionRange(
        { startChapterId: 999, endChapterId: null },
        null,
        chapterOptions,
        episodeOptions,
      ),
    ).toBe('Chapters #999 → End');
  });
});
