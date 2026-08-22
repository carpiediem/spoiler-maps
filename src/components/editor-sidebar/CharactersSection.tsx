import AddIcon from '@mui/icons-material/Add';
import { Button, Stack, Typography } from '@mui/material';
import { useCallback, useEffect, useState, type DragEvent } from 'react';
import {
  createCharacter,
  deleteCharacter,
  listCharactersForStory,
  updateCharacter,
  type Character,
  type CharacterPosition,
} from '../../db';
import { sortOrderAfter, sortOrderBetween } from '../../db/ordering';
import { characterInitials } from '../../lib/characterInitials';
import type { CharacterPositionPin, CharacterTailOverlay } from '../../lib/characterPositionPins';
import { buildTailPoints, hasTailToDraw } from '../../lib/tailConnection';
import { makeTimelineVisibilityChecker } from '../../lib/timelineVisibility';
import type { TimelineMode } from '../MapTimelineControl';
import { useRangeOptions } from './characters/rangeOptions';
import { CharacterItem } from './characters/CharacterItem';
import { useExpandableEntityList } from './useExpandableEntityList';

interface CharactersSectionProps {
  storyId: number;
  /** 1-based index of the character to auto-expand, e.g. from a #characters-1 URL hash. */
  initialExpandedIndex?: number | null;
  onCountChange?: (count: number) => void;
  /** Called with (characterId, 1-based new position index, character color) when "+ Position" is clicked. */
  onAddPosition: (characterId: number, index: number, color: string | null) => void;
  /** Called with (characterId, 1-based index, position, character color) when an existing position is clicked. */
  onEditPosition: (
    characterId: number,
    index: number,
    position: CharacterPosition,
    color: string | null,
  ) => void;
  /** Bumped whenever a position editing session ends, so each CharacterItem re-fetches its list. */
  positionsVersion: number;
  /** Called with the expanded character's numbered position pins, or null once collapsed. */
  onVisiblePositionsChange: (pins: CharacterPositionPin[] | null) => void;
  /** Called with the tails to draw for every character toggled visible (independent of which is expanded). */
  onVisibleTailsChange: (tails: CharacterTailOverlay[]) => void;
  /** The map timeline control's current mode, used to filter which positions show as map pins. */
  timelineMode: TimelineMode;
  /** The map timeline control's current scrub position (a flat 1-based chapter/episode index). */
  timelineIndex: number;
  /** Whether the Characters accordion itself is expanded; collapsing it also collapses whichever character was expanded inside it. */
  sectionExpanded: boolean;
}

export function CharactersSection({
  storyId,
  initialExpandedIndex,
  onCountChange,
  onAddPosition,
  onEditPosition,
  positionsVersion,
  onVisiblePositionsChange,
  onVisibleTailsChange,
  timelineMode,
  timelineIndex,
  sectionExpanded,
}: CharactersSectionProps) {
  // A character stays visible on the map (last position + tails) once
  // toggled on, independent of — and in addition to — whichever character's
  // accordion happens to be expanded.
  const [visibleCharacterIds, setVisibleCharacterIds] = useState<Set<number>>(new Set());
  const [draggedCharacterId, setDraggedCharacterId] = useState<number | null>(null);
  // Keyed by character id, so map pins can be recomputed here — the single
  // place that already knows which character is expanded — instead of each
  // CharacterItem racing to report its own visibility.
  const [positionsByCharacterId, setPositionsByCharacterId] = useState<
    Record<number, CharacterPosition[]>
  >({});

  const load = useCallback((storyId: number) => listCharactersForStory(storyId), []);
  const onReset = useCallback(() => {
    setVisibleCharacterIds(new Set());
    setPositionsByCharacterId({});
  }, []);

  const {
    entities: characters,
    setEntities,
    expandedId: expandedCharacterId,
    toggle,
    addEntity,
    updateEntity,
    removeEntity,
  } = useExpandableEntityList<Character>({
    storyId,
    initialExpandedIndex,
    onCountChange,
    load,
    onReset,
    sectionExpanded,
  });

  const { chapterOptions, episodeOptions } = useRangeOptions(storyId);

  useEffect(() => {
    const isPositionVisible = makeTimelineVisibilityChecker(
      timelineMode,
      timelineIndex,
      chapterOptions,
      episodeOptions,
    );

    const pins: CharacterPositionPin[] = [];
    const tails: CharacterTailOverlay[] = [];

    if (expandedCharacterId !== null) {
      const positions = positionsByCharacterId[expandedCharacterId];
      const character = characters?.find((candidate) => candidate.id === expandedCharacterId);
      const color = character?.color ?? null;
      positions?.forEach((position, positionIndex) => {
        if (!isPositionVisible(position)) return;

        pins.push({
          characterId: expandedCharacterId,
          characterPosition: position,
          label: String(positionIndex + 1),
          positionIndex: positionIndex + 1,
          color,
        });

        const precedingPosition = positions?.[positionIndex - 1];
        if (hasTailToDraw(position, precedingPosition)) {
          tails.push({
            characterId: expandedCharacterId,
            points: buildTailPoints(position, precedingPosition),
            color,
            opacity: 1,
          });
        }
      });
    }

    // A visible-but-collapsed character shows its last position as an
    // initialed pin, every earlier position as a plain dot, plus every
    // position's tail — the expanded character above already shows all of
    // its positions numbered, so it's skipped here to avoid redundant pins
    // for the same positions.
    visibleCharacterIds.forEach((characterId) => {
      if (characterId === expandedCharacterId) return;
      const positions = positionsByCharacterId[characterId];
      if (!positions || positions.length === 0) return;
      const character = characters?.find((candidate) => candidate.id === characterId);
      /* v8 ignore next -- character can only be undefined here if visibleCharacterIds still names a just-deleted character, but handleDeleteCharacter clears both in the same batched update. */
      const color = character?.color ?? null;

      const lastVisiblePositionIndex = positions.reduce(
        (lastIndex, position, positionIndex) =>
          isPositionVisible(position) ? positionIndex : lastIndex,
        -1,
      );

      positions.forEach((position, positionIndex) => {
        if (!isPositionVisible(position)) return;
        const isLast = positionIndex === lastVisiblePositionIndex;
        pins.push({
          characterId,
          characterPosition: position,
          /* v8 ignore next -- see the v8 ignore above; same unreachable-in-practice fallback. */
          label: isLast ? characterInitials(character?.name ?? '') : '',
          positionIndex: positionIndex + 1,
          color,
          style: isLast ? 'pin' : 'dot',
        });

        const precedingPosition = positions[positionIndex - 1];
        if (hasTailToDraw(position, precedingPosition)) {
          tails.push({
            characterId,
            points: buildTailPoints(position, precedingPosition),
            color,
            opacity: 0.75,
          });
        }
      });
    });

    onVisiblePositionsChange(pins.length > 0 ? pins : null);
    onVisibleTailsChange(tails);
  }, [
    expandedCharacterId,
    visibleCharacterIds,
    positionsByCharacterId,
    characters,
    timelineMode,
    timelineIndex,
    chapterOptions,
    episodeOptions,
    onVisiblePositionsChange,
    onVisibleTailsChange,
  ]);

  // Stable across renders (functional setState form needs no deps) so it
  // doesn't itself become a new dependency that re-triggers the effect in
  // CharacterItem that calls it, which would otherwise loop forever.
  const handlePositionsChange = useCallback(
    (characterId: number, positions: CharacterPosition[]) => {
      setPositionsByCharacterId((previous) => ({ ...previous, [characterId]: positions }));
    },
    [],
  );

  // Only reachable once characters have loaded: the Loading/Add Character UI
  // below only renders handleAddCharacter's/handleCharacterChange's callers
  // (the Add Character button, CharacterItem) after the
  // `characters === null` early return.
  async function handleAddCharacter() {
    const character = await createCharacter({
      storyId,
      name: '',
      group: null,
      icon: null,
      color: null,
      sortOrder: sortOrderAfter(characters!.map((existing) => existing.sortOrder)),
    });
    addEntity(character);
  }

  // Only reachable while characterId is the expanded character: the Delete
  // Character button that triggers this only renders inside that
  // character's own AccordionDetails.
  async function handleDeleteCharacter(characterId: number) {
    await deleteCharacter(characterId);
    removeEntity(characterId);
    setPositionsByCharacterId((previous) => {
      const { [characterId]: _removed, ...rest } = previous;
      return rest;
    });
    setVisibleCharacterIds((previous) => {
      if (!previous.has(characterId)) return previous;
      const next = new Set(previous);
      next.delete(characterId);
      return next;
    });
  }

  function handleToggleVisible(characterId: number) {
    setVisibleCharacterIds((previous) => {
      const next = new Set(previous);
      if (next.has(characterId)) {
        next.delete(characterId);
      } else {
        next.add(characterId);
      }
      return next;
    });
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    // Required for this element to become a valid drop target at all.
    event.preventDefault();
  }

  // Reorders by moving the dragged character to just before the one it was
  // dropped on, computing its new sort order from its new neighbors rather
  // than renumbering the whole list.
  function handleDrop(targetCharacterId: number) {
    return async (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      const current = characters!;
      const draggedId = draggedCharacterId;
      setDraggedCharacterId(null);
      if (draggedId === null || draggedId === targetCharacterId) return;

      const dragged = current.find((character) => character.id === draggedId);
      /* v8 ignore next -- dragged can only be missing if the character it names was deleted mid-drag, which ends the drag (via onDragEnd) before a drop can land. */
      if (!dragged) return;

      const withoutDragged = current.filter((character) => character.id !== draggedId);
      const targetIndex = withoutDragged.findIndex(
        (character) => character.id === targetCharacterId,
      );
      const before = withoutDragged[targetIndex - 1]?.sortOrder ?? null;
      /* v8 ignore next -- targetIndex only ever comes from a character actually rendered (and thus present in withoutDragged), so this fallback is unreachable in practice. */
      const after = withoutDragged[targetIndex]?.sortOrder ?? null;
      const updated = { ...dragged, sortOrder: sortOrderBetween(before, after) };

      const reordered = [...withoutDragged];
      reordered.splice(targetIndex, 0, updated);
      setEntities(reordered);
      await updateCharacter(updated.id, updated);
    };
  }

  if (characters === null) {
    return (
      <Typography variant="body2" color="text.secondary">
        Loading characters…
      </Typography>
    );
  }

  return (
    <Stack spacing={1}>
      {characters.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No characters yet.
        </Typography>
      )}

      {characters.map((character) => (
        <CharacterItem
          key={character.id}
          character={character}
          expanded={expandedCharacterId === character.id}
          onToggle={toggle(character.id)}
          visible={visibleCharacterIds.has(character.id)}
          onToggleVisible={() => handleToggleVisible(character.id)}
          isDragging={draggedCharacterId === character.id}
          onDragStart={() => setDraggedCharacterId(character.id)}
          onDragEnd={() => setDraggedCharacterId(null)}
          onDragOver={handleDragOver}
          onDrop={handleDrop(character.id)}
          onCharacterChange={updateEntity}
          onDelete={() => handleDeleteCharacter(character.id)}
          onAddPosition={(index) => onAddPosition(character.id, index, character.color)}
          onEditPosition={(position, index) =>
            onEditPosition(character.id, index, position, character.color)
          }
          positionsVersion={positionsVersion}
          onPositionsChange={handlePositionsChange}
          timelineMode={timelineMode}
          timelineIndex={timelineIndex}
        />
      ))}

      <Button size="small" startIcon={<AddIcon fontSize="small" />} onClick={handleAddCharacter}>
        Add Character
      </Button>
    </Stack>
  );
}
