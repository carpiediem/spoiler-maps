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
