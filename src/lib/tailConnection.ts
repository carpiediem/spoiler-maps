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
