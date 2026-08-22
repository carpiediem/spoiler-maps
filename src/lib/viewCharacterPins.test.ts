import { describe, expect, it } from 'vitest';
import type { StoryDocument } from './storyDocument';
import { buildViewPinsAndTails } from './viewCharacterPins';

function minimalDocument(overrides: Partial<StoryDocument> = {}): StoryDocument {
  return {
    name: 'Test',
    initialCenter: { lat: 0, lng: 0 },
    initialZoom: 4,
    minZoom: 0,
    maxZoom: 19,
    books: [],
    television: [],
    characters: [],
    markerSets: [],
    ...overrides,
  };
}

describe('buildViewPinsAndTails', () => {
  it('produces nothing for an unchecked character', () => {
    const document = minimalDocument({
      characters: [{ name: 'Jon Snow', positions: [{ lat: 1, lng: 1 }] }],
    });

    const { pins, tails } = buildViewPinsAndTails(document, new Set(), false, 'book', 1);

    expect(pins).toEqual([]);
    expect(tails).toEqual([]);
  });

  it('shows the last reached position as a pin and earlier ones as dots', () => {
    const document = minimalDocument({
      characters: [
        {
          name: 'Jon Snow',
          color: '#ff0000',
          positions: [
            { lat: 1, lng: 1 },
            { lat: 2, lng: 2 },
            { lat: 3, lng: 3 },
          ],
        },
      ],
    });

    const { pins } = buildViewPinsAndTails(document, new Set([0]), false, 'book', 1);

    expect(pins).toEqual([
      expect.objectContaining({ positionIndex: 1, style: 'dot', label: '' }),
      expect.objectContaining({ positionIndex: 2, style: 'dot', label: '' }),
      expect.objectContaining({ positionIndex: 3, style: 'pin', label: 'JS' }),
    ]);
    expect(pins.every((pin) => pin.color === '#ff0000')).toBe(true);
  });

  it('hides positions the timeline scrub has not reached yet', () => {
    const document = minimalDocument({
      characters: [
        {
          name: 'Jon Snow',
          positions: [
            { lat: 1, lng: 1 },
            { lat: 2, lng: 2, chapters: [5, null] },
          ],
        },
      ],
    });

    const { pins } = buildViewPinsAndTails(document, new Set([0]), false, 'book', 1);

    expect(pins).toHaveLength(1);
    expect(pins[0]).toEqual(expect.objectContaining({ positionIndex: 1 }));
  });

  it('omits tails when showFullPath is false, includes them when true', () => {
    const document = minimalDocument({
      characters: [
        {
          name: 'Jon Snow',
          positions: [
            { lat: 1, lng: 1 },
            { lat: 2, lng: 2, tail: [{ lat: 1.5, lng: 1.5 }] },
          ],
        },
      ],
    });

    const withoutTails = buildViewPinsAndTails(document, new Set([0]), false, 'book', 1);
    expect(withoutTails.tails).toEqual([]);

    const withTails = buildViewPinsAndTails(document, new Set([0]), true, 'book', 1);
    expect(withTails.tails).toEqual([
      {
        characterId: 0,
        points: [
          { lat: 2, lng: 2 },
          { lat: 1.5, lng: 1.5 },
          { lat: 1, lng: 1 },
        ],
        color: null,
        opacity: 1,
      },
    ]);
  });

  it('produces nothing for a checked character whose positions have not been reached yet', () => {
    const document = minimalDocument({
      characters: [
        {
          name: 'Jon Snow',
          positions: [{ lat: 1, lng: 1, chapters: [5, null] }],
        },
      ],
    });

    const { pins, tails } = buildViewPinsAndTails(document, new Set([0]), false, 'book', 1);

    expect(pins).toEqual([]);
    expect(tails).toEqual([]);
  });

  it('only includes checked characters, keyed by their array index', () => {
    const document = minimalDocument({
      characters: [
        { name: 'Jon Snow', positions: [{ lat: 1, lng: 1 }] },
        { name: 'Daenerys Targaryen', positions: [{ lat: 2, lng: 2 }] },
      ],
    });

    const { pins } = buildViewPinsAndTails(document, new Set([1]), false, 'book', 1);

    expect(pins).toHaveLength(1);
    expect(pins[0]!.characterId).toBe(1);
    expect(pins[0]!.label).toBe('DT');
  });
});
