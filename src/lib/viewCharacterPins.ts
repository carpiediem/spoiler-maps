import type { CharacterPosition } from '../db';
import { characterInitials } from './characterInitials';
import type { CharacterPositionPin, CharacterTailOverlay } from './characterPositionPins';
import { buildTailPoints, hasTailToDraw } from './tailConnection';
import { isPositionVisible } from './viewTimeline';
import type { TimelineMode } from '../components/MapTimelineControl';
import type { StoryDocument, StoryDocumentPosition } from './storyDocument';

/** Adapts a StoryDocument position into the shape MapView's pins/tails expect, with a synthetic id (the document has none). */
function toMapCharacterPosition(
  position: StoryDocumentPosition,
  syntheticId: number,
): CharacterPosition {
  return {
    id: syntheticId,
    characterId: syntheticId,
    position: { lat: position.lat, lng: position.lng },
    dead: position.dead ?? false,
    note: position.note ?? null,
    tail: position.tail ?? null,
    chapterRange: null,
    episodeRange: null,
  };
}

/** A StoryDocument position's lat/lng, in the nested shape buildTailPoints expects. */
function toLatLngPosition(position: StoryDocumentPosition): {
  position: { lat: number; lng: number };
} {
  return { position: { lat: position.lat, lng: position.lng } };
}

/**
 * The view screen's equivalent of CharactersSection's visible-but-collapsed
 * pin/tail computation: every checked character shows its last-reached
 * position as an initialed pin and every earlier reached position as a
 * plain dot, plus (only when `showFullPath`) each reached position's tail,
 * connected to the one before it.
 */
export function buildViewPinsAndTails(
  document: StoryDocument,
  checkedIndices: Set<number>,
  showFullPath: boolean,
  mode: TimelineMode,
  currentIndex: number,
): { pins: CharacterPositionPin[]; tails: CharacterTailOverlay[] } {
  const pins: CharacterPositionPin[] = [];
  const tails: CharacterTailOverlay[] = [];

  document.characters.forEach((character, characterIndex) => {
    if (!checkedIndices.has(characterIndex)) return;

    const reachedPositionIndices = character.positions
      .map((position, positionIndex) => ({ position, positionIndex }))
      .filter(({ position }) => isPositionVisible(position, mode, currentIndex));
    if (reachedPositionIndices.length === 0) return;

    const lastReachedIndex =
      reachedPositionIndices[reachedPositionIndices.length - 1]!.positionIndex;
    const color = character.color ?? null;

    reachedPositionIndices.forEach(({ position, positionIndex }, reachedIndex) => {
      const syntheticId = characterIndex * 100_000 + positionIndex;
      const isLast = positionIndex === lastReachedIndex;

      pins.push({
        characterId: characterIndex,
        characterPosition: toMapCharacterPosition(position, syntheticId),
        label: isLast ? characterInitials(character.name) : '',
        positionIndex: positionIndex + 1,
        color,
        style: isLast ? 'pin' : 'dot',
      });

      // The preceding *visible* position, not just the preceding one in the
      // character's full list — a position hidden by the timeline scrub or
      // gated to the other medium shouldn't be a tail's endpoint.
      const precedingPosition =
        reachedIndex > 0 ? reachedPositionIndices[reachedIndex - 1]!.position : undefined;
      const precedingLatLng = precedingPosition && toLatLngPosition(precedingPosition);
      if (showFullPath && hasTailToDraw(position, precedingLatLng)) {
        tails.push({
          characterId: characterIndex,
          points: buildTailPoints(
            { position: { lat: position.lat, lng: position.lng }, tail: position.tail },
            precedingLatLng,
          ),
          color,
          opacity: 1,
        });
      }
    });
  });

  return { pins, tails };
}
