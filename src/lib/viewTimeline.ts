import type { FlatOption } from '../components/editor-sidebar/characters/rangeOptions';
import { toAcronym } from '../components/editor-sidebar/characters/rangeOptions';
import type { TimelineMode } from '../components/MapTimelineControl';
import type { StoryDocument, StoryDocumentRangeTuple } from './storyDocument';

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
 * Whether `currentIndex` falls within `range`'s start/end boundaries — an
 * unset start means always-already-started, and an unset end means
 * never-ends. `range`'s own boundaries are the document's flat *0-based*
 * index, while `currentIndex` is the flat *1-based* index MapTimelineControl
 * reports (matching the rest of the app's convention) — so a 0-based start
 * of `2` (the third chapter) is reached once `currentIndex` is `3` or more
 * (hence the strict `<`), and a 0-based end of `2` stays visible through
 * `currentIndex` `3` (hence comparing against `end + 1`).
 */
function isRangeReached(range: StoryDocumentRangeTuple, currentIndex: number): boolean {
  const [start, end] = range;
  if (start !== null && currentIndex <= start) return false;
  if (end !== null && currentIndex > end + 1) return false;
  return true;
}

/** The chapter/episode-range shape shared by a StoryDocumentPosition and a StoryDocumentAlias. */
interface RangedDocumentEntity {
  chapters?: StoryDocumentRangeTuple;
  episodes?: StoryDocumentRangeTuple;
}

/**
 * The view-screen equivalent of makeTimelineVisibilityChecker: true while an
 * entity's (a position's or an alias's) start/end chapter/episode range (for
 * the active medium) contains the timeline's current (1-based) scrub
 * position, or when it has no range at all for that medium. An entity
 * restricted only by the *other* medium (e.g. an episode range but no
 * chapter range at all) never shows while scrubbing the active one — only
 * one with no range for either medium is unconditionally visible in both.
 */
export function isPositionVisible(
  entity: RangedDocumentEntity,
  mode: TimelineMode,
  currentIndex: number,
): boolean {
  const activeRange = mode === 'book' ? entity.chapters : entity.episodes;
  const otherRange = mode === 'book' ? entity.episodes : entity.chapters;

  if (activeRange === undefined) return otherRange === undefined;
  return isRangeReached(activeRange, currentIndex);
}
