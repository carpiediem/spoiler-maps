import { extrapolateQuadkeyTemplate } from './quadkey';

export type TileUrlTemplateKind = 'xyz' | 'quadkey';

export interface ResolvedTileUrlTemplate {
  kind: TileUrlTemplateKind;
  template: string;
}

/**
 * Determines which placeholder scheme a tile URL template uses: the
 * conventional {x}/{y}/{z} tile grid, or a single {q} placeholder for a
 * "keyhole"-style quadtree string (see toKeyholeQuadkey).
 */
export function detectTileUrlTemplateKind(value: string): TileUrlTemplateKind | null {
  const trimmed = value.trim();

  if (trimmed.includes('{q}')) {
    return 'quadkey';
  }

  if (trimmed.includes('{x}') && trimmed.includes('{y}') && trimmed.includes('{z}')) {
    return 'xyz';
  }

  return null;
}

export function isValidTileUrlTemplate(value: string): boolean {
  return resolveTemplate(value.trim()) !== null;
}

/**
 * Resolves user input into a usable tile URL template. Input can either
 * already be a template (containing {x}/{y}/{z} or {q}), or a complete,
 * real tile URL — e.g. one copied out of a working map — in which case a
 * {q} placeholder is extrapolated from its embedded keyhole quadkey.
 */
export function resolveTileUrlTemplate(value: string): ResolvedTileUrlTemplate | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const direct = resolveTemplate(trimmed);
  if (direct) {
    return direct;
  }

  const extrapolated = extrapolateQuadkeyTemplate(trimmed);
  if (extrapolated) {
    return resolveTemplate(extrapolated);
  }

  return null;
}

function resolveTemplate(trimmed: string): ResolvedTileUrlTemplate | null {
  if (!/^https?:\/\//i.test(trimmed)) {
    return null;
  }

  const kind = detectTileUrlTemplateKind(trimmed);
  if (!kind) {
    return null;
  }

  // Confirm the URL is well-formed once placeholders are substituted with
  // sample values, since URL parsing rejects the raw "{x}" syntax.
  const sample =
    kind === 'quadkey'
      ? trimmed.replace(/\{q\}/g, 'tqrst')
      : trimmed.replace(/\{x\}/g, '0').replace(/\{y\}/g, '0').replace(/\{z\}/g, '0');

  try {
    new URL(sample);
    return { kind, template: trimmed };
  } catch {
    return null;
  }
}
