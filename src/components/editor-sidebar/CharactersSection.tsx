import AddIcon from '@mui/icons-material/Add';
import { Button, Stack, Typography } from '@mui/material';
import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';
import {
  createCharacter,
  deleteCharacter,
  listCharactersForStory,
  type Character,
  type CharacterPosition,
} from '../../db';
import type { CharacterPositionPin } from '../../lib/characterPositionPins';
import { CharacterItem } from './characters/CharacterItem';

interface CharactersSectionProps {
  storyId: number;
  onCountChange?: (count: number) => void;
  /** Called with (characterId, 1-based new position index) when "+ Position" is clicked. */
  onAddPosition: (characterId: number, index: number) => void;
  /** Called with (characterId, 1-based index, position) when an existing position is clicked. */
  onEditPosition: (characterId: number, index: number, position: CharacterPosition) => void;
  /** Bumped whenever a position editing session ends, so each CharacterItem re-fetches its list. */
  positionsVersion: number;
  /** Called with the expanded character's numbered position pins, or null once collapsed. */
  onVisiblePositionsChange: (pins: CharacterPositionPin[] | null) => void;
}

export function CharactersSection({
  storyId,
  onCountChange,
  onAddPosition,
  onEditPosition,
  positionsVersion,
  onVisiblePositionsChange,
}: CharactersSectionProps) {
  const [characters, setCharacters] = useState<Character[] | null>(null);
  const [expandedCharacterId, setExpandedCharacterId] = useState<number | null>(null);
  // Keyed by character id, so map pins can be recomputed here — the single
  // place that already knows which character is expanded — instead of each
  // CharacterItem racing to report its own visibility.
  const [positionsByCharacterId, setPositionsByCharacterId] = useState<
    Record<number, CharacterPosition[]>
  >({});

  useEffect(() => {
    if (characters !== null) onCountChange?.(characters.length);
  }, [characters, onCountChange]);

  useEffect(() => {
    let cancelled = false;

    function resetForNewStory() {
      setCharacters(null);
      setExpandedCharacterId(null);
      setPositionsByCharacterId({});
    }
    resetForNewStory();

    listCharactersForStory(storyId).then((loadedCharacters) => {
      if (cancelled) return;
      setCharacters(loadedCharacters);
    });

    return () => {
      cancelled = true;
    };
  }, [storyId]);

  useEffect(() => {
    if (expandedCharacterId === null) {
      onVisiblePositionsChange(null);
      return;
    }
    const positions = positionsByCharacterId[expandedCharacterId];
    if (!positions) {
      onVisiblePositionsChange(null);
      return;
    }
    const character = characters?.find((candidate) => candidate.id === expandedCharacterId);
    onVisiblePositionsChange(
      positions.map((position, positionIndex) => ({
        characterId: expandedCharacterId,
        characterPosition: position,
        label: String(positionIndex + 1),
        color: character?.color ?? null,
      })),
    );
  }, [expandedCharacterId, positionsByCharacterId, characters, onVisiblePositionsChange]);

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
    });
    setCharacters((previous) => [...previous!, character]);
    setExpandedCharacterId(character.id);
  }

  function handleCharacterChange(updated: Character) {
    setCharacters((previous) =>
      previous!.map((character) => (character.id === updated.id ? updated : character)),
    );
  }

  // Only reachable while characterId is the expanded character: the Delete
  // Character button that triggers this only renders inside that
  // character's own AccordionDetails.
  async function handleDeleteCharacter(characterId: number) {
    await deleteCharacter(characterId);
    setCharacters((previous) => previous!.filter((character) => character.id !== characterId));
    setExpandedCharacterId(null);
    setPositionsByCharacterId((previous) => {
      const { [characterId]: _removed, ...rest } = previous;
      return rest;
    });
  }

  function handleToggle(characterId: number) {
    return (_event: SyntheticEvent, isExpanded: boolean) => {
      setExpandedCharacterId(isExpanded ? characterId : null);
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
          onToggle={handleToggle(character.id)}
          onCharacterChange={handleCharacterChange}
          onDelete={() => handleDeleteCharacter(character.id)}
          onAddPosition={(index) => onAddPosition(character.id, index)}
          onEditPosition={(position, index) => onEditPosition(character.id, index, position)}
          positionsVersion={positionsVersion}
          onPositionsChange={handlePositionsChange}
        />
      ))}

      <Button size="small" startIcon={<AddIcon fontSize="small" />} onClick={handleAddCharacter}>
        Add Character
      </Button>
    </Stack>
  );
}
