import { describe, expect, it } from 'vitest';
import { nearestSegmentIndex } from './tailEditing';

describe('nearestSegmentIndex', () => {
  it('picks the only segment when there are just two points', () => {
    const points = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 10 },
    ];
    expect(nearestSegmentIndex(points, { lat: 0.1, lng: 5 })).toBe(0);
  });

  it('picks the segment nearest a click closer to the middle point', () => {
    const points = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 10 },
      { lat: 0, lng: 20 },
    ];
    expect(nearestSegmentIndex(points, { lat: 0.1, lng: 4 })).toBe(0);
    expect(nearestSegmentIndex(points, { lat: 0.1, lng: 16 })).toBe(1);
  });

  it('clamps distance to the segment’s endpoints rather than its infinite line', () => {
    const points = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 10 },
      { lat: 10, lng: 10 },
    ];
    // Nearer the far endpoint of segment 0 than anywhere on segment 1's line.
    expect(nearestSegmentIndex(points, { lat: 1, lng: 9 })).toBe(0);
  });

  it('handles a degenerate (zero-length) segment without dividing by zero', () => {
    const points = [
      { lat: 5, lng: 5 },
      { lat: 5, lng: 5 },
      { lat: 5, lng: 15 },
    ];
    expect(nearestSegmentIndex(points, { lat: 5, lng: 14 })).toBe(1);
  });
});
