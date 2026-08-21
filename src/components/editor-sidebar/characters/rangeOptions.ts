import { useEffect, useState } from 'react';
import {
  listBooksForStory,
  listChaptersForBook,
  listEpisodesForSeason,
  listTvSeasonsForStory,
  type Book,
  type Chapter,
  type ChapterRange,
  type Episode,
  type EpisodeRange,
  type TvSeason,
} from '../../../db';

export interface FlatOption {
  id: number;
  /** The overall 1-based index shown in a terse range summary, e.g. the "3" in "3. AGOT: Bran". */
  index: number;
  label: string;
}

/** "A Game of Thrones" -> "AGOT" — keeps chapter option labels compact. */
export function toAcronym(title: string): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase())
    .join('');
}

/**
 * Flattens each book's chapters, in order, each prefixed with its own
 * book's acronym plus an overall 1-based index that keeps growing across
 * every book — so "12." always means the same chapter regardless of
 * which book's dropdown group it's shown under.
 */
export function flattenChapterOptions(
  books: Book[],
  chaptersByBookId: Record<number, Chapter[]>,
): FlatOption[] {
  let overallIndex = 0;
  // chaptersByBookId is populated for every book id in `books` in the same
  // state update, so this is never actually undefined.
  return books.flatMap((book) => {
    const bookLabel = book.name ? toAcronym(book.name) : 'Untitled Book';
    return chaptersByBookId[book.id]!.map((chapter) => {
      overallIndex += 1;
      return {
        id: chapter.id,
        index: overallIndex,
        label: `${overallIndex}. ${bookLabel}: ${chapter.name || 'Untitled Chapter'}`,
      };
    });
  });
}

/** The episode equivalent of flattenChapterOptions, grouped by "Season N" instead of book name. */
export function flattenEpisodeOptions(
  seasons: TvSeason[],
  episodesBySeasonId: Record<number, Episode[]>,
): FlatOption[] {
  let overallIndex = 0;
  // episodesBySeasonId is populated for every season id in `seasons` in the
  // same state update, so this is never actually undefined.
  return seasons.flatMap((season, seasonIndex) =>
    episodesBySeasonId[season.id]!.map((episode) => {
      overallIndex += 1;
      return {
        id: episode.id,
        index: overallIndex,
        label: `${overallIndex}. Season ${seasonIndex + 1}: ${episode.name || 'Untitled Episode'}`,
      };
    }),
  );
}

/** A terse rendering of one chapter/episode range, plus the full text for a tooltip. */
export interface RangeSummaryPart {
  /** e.g. "3", "1 → 12", "→ 12", "1 →". */
  shortLabel: string;
  /** e.g. "3. AGOT: Bran", "1. AGOT: Prologue → 12. ACOK: Prologue", "beginning → 12. ACOK: Prologue". */
  fullLabel: string;
}

function boundaryLabels(
  id: number,
  optionsById: Map<number, FlatOption>,
): { short: string; full: string } {
  const option = optionsById.get(id);
  return option
    ? { short: String(option.index), full: option.label }
    : { short: `#${id}`, full: `#${id}` };
}

/**
 * Summarizes one boundary pair (a chapter range or an episode range) for
 * terse display, e.g. icon + "1 → 12" with the full chapter/episode titles
 * held back for a tooltip. Collapses to a single value when both
 * boundaries name the same chapter/episode, and to null — hiding this
 * range entirely — when both are open (start and end both unset).
 */
function summarizeBoundaryRange(
  startId: number | null,
  endId: number | null,
  options: FlatOption[],
): RangeSummaryPart | null {
  if (startId === null && endId === null) return null;

  const optionsById = new Map(options.map((option) => [option.id, option]));

  if (startId !== null && startId === endId) {
    const { short, full } = boundaryLabels(startId, optionsById);
    return { shortLabel: short, fullLabel: full };
  }

  const start = startId === null ? null : boundaryLabels(startId, optionsById);
  const end = endId === null ? null : boundaryLabels(endId, optionsById);
  // "beginning"/"end" are left out of the short label — the arrow already
  // implies an open side, and the full word is still there in the tooltip.
  return {
    shortLabel: `${start?.short ?? ''} → ${end?.short ?? ''}`.trim(),
    fullLabel: `${start?.full ?? 'beginning'} → ${end?.full ?? 'end'}`,
  };
}

/** A position's chapter and/or episode range, each summarized for terse display. */
export interface PositionRangeSummary {
  chapters: RangeSummaryPart | null;
  episodes: RangeSummaryPart | null;
}

/**
 * Summarizes a position's chapter/episode range for display: terse index
 * text (e.g. "1 → 12") per medium, with the full chapter/episode titles
 * available separately for a tooltip. Either medium is null when its range
 * is unset or fully open (no restriction to show).
 */
export function summarizePositionRange(
  chapterRange: ChapterRange | null,
  episodeRange: EpisodeRange | null,
  chapterOptions: FlatOption[],
  episodeOptions: FlatOption[],
): PositionRangeSummary {
  return {
    chapters: chapterRange
      ? summarizeBoundaryRange(
          chapterRange.startChapterId,
          chapterRange.endChapterId,
          chapterOptions,
        )
      : null,
    episodes: episodeRange
      ? summarizeBoundaryRange(
          episodeRange.startEpisodeId,
          episodeRange.endEpisodeId,
          episodeOptions,
        )
      : null,
  };
}

interface RangeOptions {
  chapterOptions: FlatOption[];
  episodeOptions: FlatOption[];
  hasBooks: boolean;
  hasSeasons: boolean;
}

/**
 * Loads every chapter/episode in a story, flattened into option lists for
 * the Chapter Range / Episode Range selects — shared between the Position
 * form (to pick a range) and each character's position list (to label an
 * already-picked range).
 */
export function useRangeOptions(storyId: number): RangeOptions {
  const [books, setBooks] = useState<Book[] | null>(null);
  const [chaptersByBookId, setChaptersByBookId] = useState<Record<number, Chapter[]>>({});
  const [seasons, setSeasons] = useState<TvSeason[] | null>(null);
  const [episodesBySeasonId, setEpisodesBySeasonId] = useState<Record<number, Episode[]>>({});

  useEffect(() => {
    let cancelled = false;

    listBooksForStory(storyId).then(async (loadedBooks) => {
      if (cancelled) return;
      const chapterLists = await Promise.all(
        loadedBooks.map((book) => listChaptersForBook(book.id)),
      );
      /* v8 ignore next -- exercising this specific unmount window (after listBooksForStory resolves but before the chapter Promise.all does) is too timing-dependent to test reliably; the outer cancelled check above covers the same defensive purpose. */
      if (cancelled) return;
      setBooks(loadedBooks);
      const chapterMap: Record<number, Chapter[]> = {};
      loadedBooks.forEach((book, i) => {
        chapterMap[book.id] = chapterLists[i];
      });
      setChaptersByBookId(chapterMap);
    });

    return () => {
      cancelled = true;
    };
  }, [storyId]);

  useEffect(() => {
    let cancelled = false;

    listTvSeasonsForStory(storyId).then(async (loadedSeasons) => {
      if (cancelled) return;
      const episodeLists = await Promise.all(
        loadedSeasons.map((season) => listEpisodesForSeason(season.id)),
      );
      /* v8 ignore next -- exercising this specific unmount window (after listTvSeasonsForStory resolves but before the episode Promise.all does) is too timing-dependent to test reliably; the outer cancelled check above covers the same defensive purpose. */
      if (cancelled) return;
      setSeasons(loadedSeasons);
      const episodeMap: Record<number, Episode[]> = {};
      loadedSeasons.forEach((season, i) => {
        episodeMap[season.id] = episodeLists[i];
      });
      setEpisodesBySeasonId(episodeMap);
    });

    return () => {
      cancelled = true;
    };
  }, [storyId]);

  return {
    chapterOptions: books ? flattenChapterOptions(books, chaptersByBookId) : [],
    episodeOptions: seasons ? flattenEpisodeOptions(seasons, episodesBySeasonId) : [],
    hasBooks: !!books?.length,
    hasSeasons: !!seasons?.length,
  };
}
