import type { LatLng } from '../db';
import { toKeyholeQuadkey } from './quadkey';
import type { ResolvedTileUrlTemplate } from './tileUrl';

/** The XYZ tile (standard Web Mercator slippy-map tiling) containing `position` at `zoom`. */
export function latLngToTile(position: LatLng, zoom: number): { x: number; y: number } {
  const latRad = (position.lat * Math.PI) / 180;
  const n = 2 ** zoom;
  const x = Math.floor(((position.lng + 180) / 360) * n);
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return {
    x: Math.min(Math.max(x, 0), n - 1),
    y: Math.min(Math.max(y, 0), n - 1),
  };
}

/** The concrete URL of the tile covering `position` at `zoom`, from a resolved template. */
export function buildProbeUrl(
  template: ResolvedTileUrlTemplate,
  position: LatLng,
  zoom: number,
): string {
  const { x, y } = latLngToTile(position, zoom);
  return template.kind === 'quadkey'
    ? template.template.replace(/\{q\}/g, toKeyholeQuadkey(x, y, zoom))
    : template.template
        .replace(/\{z\}/g, String(zoom))
        .replace(/\{x\}/g, String(x))
        .replace(/\{y\}/g, String(y));
}

export type TileProbe = (url: string, signal?: AbortSignal) => Promise<boolean>;

/** Probes a tile URL with a HEAD request, resolving to whether it exists (a 2xx response). */
export const fetchTileProbe: TileProbe = async (url, signal) => {
  const response = await fetch(url, { method: 'HEAD', signal });
  return response.ok;
};

// A generous ceiling on how far up a custom tile set could plausibly go —
// past this we stop probing and just report the cap, rather than searching
// forever for a boundary that may not exist.
const MAX_PROBED_ZOOM = 22;

/**
 * Auto-detects the highest zoom level a tile server actually has content
 * for. Probes (via `probe`) the tile covering `position` at increasing zoom
 * levels and binary-searches for the boundary between present (2xx) and
 * missing tiles, assuming that once a zoom level 404s, every higher zoom
 * level does too (tile sets are rendered up to a fixed maximum resolution).
 *
 * Returns null when detection is inconclusive — `minZoom` itself has no
 * tile there, or a probe fails (most likely a cross-origin request the
 * tile host doesn't allow `fetch` to read) — so the caller can leave
 * whatever zoom range is already set alone rather than guess.
 */
export async function detectMaxZoom(
  template: ResolvedTileUrlTemplate,
  position: LatLng,
  minZoom: number,
  probe: TileProbe = fetchTileProbe,
  signal?: AbortSignal,
): Promise<number | null> {
  async function exists(zoom: number): Promise<boolean | null> {
    try {
      return await probe(buildProbeUrl(template, position, zoom), signal);
    } catch {
      return null;
    }
  }

  const minExists = await exists(minZoom);
  if (minExists !== true) return null;

  let low = minZoom;
  let high = MAX_PROBED_ZOOM;
  const highExists = await exists(high);
  if (highExists === null) return null;
  if (highExists) return high;

  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    const midExists = await exists(mid);
    if (midExists === null) return null;
    if (midExists) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return low;
}
