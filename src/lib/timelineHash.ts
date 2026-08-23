import type { TimelineMode } from '../components/MapTimelineControl';

const TIMELINE_HASH_PATTERN = /^#(chapter|episode)-(\d+)$/i;

/**
 * Parses a `#chapter-N` or `#episode-N` URL fragment (e.g. from a shared
 * link to either screen) into the timeline mode and flat 1-based scrub
 * index it names — e.g. `#chapter-20` → `{ mode: 'book', index: 20 }`.
 * Returns null for a missing, malformed, or non-positive fragment;
 * out-of-range indices are left for the caller to clamp, same as a manual
 * scrub.
 */
export function parseTimelineHash(hash: string): { mode: TimelineMode; index: number } | null {
  const match = TIMELINE_HASH_PATTERN.exec(hash);
  if (!match) return null;
  const [, unit, indexStr] = match;
  const index = Number(indexStr);
  if (!Number.isInteger(index) || index < 1) return null;

  return { mode: unit!.toLowerCase() === 'chapter' ? 'book' : 'tv', index };
}
