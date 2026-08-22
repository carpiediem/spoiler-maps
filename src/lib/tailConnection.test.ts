import { describe, expect, it } from 'vitest';
import { buildTailPoints } from './tailConnection';

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
});
