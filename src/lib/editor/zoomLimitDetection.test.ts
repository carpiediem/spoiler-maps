import { describe, expect, it, vi } from 'vitest';
import { buildProbeUrl, detectMaxZoom, latLngToTile, type TileProbe } from './zoomLimitDetection';

describe('latLngToTile', () => {
  it('maps the world origin to the single tile at zoom 0', () => {
    expect(latLngToTile({ lat: 0, lng: 0 }, 0)).toEqual({ x: 0, y: 0 });
  });

  it('maps the prime meridian/equator to the center tiles at a higher zoom', () => {
    expect(latLngToTile({ lat: 0, lng: 0 }, 2)).toEqual({ x: 2, y: 2 });
  });

  it('maps the northwest corner to tile (0, 0)', () => {
    expect(latLngToTile({ lat: 85, lng: -180 }, 3)).toEqual({ x: 0, y: 0 });
  });

  it('clamps to the last tile instead of overflowing past the southeast corner', () => {
    expect(latLngToTile({ lat: -85, lng: 179.9999 }, 3)).toEqual({ x: 7, y: 7 });
  });
});

describe('buildProbeUrl', () => {
  it('substitutes x/y/z into an xyz template', () => {
    const url = buildProbeUrl(
      { kind: 'xyz', template: 'https://tile.example.com/{z}/{x}/{y}.png' },
      { lat: 0, lng: 0 },
      2,
    );
    expect(url).toBe('https://tile.example.com/2/2/2.png');
  });

  it('substitutes a keyhole quadkey into a quadkey template', () => {
    const url = buildProbeUrl(
      { kind: 'quadkey', template: 'https://tile.example.com/{q}.jpg' },
      { lat: 0, lng: 0 },
      2,
    );
    expect(url).toBe('https://tile.example.com/tsq.jpg');
  });
});

const XYZ_TEMPLATE = {
  kind: 'xyz' as const,
  template: 'https://tile.example.com/{z}/{x}/{y}.png',
};

function probeUpTo(maxZoom: number): TileProbe {
  return vi.fn((url: string) => {
    const zoom = Number(url.split('/')[3]);
    return Promise.resolve(zoom <= maxZoom);
  });
}

describe('detectMaxZoom', () => {
  it('returns null when even the minimum zoom has no tile', async () => {
    const probe = probeUpTo(-1);
    const result = await detectMaxZoom(XYZ_TEMPLATE, { lat: 0, lng: 0 }, 0, probe);
    expect(result).toBeNull();
  });

  it('returns the probe ceiling when the tile set goes at least that far', async () => {
    const probe = probeUpTo(100);
    const result = await detectMaxZoom(XYZ_TEMPLATE, { lat: 0, lng: 0 }, 0, probe);
    expect(result).toBe(22);
  });

  it('binary-searches for the boundary between present and missing tiles', async () => {
    const probe = probeUpTo(9);
    const result = await detectMaxZoom(XYZ_TEMPLATE, { lat: 0, lng: 0 }, 0, probe);
    expect(result).toBe(9);
  });

  it('respects a non-zero minZoom as the search floor', async () => {
    const probe = probeUpTo(12);
    const result = await detectMaxZoom(XYZ_TEMPLATE, { lat: 0, lng: 0 }, 5, probe);
    expect(result).toBe(12);
  });

  it('returns null when a probe throws (e.g. a CORS-blocked fetch)', async () => {
    const probe: TileProbe = vi.fn(() => Promise.reject(new Error('network error')));
    const result = await detectMaxZoom(XYZ_TEMPLATE, { lat: 0, lng: 0 }, 0, probe);
    expect(result).toBeNull();
  });

  it('returns null when the probe ceiling check throws', async () => {
    let calls = 0;
    const probe: TileProbe = vi.fn(() => {
      calls += 1;
      if (calls === 1) return Promise.resolve(true);
      return Promise.reject(new Error('network error'));
    });
    const result = await detectMaxZoom(XYZ_TEMPLATE, { lat: 0, lng: 0 }, 0, probe);
    expect(result).toBeNull();
  });

  it('returns null when a probe during the binary search throws', async () => {
    let calls = 0;
    const probe: TileProbe = vi.fn((url: string) => {
      calls += 1;
      if (calls <= 2) return Promise.resolve(Number(url.split('/')[3]) <= 9);
      return Promise.reject(new Error('network error'));
    });
    const result = await detectMaxZoom(XYZ_TEMPLATE, { lat: 0, lng: 0 }, 0, probe);
    expect(result).toBeNull();
  });

  it('uses fetch with a HEAD request by default', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true } as Response));
    vi.stubGlobal('fetch', fetchMock);
    try {
      const result = await detectMaxZoom(
        { kind: 'xyz', template: 'https://x/{z}/{x}/{y}' },
        { lat: 0, lng: 0 },
        0,
      );
      expect(result).toBe(22);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'HEAD' }),
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
