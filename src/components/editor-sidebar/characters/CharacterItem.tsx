import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PersonalVideoIcon from '@mui/icons-material/PersonalVideo';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Avatar,
  Box,
  Button,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useState, type ReactNode, type SyntheticEvent } from 'react';
import {
  listCharacterPositionsForCharacter,
  updateCharacter,
  type Character,
  type CharacterPosition,
} from '../../../db';
import { DEFAULT_CHARACTER_COLOR } from '../../../lib/characterColor';
import { DeleteConfirmDialog } from '../DeleteConfirmDialog';
import {
  summarizePositionRange,
  useRangeOptions,
  type PositionRangeSummary,
  type RangeSummaryPart,
} from './rangeOptions';

function RangeSummaryPartView({ icon, part }: { icon: ReactNode; part: RangeSummaryPart }) {
  return (
    <Tooltip title={part.fullLabel}>
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
        {icon}
        <span>{part.shortLabel}</span>
      </Box>
    </Tooltip>
  );
}

function PositionRangeSummaryView({ summary }: { summary: PositionRangeSummary }) {
  if (!summary.chapters && !summary.episodes) return 'Always visible';

  return (
    <Box
      component="span"
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}
    >
      {summary.chapters && (
        <RangeSummaryPartView
          icon={<MenuBookIcon sx={{ fontSize: 14 }} />}
          part={summary.chapters}
        />
      )}
      {summary.episodes && (
        <RangeSummaryPartView
          icon={<PersonalVideoIcon sx={{ fontSize: 14 }} />}
          part={summary.episodes}
        />
      )}
    </Box>
  );
}

interface CharacterItemProps {
  character: Character;
  expanded: boolean;
  onToggle: (event: SyntheticEvent, isExpanded: boolean) => void;
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
}

export function CharacterItem({
  character,
  expanded,
  onToggle,
  onCharacterChange,
  onDelete,
  onAddPosition,
  onEditPosition,
  positionsVersion,
  onPositionsChange,
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

  useEffect(() => {
    if (positions === null) return;
    onPositionsChange(character.id, positions);
  }, [character.id, positions, onPositionsChange]);

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
                backgroundColor: character.color ?? DEFAULT_CHARACTER_COLOR,
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
                p: 0.5,
                pt: 1,
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
          <FormControl
            size="small"
            fullWidth
            sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mt: 1 }}
          >
            <InputLabel shrink sx={{ px: 0.5, ml: 0.5, backgroundColor: 'background.paper' }}>
              Route
            </InputLabel>
            {/* Clips the list/button to the FormControl's rounded corners,
                separately from the label above, which pokes above this box
                and would otherwise get clipped along with them. */}
            <Box sx={{ borderRadius: 1, overflow: 'hidden' }}>
              {!!positions?.length && (
                <List dense disablePadding>
                  {positions.map((position, positionIndex) => (
                    <ListItemButton
                      key={position.id}
                      onClick={() => onEditPosition(position, positionIndex + 1)}
                      sx={{ py: 0.5 }}
                    >
                      <ListItemAvatar sx={{ minWidth: 32 }}>
                        <Avatar sx={{ width: 22, height: 22, fontSize: '0.75rem' }}>
                          {positionIndex + 1}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          position.note ||
                          `${position.position.lat.toFixed(4)}, ${position.position.lng.toFixed(4)}`
                        }
                        secondary={
                          <PositionRangeSummaryView
                            summary={summarizePositionRange(
                              position.chapterRange,
                              position.episodeRange,
                              chapterOptions,
                              episodeOptions,
                            )}
                          />
                        }
                        slotProps={{
                          primary: { variant: 'body2' },
                          secondary: { component: 'span' },
                        }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              )}
              <Button
                size="small"
                startIcon={<AddIcon fontSize="small" />}
                // Only reachable once positions have loaded: disabled below
                // while it's still null.
                onClick={() => onAddPosition(positions!.length + 1)}
                disabled={positions === null}
                fullWidth
                sx={{ borderRadius: 0 }}
              >
                Position
              </Button>
            </Box>
          </FormControl>
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
