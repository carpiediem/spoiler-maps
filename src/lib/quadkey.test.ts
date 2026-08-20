import { describe, expect, it } from 'vitest';
import { extrapolateQuadkeyTemplate, toKeyholeQuadkey } from './quadkey';

describe('toKeyholeQuadkey', () => {
  it('returns just the prefix at zoom 0', () => {
    expect(toKeyholeQuadkey(0, 0, 0)).toBe('t');
  });

  it('encodes each quadrant at zoom 1', () => {
    expect(toKeyholeQuadkey(0, 0, 1)).toBe('tq'); // NW
    expect(toKeyholeQuadkey(1, 0, 1)).toBe('tr'); // NE
    expect(toKeyholeQuadkey(0, 1, 1)).toBe('tt'); // SW
    expect(toKeyholeQuadkey(1, 1, 1)).toBe('ts'); // SE
  });

  it('encodes nested quadrants at zoom 2', () => {
    expect(toKeyholeQuadkey(0, 0, 2)).toBe('tqq');
    expect(toKeyholeQuadkey(3, 3, 2)).toBe('tss');
    expect(toKeyholeQuadkey(2, 1, 2)).toBe('trt');
  });
});

describe('extrapolateQuadkeyTemplate', () => {
  it('replaces a quadkey filename with a {q} placeholder', () => {
    expect(
      extrapolateQuadkeyTemplate('https://carpiediem.github.io/game-of-thrones-map/fsm/tqtqr.jpg'),
    ).toBe('https://carpiediem.github.io/game-of-thrones-map/fsm/{q}.jpg');
  });

  it('replaces a quadkey that is its own path segment', () => {
    expect(extrapolateQuadkeyTemplate('https://tile.example.com/tqrst/tile.png')).toBe(
      'https://tile.example.com/{q}/tile.png',
    );
  });

  it('returns null when no segment looks like a quadkey', () => {
    expect(extrapolateQuadkeyTemplate('https://tile.example.com/tiles/4/8/3.png')).toBeNull();
  });

  it('returns null when more than one segment looks like a quadkey', () => {
    expect(extrapolateQuadkeyTemplate('https://tile.example.com/tqr/tsq.png')).toBeNull();
  });
});
