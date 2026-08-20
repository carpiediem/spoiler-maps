import { describe, expect, it } from 'vitest';
import { buildTileAttribution } from './attribution';

describe('buildTileAttribution', () => {
  it('combines an author and attribution URL into an HTML link', () => {
    expect(buildTileAttribution('Jane Cartographer', 'https://example.com')).toBe(
      '<a href="https://example.com">Jane Cartographer</a>',
    );
  });

  it('trims surrounding whitespace from both fields', () => {
    expect(buildTileAttribution('  Jane Cartographer  ', '  https://example.com  ')).toBe(
      '<a href="https://example.com">Jane Cartographer</a>',
    );
  });

  it('escapes HTML-significant characters in both fields', () => {
    expect(buildTileAttribution('Bob & "The Mapmaker"', 'https://example.com/?a=1&b=<2>')).toBe(
      '<a href="https://example.com/?a=1&amp;b=&lt;2&gt;">Bob &amp; &quot;The Mapmaker&quot;</a>',
    );
  });

  it('returns null when the author is missing', () => {
    expect(buildTileAttribution(null, 'https://example.com')).toBeNull();
    expect(buildTileAttribution('  ', 'https://example.com')).toBeNull();
  });

  it('returns null when the attribution URL is missing', () => {
    expect(buildTileAttribution('Jane Cartographer', null)).toBeNull();
    expect(buildTileAttribution('Jane Cartographer', '  ')).toBeNull();
  });

  it('returns null when both are missing', () => {
    expect(buildTileAttribution(null, null)).toBeNull();
  });
});
