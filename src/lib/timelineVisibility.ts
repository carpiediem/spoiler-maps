import type { CharacterPosition } from '../db';
import type { TimelineMode } from '../components/MapTimelineControl';
import type { FlatOption } from '../components/editor-sidebar/characters/rangeOptions';

/**
 * Builds a checker for whether a CharacterPosition should be considered
 * "reached" at the map timeline's current scrub position: true when its
 * start chapter/episode (for the active medium) is at or before the
 * timeline's index, or when it has no lower bound for that medium.
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
    const startId =
      timelineMode === 'book'
        ? position.chapterRange?.startChapterId
        : position.episodeRange?.startEpisodeId;
    if (startId === null || startId === undefined) return true;
    const startIndex = activeOptionIndexById.get(startId);
    if (startIndex === undefined) return true;
    return startIndex <= timelineIndex;
  };
}
