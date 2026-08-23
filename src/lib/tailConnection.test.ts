import { describe, expect, it } from 'vitest';
import { buildFadedTailSegments, buildTailPoints, hasTailToDraw } from './tailConnection';

describe('buildTailPoints', () => {
  it('starts with the position itself, then its own tail waypoints', () => {
    const position = {
      position: { lat: 1, lng: 1 },
      tail: [
        { lat: 2, lng: 2 },
        { lat: 3, lng: 3 },
      ],
    };

    expect(buildTailPoints(position, undefined)).toEqual([
      { lat: 1, lng: 1 },
      { lat: 2, lng: 2 },
      { lat: 3, lng: 3 },
    ]);
  });

  it('appends the preceding position’s own lat/lng, when there is one', () => {
    const position = { position: { lat: 1, lng: 1 }, tail: [{ lat: 2, lng: 2 }] };
    const preceding = { position: { lat: 9, lng: 9 } };

    expect(buildTailPoints(position, preceding)).toEqual([
      { lat: 1, lng: 1 },
      { lat: 2, lng: 2 },
      { lat: 9, lng: 9 },
    ]);
  });

  it('treats a missing or null tail as empty', () => {
    expect(buildTailPoints({ position: { lat: 1, lng: 1 }, tail: null }, undefined)).toEqual([
      { lat: 1, lng: 1 },
    ]);
    expect(buildTailPoints({ position: { lat: 1, lng: 1 } }, undefined)).toEqual([
      { lat: 1, lng: 1 },
    ]);
  });

  it('draws a straight line to a preceding position even with no tail of its own', () => {
    const position = { position: { lat: 1, lng: 1 }, tail: null };
    const preceding = { position: { lat: 9, lng: 9 } };

    expect(buildTailPoints(position, preceding)).toEqual([
      { lat: 1, lng: 1 },
      { lat: 9, lng: 9 },
    ]);
  });
});

describe('hasTailToDraw', () => {
  it('is false with no tail and no preceding position', () => {
    expect(hasTailToDraw({ tail: null }, undefined)).toBe(false);
    expect(hasTailToDraw({ tail: [] }, undefined)).toBe(false);
    expect(hasTailToDraw({}, undefined)).toBe(false);
  });

  it('is true when the position has its own tail waypoints', () => {
    expect(hasTailToDraw({ tail: [{ lat: 1, lng: 1 }] }, undefined)).toBe(true);
  });

  it('is true when there is a preceding position, even with no tail of its own', () => {
    expect(hasTailToDraw({ tail: null }, { position: { lat: 1, lng: 1 } })).toBe(true);
  });
});

describe('buildFadedTailSegments', () => {
  it('produces nothing for zero or one point', () => {
    expect(buildFadedTailSegments([], 1)).toEqual([]);
    expect(buildFadedTailSegments([{ lat: 1, lng: 1 }], 1)).toEqual([]);
  });

  it('produces one full-opacity segment for two points', () => {
    const points = [
      { lat: 1, lng: 1 },
      { lat: 2, lng: 2 },
    ];

    expect(buildFadedTailSegments(points, 0.8)).toEqual([
      { positions: [points[0], points[1]], opacity: 0.8 },
    ]);
  });

  it('fades each successive segment, from full opacity down to 30% of it at the far end', () => {
    const points = [
      { lat: 1, lng: 1 },
      { lat: 2, lng: 2 },
      { lat: 3, lng: 3 },
      { lat: 4, lng: 4 },
    ];

    const segments = buildFadedTailSegments(points, 1);

    expect(segments).toHaveLength(3);
    expect(segments[0]!.opacity).toBe(1);
    expect(segments[2]!.opacity).toBeCloseTo(0.3);
    expect(segments[1]!.opacity).toBeGreaterThan(segments[2]!.opacity);
    expect(segments[1]!.opacity).toBeLessThan(segments[0]!.opacity);
  });

  it('scales the fade by the tail’s own base opacity', () => {
    const points = [
      { lat: 1, lng: 1 },
      { lat: 2, lng: 2 },
      { lat: 3, lng: 3 },
    ];

    const segments = buildFadedTailSegments(points, 0.5);

    expect(segments[0]!.opacity).toBe(0.5);
    expect(segments[1]!.opacity).toBeCloseTo(0.15);
  });
});
