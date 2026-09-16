import { describe, expect, it } from 'vitest';
import type { Marker } from '../db';
import { buildMarkerIcon, buildPinIcon, buildSkullIcon } from './pinIcon';

function makeMarker(overrides: Partial<Marker> = {}): Marker {
  return {
    id: 1,
    markerSetId: 1,
    label: 'Winterfell',
    icon: null,
    url: null,
    color: null,
    large: false,
    position: { lat: 1, lng: 1 },
    polygon: null,
    chapterRange: null,
    episodeRange: null,
    ...overrides,
  };
}

function decodeSvg(dataUrl: string): string {
  const [, encoded] = dataUrl.split(',', 2);
  return decodeURIComponent(encoded);
}

describe('buildPinIcon', () => {
  it('builds a pin sized for a single-character label', () => {
    const pin = buildPinIcon('1', '#1976d2');
    const svg = decodeSvg(pin.options.iconUrl as string);

    expect(svg).toContain('>1<');
    expect(svg).toContain('font-size="12"');
  });

  it('shrinks the font for a two-character label', () => {
    const pin = buildPinIcon('12', '#1976d2');
    const svg = decodeSvg(pin.options.iconUrl as string);

    expect(svg).toContain('>12<');
    expect(svg).toContain('font-size="10"');
  });

  it('accepts a color with or without a leading #', () => {
    const withHash = decodeSvg(buildPinIcon('1', '#1976d2').options.iconUrl as string);
    const withoutHash = decodeSvg(buildPinIcon('1', '1976d2').options.iconUrl as string);

    expect(withHash).toBe(withoutHash);
    expect(withHash).toContain('fill="#1976d2"');
  });

  it('uses white label text on a dark fill color', () => {
    const svg = decodeSvg(buildPinIcon('1', '#000000').options.iconUrl as string);
    expect(svg).toContain('fill="#FFFFFF">1<');
  });

  it('uses black label text on a light fill color', () => {
    const svg = decodeSvg(buildPinIcon('1', '#ffffff').options.iconUrl as string);
    expect(svg).toContain('fill="#000000">1<');
  });

  it('sizes and anchors the icon for a teardrop pin', () => {
    const pin = buildPinIcon('1', '#1976d2');
    expect(pin.options.iconSize).toEqual([24, 37]);
    expect(pin.options.iconAnchor).toEqual([12, 37]);
  });
});

describe('buildSkullIcon', () => {
  it('draws a skull from shapes, not a text glyph', () => {
    const svg = decodeSvg(buildSkullIcon().options.iconUrl as string);

    expect(svg).toContain('<circle');
    expect(svg).not.toContain('☠');
    expect(svg).not.toContain('<text');
    // No teardrop pin path.
    expect(svg).not.toContain('<path d="M12 0C5.4 0');
  });

  it('fills the skull white with black lines, regardless of character color', () => {
    const svg = decodeSvg(buildSkullIcon().options.iconUrl as string);

    expect(svg).toContain('fill="#ffffff"');
    expect(svg).toContain('stroke="#000000"');
  });

  it('is the same width as a numbered pin, sized and anchored at its own center', () => {
    const skull = buildSkullIcon();
    const pin = buildPinIcon('1', '#1976d2');

    // Both icons are 24px wide, so a skull and a pin line up on the map.
    expect(skull.options.iconSize).toEqual([24, 24]);
    expect(pin.options.iconSize).toEqual([24, 37]);
    expect(skull.options.iconAnchor).toEqual([12, 12]);
  });
});

describe('buildMarkerIcon', () => {
  it('builds a plain colored teardrop pin, with no label, when there is no custom icon', () => {
    const icon = buildMarkerIcon(makeMarker({ color: '#1976d2' }));
    const svg = decodeSvg(icon.options.iconUrl as string);

    expect(svg).toContain('fill="#1976d2"');
    expect(svg).toContain('></text>');
    expect(icon.options.iconSize).toEqual([24, 37]);
  });

  it('falls back to the default marker color when unset', () => {
    const icon = buildMarkerIcon(makeMarker());
    const svg = decodeSvg(icon.options.iconUrl as string);

    expect(svg).toContain('fill="#2e7d32"');
  });

  it('uses the marker’s own custom icon image when set', () => {
    const icon = buildMarkerIcon(makeMarker({ icon: 'https://example.com/icon.png' }));

    expect(icon.options.iconUrl).toBe('https://example.com/icon.png');
    expect(icon.options.iconSize).toEqual([28, 28]);
    expect(icon.options.iconAnchor).toEqual([14, 28]);
  });

  it('scales up a "large" marker’s teardrop pin', () => {
    const regular = buildMarkerIcon(makeMarker({ large: false }));
    const large = buildMarkerIcon(makeMarker({ large: true }));

    expect(regular.options.iconSize).toEqual([24, 37]);
    expect(large.options.iconSize).toEqual([36, 55.5]);
  });

  it('scales up a "large" marker’s custom icon image', () => {
    const icon = buildMarkerIcon(makeMarker({ icon: 'https://example.com/icon.png', large: true }));

    expect(icon.options.iconSize).toEqual([42, 42]);
    expect(icon.options.iconAnchor).toEqual([21, 42]);
  });
});
