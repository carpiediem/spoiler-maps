import type { FlatOption } from '../components/editor-sidebar/characters/rangeOptions';
import { toAcronym } from '../components/editor-sidebar/characters/rangeOptions';
import type { TimelineMode } from '../components/MapTimelineControl';
import type {
  StoryDocument,
  StoryDocumentPosition,
  StoryDocumentRangeTuple,
} from './storyDocument';

/** Zero-pads to (at least) 2 digits, e.g. for "S01E01"-style codes. */
function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * The view-screen equivalent of rangeOptions.ts's flattenChapterOptions —
 * except a StoryDocument's chapters are already flat 0-based indices (see
 * StoryDocumentRangeTuple), so this is a synchronous derivation with no id
 * lookups needed at all. `id` is set to the same 0-based index; nothing in
 * the view screen looks it up by anything else.
 */
export function buildDocumentChapterOptions(document: StoryDocument): FlatOption[] {
  let index = 0;
  return document.books.flatMap((book) => {
    const bookLabel = book.name ? toAcronym(book.name) : 'Untitled Book';
    return book.chapters.map((chapter) => {
      const option: FlatOption = {
        id: index,
        index,
        label: `${index + 1}. ${bookLabel}: ${chapter.name || 'Untitled Chapter'}`,
        url: chapter.url ?? null,
      };
      index += 1;
      return option;
    });
  });
}

/** The episode equivalent of buildDocumentChapterOptions. */
export function buildDocumentEpisodeOptions(document: StoryDocument): FlatOption[] {
  let index = 0;
  return document.television.flatMap((season, seasonIndex) => {
    const code = `S${pad2(seasonIndex + 1)}`;
    return season.episodes.map((episode, episodeIndex) => {
      const option: FlatOption = {
        id: index,
        index,
        label: `${index + 1}. ${code}E${pad2(episodeIndex + 1)}: ${episode.name || 'Untitled Episode'}`,
        url: episode.url ?? null,
      };
      index += 1;
      return option;
    });
  });
}

/**
 * Whether `range`'s start boundary has been reached by `currentIndex` — an
 * unset start means always visible. `range`'s own boundary is the
 * document's flat *0-based* index, while `currentIndex` is the flat
 * *1-based* index MapTimelineControl reports (matching the rest of the
 * app's convention) — so a 0-based start of `2` (the third chapter) is
 * reached once `currentIndex` is `3` or more, hence the strict `<` below.
 */
function isRangeReached(range: StoryDocumentRangeTuple | undefined, currentIndex: number): boolean {
  const start = range?.[0];
  return start === null || start === undefined || start < currentIndex;
}

/**
 * The view-screen equivalent of makeTimelineVisibilityChecker: true once a
 * position's start chapter/episode (for the active medium) has been reached
 * by the timeline's current (1-based) scrub position, or when it has no
 * lower bound for that medium.
 */
export function isPositionVisible(
  position: StoryDocumentPosition,
  mode: TimelineMode,
  currentIndex: number,
): boolean {
  return isRangeReached(mode === 'book' ? position.chapters : position.episodes, currentIndex);
}
