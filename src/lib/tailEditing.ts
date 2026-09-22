import type { LatLng } from '../db';

/**
 * Which segment of a polyline a click landed nearest to, for inserting a
 * new waypoint there: `points` is the full line (e.g. the position itself
 * followed by its tail's waypoints), and the result is the 0-based index of
 * the segment's first point — i.e. the new point belongs right after
 * `points[index]`. Distance is treated as plain Cartesian (matching how
 * this app already treats lat/lng elsewhere, e.g. tailConnection's
 * straight-line tails), not geodesic, which is more than accurate enough
 * for picking a segment on a small custom map.
 *
 * `points` must have at least two entries.
 */
export function nearestSegmentIndex(points: LatLng[], click: LatLng): number {
  let bestIndex = 0;
  let bestDistance = Infinity;

  for (let i = 0; i < points.length - 1; i++) {
    const distance = distanceToSegment(click, points[i]!, points[i + 1]!);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }

  return bestIndex;
}

/** Squared distance from `point` to the segment `a`–`b` (clamped to the segment, not the infinite line). */
function distanceToSegment(point: LatLng, a: LatLng, b: LatLng): number {
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  const lengthSquared = dx * dx + dy * dy;

  const t =
    lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(1, ((point.lng - a.lng) * dx + (point.lat - a.lat) * dy) / lengthSquared),
        );

  const nearestLng = a.lng + t * dx;
  const nearestLat = a.lat + t * dy;
  return (point.lng - nearestLng) ** 2 + (point.lat - nearestLat) ** 2;
}
