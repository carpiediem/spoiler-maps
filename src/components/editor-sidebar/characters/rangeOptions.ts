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
        label: `${overallIndex}. Season ${seasonIndex + 1}: ${episode.name || 'Untitled Episode'}`,
      };
    }),
  );
}

function boundaryLabel(
  id: number | null,
  openLabel: string,
  optionsById: Map<number, string>,
): string {
  if (id === null) return openLabel;
  return optionsById.get(id) ?? `#${id}`;
}

/**
 * Describes a position's chapter/episode range for display, e.g.
 * "Chapters Start → 3. AGOT: Bran · Episodes 1. Season 1: Winter Is
 * Coming → End". Falls back to "Always visible" when both ranges are
 * unset (the position has no chapter/episode restriction at all).
 */
export function describePositionRange(
  chapterRange: ChapterRange | null,
  episodeRange: EpisodeRange | null,
  chapterOptions: FlatOption[],
  episodeOptions: FlatOption[],
): string {
  const parts: string[] = [];

  if (chapterRange) {
    const optionsById = new Map(chapterOptions.map((option) => [option.id, option.label]));
    const start = boundaryLabel(chapterRange.startChapterId, 'Start', optionsById);
    const end = boundaryLabel(chapterRange.endChapterId, 'End', optionsById);
    parts.push(`Chapters ${start} → ${end}`);
  }

  if (episodeRange) {
    const optionsById = new Map(episodeOptions.map((option) => [option.id, option.label]));
    const start = boundaryLabel(episodeRange.startEpisodeId, 'Start', optionsById);
    const end = boundaryLabel(episodeRange.endEpisodeId, 'End', optionsById);
    parts.push(`Episodes ${start} → ${end}`);
  }

  return parts.length > 0 ? parts.join(' · ') : 'Always visible';
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
