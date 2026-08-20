import { Typography } from '@mui/material';
import { useEffect } from 'react';
import { listCharactersForStory } from '../../db';

interface CharactersSectionProps {
  storyId: number;
  onCountChange?: (count: number) => void;
}

export function CharactersSection({ storyId, onCountChange }: CharactersSectionProps) {
  useEffect(() => {
    let cancelled = false;
    listCharactersForStory(storyId).then((characters) => {
      if (cancelled) return;
      onCountChange?.(characters.length);
    });
    return () => {
      cancelled = true;
    };
  }, [storyId, onCountChange]);

  return (
    <Typography variant="body2" color="text.secondary">
      No characters yet.
    </Typography>
  );
}
