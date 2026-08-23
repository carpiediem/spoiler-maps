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

/** A single two-point stretch of a tail, faded relative to how far it is from the position itself. */
export interface TailSegment {
  positions: [LatLng, LatLng];
  opacity: number;
}

// How faint the far (oldest) end of a tail gets, as a fraction of its base
// opacity — never fully invisible, just enough to read as "further back".
const MIN_FADE_FACTOR = 0.3;

/**
 * Splits a tail's points (ordered from the position itself outward into the
 * past — see buildTailPoints) into consecutive two-point segments, each
 * given a progressively lower opacity the farther it is from the position,
 * so the tail visually fades out toward its older end. Leaflet's Polyline
 * only supports one uniform opacity per path, hence the segments — the
 * fade is a stepped approximation, coarser for tails with few points.
 */
export function buildFadedTailSegments(points: LatLng[], baseOpacity: number): TailSegment[] {
  const segmentCount = points.length - 1;
  if (segmentCount <= 0) return [];

  return Array.from({ length: segmentCount }, (_, index) => {
    const t = segmentCount === 1 ? 0 : index / (segmentCount - 1);
    const fade = 1 - t * (1 - MIN_FADE_FACTOR);
    return {
      positions: [points[index]!, points[index + 1]!] as [LatLng, LatLng],
      opacity: baseOpacity * fade,
    };
  });
}
