import { describe, expect, it } from 'vitest';
import { summarizePositionRange, toAcronym, type FlatOption } from './rangeOptions';

const chapterOptions: FlatOption[] = [
  { id: 1, index: 1, label: '1. AGOT: Prologue' },
  { id: 2, index: 2, label: '2. AGOT: Bran' },
];
const episodeOptions: FlatOption[] = [
  { id: 10, index: 1, label: '1. Season 1: Winter Is Coming' },
  { id: 11, index: 2, label: '2. Season 1: The Kingsroad' },
];

describe('toAcronym', () => {
  it('takes the first letter of each word, uppercased', () => {
    expect(toAcronym('A Game of Thrones')).toBe('AGOT');
  });

  it('collapses repeated whitespace', () => {
    expect(toAcronym('A  Clash   of Kings')).toBe('ACOK');
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
      fullLabel: '1. Season 1: Winter Is Coming → 2. Season 1: The Kingsroad',
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
      fullLabel: 'beginning → 2. Season 1: The Kingsroad',
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
