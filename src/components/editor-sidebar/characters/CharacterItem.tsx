import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState, type SyntheticEvent } from 'react';
import {
  listCharacterPositionsForCharacter,
  updateCharacter,
  type Character,
  type CharacterPosition,
} from '../../../db';
import { DeleteConfirmDialog } from '../DeleteConfirmDialog';
import { describePositionRange, useRangeOptions } from './rangeOptions';

const DEFAULT_COLOR = '#1976d2';

interface CharacterItemProps {
  character: Character;
  expanded: boolean;
  onToggle: (event: SyntheticEvent, isExpanded: boolean) => void;
  onCharacterChange: (character: Character) => void;
  onDelete: () => void;
  /** Called with the 1-based index the new position would have when "+ Position" is clicked. */
  onAddPosition: (index: number) => void;
  /** Bumped whenever a position editing session ends, to re-fetch the list below. */
  positionsVersion: number;
}

export function CharacterItem({
  character,
  expanded,
  onToggle,
  onCharacterChange,
  onDelete,
  onAddPosition,
  positionsVersion,
}: CharacterItemProps) {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [positions, setPositions] = useState<CharacterPosition[] | null>(null);
  const { chapterOptions, episodeOptions } = useRangeOptions(character.storyId);

  useEffect(() => {
    let cancelled = false;
    listCharacterPositionsForCharacter(character.id).then((loadedPositions) => {
      if (cancelled) return;
      setPositions(loadedPositions);
    });
    return () => {
      cancelled = true;
    };
  }, [character.id, positionsVersion]);

  function handleFieldChange(field: 'name' | 'group' | 'icon' | 'color', value: string) {
    onCharacterChange({
      ...character,
      [field]: field === 'name' ? value : value || null,
    });
  }

  async function handleBlur() {
    await updateCharacter(character.id, {
      storyId: character.storyId,
      name: character.name,
      group: character.group,
      icon: character.icon,
      color: character.color,
    });
  }

  return (
    <Accordion
      expanded={expanded}
      onChange={onToggle}
      disableGutters
      elevation={0}
      square
      sx={{
        boxShadow: 'none',
        '&::before': { display: 'none' },
        borderRadius: 1,
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{ backgroundColor: 'rgba(0, 0, 0, .03)', px: 1, minHeight: 40 }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {character.icon ? (
            <Box
              component="img"
              src={character.icon}
              alt={character.name || 'Unnamed Character'}
              sx={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                objectFit: 'cover',
                border: 1,
                borderColor: 'divider',
                flexShrink: 0,
              }}
            />
          ) : (
            <Box
              sx={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                backgroundColor: character.color ?? DEFAULT_COLOR,
                border: 1,
                borderColor: 'divider',
                flexShrink: 0,
              }}
            />
          )}
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {character.name || 'Unnamed Character'}
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 1, backgroundColor: 'rgba(0, 0, 0, .015)' }}>
        <Stack spacing={1.5}>
          <TextField
            label="Name"
            size="small"
            fullWidth
            value={character.name}
            onChange={(event) => handleFieldChange('name', event.target.value)}
            onBlur={handleBlur}
          />
          <TextField
            label="Group"
            size="small"
            fullWidth
            value={character.group ?? ''}
            onChange={(event) => handleFieldChange('group', event.target.value)}
            onBlur={handleBlur}
          />
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
              Color
            </Typography>
            <Box
              component="input"
              type="color"
              value={character.color ?? DEFAULT_COLOR}
              onChange={(event) => handleFieldChange('color', event.target.value)}
              onBlur={handleBlur}
              aria-label="Color"
              sx={{
                width: 36,
                height: 36,
                p: 0,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                cursor: 'pointer',
              }}
            />
          </Stack>
          <TextField
            label="Icon URL"
            size="small"
            fullWidth
            value={character.icon ?? ''}
            onChange={(event) => handleFieldChange('icon', event.target.value)}
            onBlur={handleBlur}
            sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
            slotProps={{
              input: {
                endAdornment: character.icon && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      aria-label="Open Icon URL"
                      href={character.icon}
                      target="_blank"
                      rel="noopener noreferrer"
                      edge="end"
                    >
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          {!!positions?.length && (
            <Stack spacing={0.5}>
              {positions.map((position, positionIndex) => (
                <Typography key={position.id} variant="body2" color="text.secondary">
                  {`${positionIndex + 1}. ${describePositionRange(position.chapterRange, position.episodeRange, chapterOptions, episodeOptions)}`}
                </Typography>
              ))}
            </Stack>
          )}
          <Button
            size="small"
            startIcon={<AddIcon fontSize="small" />}
            // Only reachable once positions have loaded: disabled below
            // while it's still null.
            onClick={() => onAddPosition(positions!.length + 1)}
            disabled={positions === null}
            fullWidth
          >
            Position
          </Button>
          <Button size="small" color="error" onClick={() => setIsDeleteConfirmOpen(true)} fullWidth>
            Delete Character
          </Button>
        </Stack>
      </AccordionDetails>

      <DeleteConfirmDialog
        open={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => {
          setIsDeleteConfirmOpen(false);
          onDelete();
        }}
        title={`Delete “${character.name || 'Unnamed Character'}”?`}
        description="This will permanently delete the character. This can’t be undone."
      />
    </Accordion>
  );
}
