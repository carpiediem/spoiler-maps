import { describe, expect, it } from 'vitest';
import type { StoryDocument } from '../storyDocument';
import { buildViewPinsAndTails } from './viewCharacterPins';

function minimalDocument(overrides: Partial<StoryDocument> = {}): StoryDocument {
  return {
    formatVersion: 1,
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

  it('with showFullPath, shows the last reached position as a pin and earlier ones as dots', () => {
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

    const { pins } = buildViewPinsAndTails(document, new Set([0]), true, 'book', 1);

    expect(pins).toEqual([
      expect.objectContaining({ positionIndex: 1, style: 'dot', label: '' }),
      expect.objectContaining({ positionIndex: 2, style: 'dot', label: '' }),
      expect.objectContaining({ positionIndex: 3, style: 'pin', label: 'JS' }),
    ]);
    expect(pins.every((pin) => pin.color === '#ff0000')).toBe(true);
  });

  it('without showFullPath, shows only the last reached position, no intermediate stops', () => {
    // Collapsed mode is meant to answer just "where is this character right
    // now" for a reader who doesn't want to see (or scroll past) every
    // earlier stop — unlike the editor, which always shows a visible
    // character's whole reached path.
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

    const { pins, tails } = buildViewPinsAndTails(document, new Set([0]), false, 'book', 1);

    expect(pins).toEqual([
      expect.objectContaining({ positionIndex: 3, style: 'pin', label: 'JS' }),
    ]);
    expect(tails).toEqual([]);
  });

  it('with showFullPath, keeps drawing positions whose range has already ended so tails reach back to the start', () => {
    const document = minimalDocument({
      characters: [
        {
          name: 'Jon Snow',
          positions: [
            { lat: 1, lng: 1, chapters: [0, 1] },
            { lat: 2, lng: 2, chapters: [2, 3] },
            { lat: 3, lng: 3, chapters: [4, null] },
          ],
        },
      ],
    });

    const { pins, tails } = buildViewPinsAndTails(document, new Set([0]), true, 'book', 6);

    expect(pins.map((pin) => pin.style)).toEqual(['dot', 'dot', 'pin']);
    expect(tails.map((tail) => tail.points)).toEqual([
      [
        { lat: 2, lng: 2 },
        { lat: 1, lng: 1 },
      ],
      [
        { lat: 3, lng: 3 },
        { lat: 2, lng: 2 },
      ],
    ]);
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

  it('draws a straight tail to the preceding position even when a position has no tail of its own', () => {
    const document = minimalDocument({
      characters: [
        {
          name: 'Jon Snow',
          positions: [
            { lat: 1, lng: 1 },
            { lat: 2, lng: 2 },
          ],
        },
      ],
    });

    const { tails } = buildViewPinsAndTails(document, new Set([0]), true, 'book', 1);

    expect(tails).toEqual([
      {
        characterId: 0,
        points: [
          { lat: 2, lng: 2 },
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

  it('connects a tail to the nearest preceding visible position, skipping a hidden one in between', () => {
    const document = minimalDocument({
      characters: [
        {
          name: 'Jon Snow',
          positions: [
            { lat: 1, lng: 1 },
            { lat: 2, lng: 2, chapters: [5, null] },
            { lat: 3, lng: 3 },
          ],
        },
      ],
    });

    const { tails } = buildViewPinsAndTails(document, new Set([0]), true, 'book', 1);

    expect(tails).toEqual([
      {
        characterId: 0,
        points: [
          { lat: 3, lng: 3 },
          { lat: 1, lng: 1 },
        ],
        color: null,
        opacity: 1,
      },
    ]);
  });

  it('in book mode, skips a position gated only by an episode range when finding the preceding position for a tail', () => {
    const document = minimalDocument({
      characters: [
        {
          name: 'Jon Snow',
          positions: [
            { lat: 1, lng: 1 },
            { lat: 2, lng: 2, episodes: [0, null] },
            { lat: 3, lng: 3 },
          ],
        },
      ],
    });

    const { tails } = buildViewPinsAndTails(document, new Set([0]), true, 'book', 1);

    expect(tails).toEqual([
      {
        characterId: 0,
        points: [
          { lat: 3, lng: 3 },
          { lat: 1, lng: 1 },
        ],
        color: null,
        opacity: 1,
      },
    ]);
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

  it('shows an active alias’s name/color instead of the character’s own, reverting once its range ends', () => {
    const document = minimalDocument({
      characters: [
        {
          name: 'Arya Stark',
          color: '#ff0000',
          positions: [{ lat: 1, lng: 1 }],
          aliases: [{ name: 'Arry', color: '#808080', chapters: [0, 0] }],
        },
      ],
    });

    const withinAliasRange = buildViewPinsAndTails(document, new Set([0]), false, 'book', 1);
    expect(withinAliasRange.pins).toEqual([
      expect.objectContaining({ label: 'AR', color: '#808080' }),
    ]);

    const afterAliasRange = buildViewPinsAndTails(document, new Set([0]), false, 'book', 2);
    expect(afterAliasRange.pins).toEqual([
      expect.objectContaining({ label: 'AS', color: '#ff0000' }),
    ]);
  });

  it('falls back to the character’s own name/color when no alias is active', () => {
    const document = minimalDocument({
      characters: [
        {
          name: 'Arya Stark',
          color: '#ff0000',
          positions: [{ lat: 1, lng: 1 }],
          aliases: [{ name: 'Arry', color: '#808080', chapters: [5, null] }],
        },
      ],
    });

    const { pins } = buildViewPinsAndTails(document, new Set([0]), false, 'book', 1);

    expect(pins).toEqual([expect.objectContaining({ label: 'AS', color: '#ff0000' })]);
  });

  it('shows no color (not the character’s own) for an active alias that leaves color unset', () => {
    const document = minimalDocument({
      characters: [
        {
          name: 'Arya Stark',
          color: '#ff0000',
          positions: [{ lat: 1, lng: 1 }],
          aliases: [{ name: 'Arry', chapters: [0, 0] }],
        },
      ],
    });

    const { pins } = buildViewPinsAndTails(document, new Set([0]), false, 'book', 1);

    expect(pins).toEqual([expect.objectContaining({ label: 'AR', color: null })]);
  });
});
