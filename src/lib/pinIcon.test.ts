import { describe, expect, it } from 'vitest';
import { buildPinIcon } from './pinIcon';

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
