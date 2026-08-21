import { describe, expect, it } from 'vitest';
import { buildPinIcon, buildSkullIcon } from './pinIcon';

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
