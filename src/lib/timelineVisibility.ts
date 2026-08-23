import type { CharacterPosition } from '../db';
import type { TimelineMode } from '../components/MapTimelineControl';
import type { FlatOption } from '../components/editor-sidebar/characters/rangeOptions';

/**
 * Builds a checker for whether a CharacterPosition should be considered
 * "reached" at the map timeline's current scrub position: true when its
 * start chapter/episode (for the active medium) is at or before the
 * timeline's index, or when it has no lower bound for that medium. A
 * position restricted only by the *other* medium (e.g. an episode range but
 * no chapter range at all) never shows while scrubbing the active one —
 * only a position with no range for either medium is unconditionally
 * visible in both.
 */
export function makeTimelineVisibilityChecker(
  timelineMode: TimelineMode,
  timelineIndex: number,
  chapterOptions: FlatOption[],
  episodeOptions: FlatOption[],
): (position: CharacterPosition) => boolean {
  const activeOptionIndexById = new Map(
    (timelineMode === 'book' ? chapterOptions : episodeOptions).map((option) => [
      option.id,
      option.index,
    ]),
  );

  return function isPositionVisible(position: CharacterPosition): boolean {
    if (timelineMode === 'book') {
      if (position.chapterRange === null) return position.episodeRange === null;
      return isReached(position.chapterRange.startChapterId, activeOptionIndexById, timelineIndex);
    }
    if (position.episodeRange === null) return position.chapterRange === null;
    return isReached(position.episodeRange.startEpisodeId, activeOptionIndexById, timelineIndex);
  };
}

function isReached(
  startId: number | null,
  activeOptionIndexById: Map<number, number>,
  timelineIndex: number,
): boolean {
  if (startId === null) return true;
  const startIndex = activeOptionIndexById.get(startId);
  if (startIndex === undefined) return true;
  return startIndex <= timelineIndex;
}
