import type { LatLng } from '../db';

/**
 * Builds the polyline points for one position's tail: the position itself,
 * then its own tail waypoints, then — if there is one — the preceding
 * position's own lat/lng, so consecutive positions read as one continuous
 * route on the map instead of each tail dead-ending mid-map.
 */
export function buildTailPoints(
  position: { position: LatLng; tail?: LatLng[] | null },
  precedingPosition: { position: LatLng } | undefined,
): LatLng[] {
  return [
    position.position,
    ...(position.tail ?? []),
    ...(precedingPosition ? [precedingPosition.position] : []),
  ];
}

/**
 * Whether a tail overlay is worth drawing for this position: either it has
 * its own waypoints, or there's a preceding position to draw a straight
 * connecting line to (buildTailPoints would otherwise return a single,
 * invisible point).
 */
export function hasTailToDraw(
  position: { tail?: LatLng[] | null },
  precedingPosition: { position: LatLng } | undefined,
): boolean {
  return Boolean(position.tail && position.tail.length > 0) || precedingPosition !== undefined;
}

// The oldest tail in a character's sequence fades to this fraction of full
// opacity; the most recent tail is always drawn at full opacity.
const MIN_TAIL_OPACITY = 0.2;

// The view screen's tails fade less than the editor's: the oldest bottoms
// out here so the whole route stays legible.
const MIN_PROGRESS_TAIL_OPACITY = 0.5;

/**
 * Opacity for a tail by how far into the story its position began, rather
 * than by its place in the character's list of positions: `start` is the
 * position's 0-based first chapter/episode (null/absent = the very
 * beginning) and `currentIndex` the timeline's 1-based scrub position, so a
 * position that began at the current point is fully opaque and one from
 * the story's start fades to MIN_PROGRESS_TAIL_OPACITY. The same segment looks the
 * same no matter which medium is scrubbed or how many positions a
 * character has.
 */
export function tailOpacityForProgress(
  start: number | null | undefined,
  currentIndex: number,
): number {
  const progress = Math.min(1, Math.max(0, ((start ?? 0) + 1) / Math.max(currentIndex, 1)));
  return MIN_PROGRESS_TAIL_OPACITY + (1 - MIN_PROGRESS_TAIL_OPACITY) * progress;
}

/**
 * Assigns each tail in a character's sequence (ordered oldest to most
 * recent — i.e. the order positions were visited) a linearly increasing
 * opacity, from MIN_TAIL_OPACITY for the first (oldest) tail up to full
 * opacity for the last (most recent) one, so the whole route reads as
 * fading into the past. A single tail is always drawn at full opacity.
 */
export function applyTailOpacityGradient<T extends { opacity: number }>(tails: T[]): T[] {
  const count = tails.length;
  if (count <= 1) return tails.map((tail) => ({ ...tail, opacity: 1 }));

  return tails.map((tail, index) => ({
    ...tail,
    opacity: MIN_TAIL_OPACITY + (1 - MIN_TAIL_OPACITY) * (index / (count - 1)),
  }));
}
