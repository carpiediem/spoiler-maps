import AddIcon from '@mui/icons-material/Add';
import { Button, Stack, Typography } from '@mui/material';
import { useEffect, useState, type SyntheticEvent } from 'react';
import { createCharacter, deleteCharacter, listCharactersForStory, type Character } from '../../db';
import { CharacterItem } from './characters/CharacterItem';

interface CharactersSectionProps {
  storyId: number;
  onCountChange?: (count: number) => void;
  /** Called with (characterId, 1-based new position index) when "+ Position" is clicked. */
  onAddPosition: (characterId: number, index: number) => void;
}

export function CharactersSection({
  storyId,
  onCountChange,
  onAddPosition,
}: CharactersSectionProps) {
  const [characters, setCharacters] = useState<Character[] | null>(null);
  const [expandedCharacterId, setExpandedCharacterId] = useState<number | null>(null);

  useEffect(() => {
    if (characters !== null) onCountChange?.(characters.length);
  }, [characters, onCountChange]);

  useEffect(() => {
    let cancelled = false;

    function resetForNewStory() {
      setCharacters(null);
      setExpandedCharacterId(null);
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
        />
      ))}

      <Button size="small" startIcon={<AddIcon fontSize="small" />} onClick={handleAddCharacter}>
        Add Character
      </Button>
    </Stack>
  );
}
