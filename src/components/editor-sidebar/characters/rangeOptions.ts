import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  listBooksForStory,
  listChaptersForBook,
  listEpisodesForSeason,
  listTvSeasonsForStory,
  type Book,
  type Chapter,
  type Episode,
  type TvSeason,
} from '../../../db';
import {
  flattenChapterOptions,
  flattenEpisodeOptions,
  type FlatOption,
} from '../../../lib/rangeOptions';

export interface RangeOptions {
  chapterOptions: FlatOption[];
  episodeOptions: FlatOption[];
  hasBooks: boolean;
  hasSeasons: boolean;
}

function useLoadRangeOptions(storyId: number | null): RangeOptions {
  const [books, setBooks] = useState<Book[] | null>(null);
  const [chaptersByBookId, setChaptersByBookId] = useState<Record<number, Chapter[]>>({});
  const [seasons, setSeasons] = useState<TvSeason[] | null>(null);
  const [episodesBySeasonId, setEpisodesBySeasonId] = useState<Record<number, Episode[]>>({});

  useEffect(() => {
    if (storyId === null) return;

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
    if (storyId === null) return;

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

  // Memoized so consumers that use these in effect/memo dependency arrays
  // (e.g. to recompute map pins) don't see a new array on every render —
  // only when the underlying books/chapters or seasons/episodes actually
  // change.
  const chapterOptions = useMemo(
    () => (books ? flattenChapterOptions(books, chaptersByBookId) : []),
    [books, chaptersByBookId],
  );
  const episodeOptions = useMemo(
    () => (seasons ? flattenEpisodeOptions(seasons, episodesBySeasonId) : []),
    [seasons, episodesBySeasonId],
  );

  const hasBooks = !!books?.length;
  const hasSeasons = !!seasons?.length;
  // Memoized so it can be handed to a context provider without re-rendering
  // every consumer whenever the owner re-renders for an unrelated reason.
  return useMemo(
    () => ({ chapterOptions, episodeOptions, hasBooks, hasSeasons }),
    [chapterOptions, episodeOptions, hasBooks, hasSeasons],
  );
}

const RangeOptionsContext = createContext<RangeOptions | null>(null);

/**
 * Shares one story's already-loaded range options with everything below
 * it, so each `useRangeOptions` there reuses them instead of re-querying
 * every book/chapter and season/episode itself.
 */
export const RangeOptionsProvider = RangeOptionsContext.Provider;

/**
 * Loads every chapter/episode in a story, flattened into option lists for
 * the Chapter Range / Episode Range selects — shared between the Position
 * form (to pick a range) and each character's position list (to label an
 * already-picked range).
 *
 * Under a `RangeOptionsProvider` this just returns the provider's value and
 * does no loading of its own; without one it loads them itself.
 */
export function useRangeOptions(storyId: number | null): RangeOptions {
  const shared = useContext(RangeOptionsContext);
  const own = useLoadRangeOptions(shared ? null : storyId);
  return shared ?? own;
}
