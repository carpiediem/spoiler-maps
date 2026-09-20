import type { ChapterRange, EpisodeRange } from '../db';
import type { TimelineMode } from './timelineMode';
import type { FlatOption } from './rangeOptions';

/** The chapter/episode-range shape shared by a CharacterPosition and a CharacterAlias. */
interface RangedEntity {
  chapterRange: ChapterRange | null;
  episodeRange: EpisodeRange | null;
}

/**
 * Builds a checker for whether a ranged entity (a CharacterPosition or a
 * CharacterAlias) is active at the map timeline's current scrub position:
 * true when its start chapter/episode (for the active medium) is at or
 * before the timeline's index (or it has no lower bound), *and* its end
 * chapter/episode is at or after it (or it has no upper bound). An entity
 * restricted only by the *other* medium (e.g. an episode range but no
 * chapter range at all) never shows while scrubbing the active one — only
 * one with no range for either medium is unconditionally visible in both.
 */
export function makeTimelineVisibilityChecker(
  timelineMode: TimelineMode,
  timelineIndex: number,
  chapterOptions: FlatOption[],
  episodeOptions: FlatOption[],
): (entity: RangedEntity) => boolean {
  const activeOptionIndexById = new Map(
    (timelineMode === 'book' ? chapterOptions : episodeOptions).map((option) => [
      option.id,
      option.index,
    ]),
  );

  return function isEntityActive(entity: RangedEntity): boolean {
    if (timelineMode === 'book') {
      if (entity.chapterRange === null) return entity.episodeRange === null;
      return isWithinRange(
        entity.chapterRange.startChapterId,
        entity.chapterRange.endChapterId,
        activeOptionIndexById,
        timelineIndex,
      );
    }
    if (entity.episodeRange === null) return entity.chapterRange === null;
    return isWithinRange(
      entity.episodeRange.startEpisodeId,
      entity.episodeRange.endEpisodeId,
      activeOptionIndexById,
      timelineIndex,
    );
  };
}

function isWithinRange(
  startId: number | null,
  endId: number | null,
  activeOptionIndexById: Map<number, number>,
  timelineIndex: number,
): boolean {
  if (!isStartReached(startId, activeOptionIndexById, timelineIndex)) return false;
  return !isEndPassed(endId, activeOptionIndexById, timelineIndex);
}

function isStartReached(
  startId: number | null,
  activeOptionIndexById: Map<number, number>,
  timelineIndex: number,
): boolean {
  if (startId === null) return true;
  const startIndex = activeOptionIndexById.get(startId);
  if (startIndex === undefined) return true;
  return startIndex <= timelineIndex;
}

/** Symmetric with isStartReached: an unresolvable id defaults to "not passed yet", same as an unresolvable start defaults to "already reached" — both err toward staying visible rather than disappearing on bad data. */
function isEndPassed(
  endId: number | null,
  activeOptionIndexById: Map<number, number>,
  timelineIndex: number,
): boolean {
  if (endId === null) return false;
  const endIndex = activeOptionIndexById.get(endId);
  if (endIndex === undefined) return false;
  return timelineIndex > endIndex;
}
