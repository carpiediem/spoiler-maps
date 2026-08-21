import type { CharacterPosition } from '../db';

/** A single numbered map pin for one of an expanded character's positions. */
export interface CharacterPositionPin {
  characterId: number;
  characterPosition: CharacterPosition;
  label: string;
  color: string | null;
}
