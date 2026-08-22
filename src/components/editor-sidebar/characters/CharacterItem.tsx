import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
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
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useState, type DragEvent, type SyntheticEvent } from 'react';
import {
  listCharacterPositionsForCharacter,
  updateCharacter,
  type Character,
  type CharacterPosition,
} from '../../../db';
import { DEFAULT_CHARACTER_COLOR } from '../../../lib/characterColor';
import type { TimelineMode } from '../../MapTimelineControl';
import { DeleteConfirmDialog } from '../DeleteConfirmDialog';
import { PositionList } from './PositionList';

interface CharacterItemProps {
  character: Character;
  expanded: boolean;
  onToggle: (event: SyntheticEvent, isExpanded: boolean) => void;
  /** Whether this character's last position + tails should show on the map even while collapsed. */
  visible: boolean;
  onToggleVisible: () => void;
  /** Whether this character is the one currently being dragged, for a visual cue. */
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  onCharacterChange: (character: Character) => void;
  onDelete: () => void;
  /** Called with the 1-based index the new position would have when "+ Position" is clicked. */
  onAddPosition: (index: number) => void;
  /** Called with (position, 1-based index) when an existing position is clicked. */
  onEditPosition: (position: CharacterPosition, index: number) => void;
  /** Bumped whenever a position editing session ends, to re-fetch the list below. */
  positionsVersion: number;
  /** Called once this character's positions have (re)loaded, so the map pins can be kept in sync. */
  onPositionsChange: (characterId: number, positions: CharacterPosition[]) => void;
  /** The map timeline control's current mode, used to tell which positions it currently shows on the map. */
  timelineMode: TimelineMode;
  /** The map timeline control's current scrub position (a flat 1-based chapter/episode index). */
  timelineIndex: number;
}

export function CharacterItem({
  character,
  expanded,
  onToggle,
  visible,
  onToggleVisible,
  isDragging,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onCharacterChange,
  onDelete,
  onAddPosition,
  onEditPosition,
  positionsVersion,
  onPositionsChange,
  timelineMode,
  timelineIndex,
}: CharacterItemProps) {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [positions, setPositions] = useState<CharacterPosition[] | null>(null);
  const characterColor = character.color ?? DEFAULT_CHARACTER_COLOR;

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

  useEffect(() => {
    if (positions === null) return;
    onPositionsChange(character.id, positions);
  }, [character.id, positions, onPositionsChange]);

  function handleFieldChange(field: 'name' | 'group' | 'icon' | 'color' | 'url', value: string) {
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
      sortOrder: character.sortOrder,
      url: character.url,
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
      <Box sx={{ position: 'relative', opacity: isDragging ? 0.5 : 1 }}>
        {/* A native title, not an MUI Tooltip: Tooltip clones an aria-label
            onto its child, which would replace this button's accessible
            name (otherwise just "Jon Snow") with "Drag to reorder". */}
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          draggable
          title="Drag to reorder"
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragOver={onDragOver}
          onDrop={onDrop}
          sx={{ backgroundColor: 'rgba(0, 0, 0, .03)', px: 1, minHeight: 40 }}
        >
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', flexGrow: 1, minWidth: 0, pr: 6 }}
          >
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
                  backgroundColor: characterColor,
                  border: 1,
                  borderColor: 'divider',
                  flexShrink: 0,
                }}
              />
            )}
            <Typography variant="body2" noWrap sx={{ fontWeight: 500, maxWidth: 120 }}>
              {character.name || 'Unnamed Character'}
            </Typography>
          </Stack>
        </AccordionSummary>
        {/* A sibling of AccordionSummary — not a child — since AccordionSummary's
            root is itself a <button>, and nesting this IconButton's own
            <button> inside it is invalid HTML that browsers silently
            mis-parse (breaking click handling on one or both). Absolutely
            positioned so it still reads as part of the summary row. */}
        <Tooltip title={visible ? 'Hide on map' : 'Show on map'} arrow>
          <IconButton
            size="small"
            aria-label={visible ? 'Hide on map' : 'Show on map'}
            onClick={onToggleVisible}
            sx={{ position: 'absolute', right: 36, top: '50%', transform: 'translateY(-50%)' }}
          >
            {visible ? (
              <VisibilityOutlinedIcon fontSize="small" />
            ) : (
              <VisibilityOffOutlinedIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      </Box>
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
          <TextField
            label="Color"
            type="color"
            size="small"
            value={character.color ?? DEFAULT_CHARACTER_COLOR}
            onChange={(event) => handleFieldChange('color', event.target.value)}
            onBlur={handleBlur}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
            sx={{
              '& .MuiInputBase-input': {
                mx: 1,
                px: 0.5,
                py: 1,
                height: 24,
                cursor: 'pointer',
                // The browser's own <input type="color"> chrome renders a
                // heavier bezel around the swatch that the outline can't
                // override; drop it so only the TextField's border shows.
                appearance: 'none',
                WebkitAppearance: 'none',
                '&::-webkit-color-swatch-wrapper': { p: 0 },
                '&::-webkit-color-swatch': { border: 'none', borderRadius: 1 },
                '&::-moz-color-swatch': { border: 'none', borderRadius: 1 },
              },
            }}
          />
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
          <TextField
            label="URL"
            size="small"
            fullWidth
            value={character.url ?? ''}
            onChange={(event) => handleFieldChange('url', event.target.value)}
            onBlur={handleBlur}
            sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
            slotProps={{
              input: {
                endAdornment: character.url && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      aria-label="Open URL"
                      href={character.url}
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
          <PositionList
            storyId={character.storyId}
            positions={positions}
            characterColor={characterColor}
            timelineMode={timelineMode}
            timelineIndex={timelineIndex}
            onAddPosition={onAddPosition}
            onEditPosition={onEditPosition}
          />
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
