import { describe, expect, it } from 'vitest';
import {
  detectTileUrlTemplateKind,
  isValidTileUrlTemplate,
  resolveTileUrlTemplate,
} from './tileUrl';

describe('isValidTileUrlTemplate', () => {
  it('accepts a well-formed tile URL template', () => {
    expect(isValidTileUrlTemplate('https://tile.example.com/{z}/{x}/{y}.png')).toBe(true);
  });

  it('accepts a well-formed quadkey tile URL template', () => {
    expect(isValidTileUrlTemplate('https://tile.example.com/fsm/{q}.jpg')).toBe(true);
  });

  it('accepts http URLs', () => {
    expect(isValidTileUrlTemplate('http://tile.example.com/{z}/{x}/{y}.png')).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(isValidTileUrlTemplate('')).toBe(false);
  });

  it('rejects a URL missing placeholders', () => {
    expect(isValidTileUrlTemplate('https://tile.example.com/tiles.png')).toBe(false);
  });

  it('rejects a URL missing the {y} placeholder', () => {
    expect(isValidTileUrlTemplate('https://tile.example.com/{z}/{x}.png')).toBe(false);
  });

  it('rejects a malformed URL even with placeholders present', () => {
    expect(isValidTileUrlTemplate('https:// not a url {x} {y} {z}')).toBe(false);
  });

  it('rejects a URL without a protocol', () => {
    expect(isValidTileUrlTemplate('tile.example.com/{z}/{x}/{y}.png')).toBe(false);
  });
});

describe('detectTileUrlTemplateKind', () => {
  it('detects an xyz template', () => {
    expect(detectTileUrlTemplateKind('https://tile.example.com/{z}/{x}/{y}.png')).toBe('xyz');
  });

  it('detects a quadkey template', () => {
    expect(detectTileUrlTemplateKind('https://tile.example.com/fsm/{q}.jpg')).toBe('quadkey');
  });

  it('prefers quadkey when both placeholder styles are present', () => {
    expect(detectTileUrlTemplateKind('https://tile.example.com/{q}/{x}/{y}/{z}.jpg')).toBe(
      'quadkey',
    );
  });

  it('returns null when no recognized placeholders are present', () => {
    expect(detectTileUrlTemplateKind('https://tile.example.com/tiles.png')).toBeNull();
  });
});

describe('resolveTileUrlTemplate', () => {
  it('resolves an explicit xyz template as-is', () => {
    expect(resolveTileUrlTemplate('https://tile.example.com/{z}/{x}/{y}.png')).toEqual({
      kind: 'xyz',
      template: 'https://tile.example.com/{z}/{x}/{y}.png',
    });
  });

  it('resolves an explicit quadkey template as-is', () => {
    expect(resolveTileUrlTemplate('https://tile.example.com/fsm/{q}.jpg')).toEqual({
      kind: 'quadkey',
      template: 'https://tile.example.com/fsm/{q}.jpg',
    });
  });

  it('extrapolates a quadkey template from a real example tile URL', () => {
    expect(
      resolveTileUrlTemplate('https://carpiediem.github.io/game-of-thrones-map/fsm/tqtqr.jpg'),
    ).toEqual({
      kind: 'quadkey',
      template: 'https://carpiediem.github.io/game-of-thrones-map/fsm/{q}.jpg',
    });
  });

  it('returns null for a plain URL with no template and no extrapolatable quadkey', () => {
    expect(resolveTileUrlTemplate('https://tile.example.com/tiles.png')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(resolveTileUrlTemplate('')).toBeNull();
  });
});
