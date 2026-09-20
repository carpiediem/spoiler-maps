import type { CharacterPosition } from '../../db';
import { characterInitials } from '../characterInitials';
import type { CharacterPositionPin, CharacterTailOverlay } from '../characterPositionPins';
import { applyTailOpacityGradient, buildTailPoints, hasTailToDraw } from '../tailConnection';
import { isPositionVisible } from './viewTimeline';
import type { TimelineMode } from '../timelineMode';
import type { StoryDocument, StoryDocumentPosition } from '../storyDocument';

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
 * pin/tail computation. When `showFullPath` is true, every checked
 * character shows its last-reached position as an initialed pin, every
 * earlier reached position as a plain dot, and each reached position's
 * tail connected to the one before it — matching the editor's own
 * (unconditional) rendering of a visible character's path. When false, a
 * reader only sees where each checked character currently is: just the
 * last-reached position's pin, with no intermediate stops or tails at all.
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

    // The first alias (in array order) whose own chapter/episode range is
    // currently active, if any — the character displays that alias's own
    // name/color instead of its real ones for as long as it stays active.
    const activeAlias = character.aliases?.find((alias) =>
      isPositionVisible(alias, mode, currentIndex),
    );
    const name = activeAlias?.name ?? character.name;
    // An active alias's own color entirely replaces the character's — not
    // just filling in when the alias left it unset — matching
    // CharacterPathsPanel's identical rule for its own icon/color/url.
    const color = activeAlias ? (activeAlias.color ?? null) : (character.color ?? null);
    const { position: lastPosition, positionIndex: lastPositionIndex } =
      reachedPositionIndices[reachedPositionIndices.length - 1]!;

    if (!showFullPath) {
      pins.push({
        characterId: characterIndex,
        characterPosition: toMapCharacterPosition(
          lastPosition,
          characterIndex * 100_000 + lastPositionIndex,
        ),
        label: characterInitials(name),
        positionIndex: lastPositionIndex + 1,
        color,
        style: 'pin',
      });
      return;
    }

    const characterTails: CharacterTailOverlay[] = [];

    reachedPositionIndices.forEach(({ position, positionIndex }, reachedIndex) => {
      const syntheticId = characterIndex * 100_000 + positionIndex;
      const isLast = positionIndex === lastPositionIndex;

      pins.push({
        characterId: characterIndex,
        characterPosition: toMapCharacterPosition(position, syntheticId),
        label: isLast ? characterInitials(name) : '',
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
      if (hasTailToDraw(position, precedingLatLng)) {
        characterTails.push({
          characterId: characterIndex,
          points: buildTailPoints(
            { position: { lat: position.lat, lng: position.lng }, tail: position.tail },
            precedingLatLng,
          ),
          color,
          opacity: 0,
        });
      }
    });

    tails.push(...applyTailOpacityGradient(characterTails));
  });

  return { pins, tails };
}
