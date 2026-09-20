import { describe, expect, it } from 'vitest';
import type { StoryDocument } from '../storyDocument';
import { buildViewMarkerPins } from './viewMarkerPins';

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

describe('buildViewMarkerPins', () => {
  it('produces a pin for every marker with no range set', () => {
    const document = minimalDocument({
      markerSets: [
        {
          name: 'Cities',
          markers: [
            { label: 'Winterfell', lat: 1, lng: 1 },
            { label: "King's Landing", lat: 2, lng: 2 },
          ],
        },
      ],
    });

    const pins = buildViewMarkerPins(document, 'book', 1, new Set());

    expect(pins).toHaveLength(2);
    expect(pins[0]!.marker.label).toBe('Winterfell');
    expect(pins[0]!.marker.position).toEqual({ lat: 1, lng: 1 });
    expect(pins[0]!.noIcons).toBe(false);
  });

  it('carries the marker set’s noIcons flag onto each of its pins', () => {
    const document = minimalDocument({
      markerSets: [
        { name: 'Cities', noIcons: true, markers: [{ label: 'Winterfell', lat: 1, lng: 1 }] },
      ],
    });

    const pins = buildViewMarkerPins(document, 'book', 1, new Set());

    expect(pins[0]!.noIcons).toBe(true);
  });

  it('hides a marker whose chapter range has not been reached yet', () => {
    const document = minimalDocument({
      markerSets: [
        {
          name: 'Cities',
          markers: [{ label: 'Winterfell', lat: 1, lng: 1, chapters: [2, null] }],
        },
      ],
    });

    expect(buildViewMarkerPins(document, 'book', 2, new Set())).toEqual([]);
    expect(buildViewMarkerPins(document, 'book', 3, new Set())).toHaveLength(1);
  });

  it('carries a marker’s icon, url, and color through to the synthesized Marker', () => {
    const document = minimalDocument({
      markerSets: [
        {
          name: 'Cities',
          markers: [
            {
              label: 'Winterfell',
              lat: 1,
              lng: 1,
              icon: 'https://example.com/icon.png',
              url: 'https://wiki.example.com/winterfell',
              color: '#00ff00',
            },
          ],
        },
      ],
    });

    const [pin] = buildViewMarkerPins(document, 'book', 1, new Set());

    expect(pin!.marker.icon).toBe('https://example.com/icon.png');
    expect(pin!.marker.url).toBe('https://wiki.example.com/winterfell');
    expect(pin!.marker.color).toBe('#00ff00');
  });

  it('omits every marker in a hidden marker set, leaving other sets untouched', () => {
    const document = minimalDocument({
      markerSets: [
        { name: 'Cities', markers: [{ label: 'Winterfell', lat: 1, lng: 1 }] },
        { name: 'Battles', markers: [{ label: 'The Blackwater', lat: 2, lng: 2 }] },
      ],
    });

    const pins = buildViewMarkerPins(document, 'book', 1, new Set([0]));

    expect(pins).toHaveLength(1);
    expect(pins[0]!.marker.label).toBe('The Blackwater');
  });
});
