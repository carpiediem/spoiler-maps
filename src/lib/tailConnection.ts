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
