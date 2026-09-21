import { describe, expect, it } from 'vitest';
import {
  applyTailOpacityGradient,
  buildTailPoints,
  hasTailToDraw,
  tailOpacityForProgress,
} from './tailConnection';

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

describe('applyTailOpacityGradient', () => {
  it('produces nothing for an empty list', () => {
    expect(applyTailOpacityGradient([])).toEqual([]);
  });

  it('draws a single tail at full opacity', () => {
    expect(applyTailOpacityGradient([{ opacity: 0 }])).toEqual([{ opacity: 1 }]);
  });

  it('fades linearly from 20% opacity for the first (oldest) tail to full for the last (most recent)', () => {
    const tails = [{ opacity: 0 }, { opacity: 0 }, { opacity: 0 }];

    const result = applyTailOpacityGradient(tails);

    expect(result[0]!.opacity).toBe(0.2);
    expect(result[1]!.opacity).toBeCloseTo(0.6);
    expect(result[2]!.opacity).toBe(1);
  });

  it('preserves the other fields on each tail', () => {
    const tails = [
      { characterId: 1, points: [], color: '#ff0000', opacity: 0 },
      { characterId: 1, points: [], color: '#ff0000', opacity: 0 },
    ];

    const result = applyTailOpacityGradient(tails);

    expect(result[0]).toMatchObject({ characterId: 1, color: '#ff0000', opacity: 0.2 });
    expect(result[1]).toMatchObject({ characterId: 1, color: '#ff0000', opacity: 1 });
  });
});

describe('tailOpacityForProgress', () => {
  it('is fully opaque for a position that began at the current scrub position', () => {
    expect(tailOpacityForProgress(9, 10)).toBe(1);
  });

  it('fades to the minimum for a position from the very start of a long story', () => {
    expect(tailOpacityForProgress(null, 1000)).toBeCloseTo(0.5, 2);
  });

  it('fades older positions more than newer ones', () => {
    expect(tailOpacityForProgress(2, 10)).toBeLessThan(tailOpacityForProgress(7, 10));
  });
});
