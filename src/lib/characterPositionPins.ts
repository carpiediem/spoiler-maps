import type { LatLng } from '../db';

/** A single numbered map pin for one of an expanded character's positions. */
export interface CharacterPositionPin {
  id: number;
  position: LatLng;
  label: string;
  color: string | null;
}
