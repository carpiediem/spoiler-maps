import type { CharacterPosition, LatLng } from '../db';

/** A single numbered (or initialed) map pin for one of a character's positions. */
export interface CharacterPositionPin {
  characterId: number;
  characterPosition: CharacterPosition;
  /** What the pin displays: a 1-based position number, or the character's initials. Ignored when style is 'dot'. */
  label: string;
  /** The 1-based index of characterPosition within its character's position list, regardless of what `label` displays — used to open the right Position panel on click. */
  positionIndex: number;
  color: string | null;
  /** 'pin' (default) is the usual labeled teardrop icon; 'dot' is a small solid circle, used for a visible-but-collapsed character's non-last positions. */
  style?: 'pin' | 'dot';
}

/** One position's saved tail, to be drawn as a polyline. */
export interface CharacterTailOverlay {
  characterId: number;
  /** Always starts with the CharacterPosition's own lat/lng, so the tail connects to its marker. */
  points: LatLng[];
  color: string | null;
  /** Full opacity for an expanded character's own tails; dimmed for a visible-but-collapsed character's. */
  opacity: number;
}
