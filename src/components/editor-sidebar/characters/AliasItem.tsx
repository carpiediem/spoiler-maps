import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { memo, type SyntheticEvent } from 'react';
import { updateCharacterAlias, type CharacterAlias } from '../../../db';
import { DEFAULT_CHARACTER_COLOR } from '../../../lib/characterColor';
import type { FlatOption } from './rangeOptions';
import { RangeSelect } from '../RangeSelect';

interface AliasItemProps {
  /** The id of the character this alias belongs to — a plain value (not baked into onToggle/onAliasChange/onDelete's closures) so those props can stay the exact same function reference across every alias. */
  characterId: number;
  alias: CharacterAlias;
  expanded: boolean;
  onToggle: (characterId: number, aliasId: number, event: SyntheticEvent, isExpanded: boolean) => void;
  onAliasChange: (characterId: number, alias: CharacterAlias) => void;
  onDelete: (characterId: number, aliasId: number) => void;
  chapterOptions: FlatOption[];
  episodeOptions: FlatOption[];
  hasBooks: boolean;
  hasSeasons: boolean;
}

export const AliasItem = memo(function AliasItem({
  characterId,
  alias,
  expanded,
  onToggle,
  onAliasChange,
  onDelete,
  chapterOptions,
  episodeOptions,
  hasBooks,
  hasSeasons,
}: AliasItemProps) {
  function handleFieldChange(field: 'name' | 'group' | 'icon' | 'color' | 'url', value: string) {
    onAliasChange(characterId, { ...alias, [field]: field === 'name' ? value : value || null });
  }

  async function persistAlias(updated: CharacterAlias) {
    await updateCharacterAlias(updated.id, {
      characterId: updated.characterId,
      name: updated.name,
      group: updated.group,
      icon: updated.icon,
      color: updated.color,
      url: updated.url,
      chapterRange: updated.chapterRange,
      episodeRange: updated.episodeRange,
    });
  }

  function handleBlur() {
    return persistAlias(alias);
  }

  function handleChapterRangeChange(
    boundary: 'startChapterId' | 'endChapterId',
    value: number | null,
  ) {
    const updated: CharacterAlias = {
      ...alias,
      chapterRange: {
        startChapterId: alias.chapterRange?.startChapterId ?? null,
        endChapterId: alias.chapterRange?.endChapterId ?? null,
        [boundary]: value,
      },
    };
    onAliasChange(characterId, updated);
    persistAlias(updated);
  }

  function handleEpisodeRangeChange(
    boundary: 'startEpisodeId' | 'endEpisodeId',
    value: number | null,
  ) {
    const updated: CharacterAlias = {
      ...alias,
      episodeRange: {
        startEpisodeId: alias.episodeRange?.startEpisodeId ?? null,
        endEpisodeId: alias.episodeRange?.endEpisodeId ?? null,
        [boundary]: value,
      },
    };
    onAliasChange(characterId, updated);
    persistAlias(updated);
  }

  return (
    <Accordion
      expanded={expanded}
      onChange={(event, isExpanded) => onToggle(characterId, alias.id, event, isExpanded)}
      disableGutters
      elevation={0}
      square
      // Mirrors MarkerItem's own unmountOnExit: a character can have several
      // aliases, each with 4 chapter/episode range dropdowns built from the
      // story's full chapter/episode list — no reason to pay for building
      // all of that for every collapsed alias.
      slotProps={{ transition: { unmountOnExit: true } }}
      sx={{ boxShadow: 'none', '&::before': { display: 'none' }, borderRadius: 1 }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.05),
          px: 1,
          minHeight: 36,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexGrow: 1, minWidth: 0 }}>
          {alias.icon && (
            <Box
              component="img"
              src={alias.icon}
              alt={alias.name || 'Unnamed Alias'}
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
          )}
          <Typography
            variant="body2"
            noWrap
            // See MarkerItem's identical comment: the icon (plus the
            // Stack's spacing before it) isn't available to the label when
            // one is set, so it gets a smaller cap.
            sx={{ fontWeight: 500, maxWidth: alias.icon ? 150 : 176 }}
          >
            {alias.name || 'Unnamed Alias'}
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 1 }}>
        <Stack spacing={1.5}>
          <TextField
            label="Name"
            size="small"
            fullWidth
            value={alias.name}
            onChange={(event) => handleFieldChange('name', event.target.value)}
            onBlur={handleBlur}
          />
          <TextField
            label="Group"
            size="small"
            fullWidth
            value={alias.group ?? ''}
            onChange={(event) => handleFieldChange('group', event.target.value)}
            onBlur={handleBlur}
          />
          <TextField
            label="Color"
            type="color"
            size="small"
            value={alias.color ?? DEFAULT_CHARACTER_COLOR}
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
            value={alias.icon ?? ''}
            onChange={(event) => handleFieldChange('icon', event.target.value)}
            onBlur={handleBlur}
            sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
            slotProps={{
              input: {
                endAdornment: alias.icon && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      aria-label="Open Icon URL"
                      href={alias.icon}
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
            value={alias.url ?? ''}
            onChange={(event) => handleFieldChange('url', event.target.value)}
            onBlur={handleBlur}
            sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
            slotProps={{
              input: {
                endAdornment: alias.url && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      aria-label="Open URL"
                      href={alias.url}
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

          {hasBooks && (
            <Stack spacing={1.5}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Chapter Range
              </Typography>
              <RangeSelect
                label="Start Chapter"
                options={chapterOptions}
                value={alias.chapterRange?.startChapterId ?? null}
                onChange={(value) => handleChapterRangeChange('startChapterId', value)}
              />
              <RangeSelect
                label="End Chapter"
                options={chapterOptions}
                value={alias.chapterRange?.endChapterId ?? null}
                onChange={(value) => handleChapterRangeChange('endChapterId', value)}
              />
            </Stack>
          )}

          {hasSeasons && (
            <Stack spacing={1.5}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Episode Range
              </Typography>
              <RangeSelect
                label="Start Episode"
                options={episodeOptions}
                value={alias.episodeRange?.startEpisodeId ?? null}
                onChange={(value) => handleEpisodeRangeChange('startEpisodeId', value)}
              />
              <RangeSelect
                label="End Episode"
                options={episodeOptions}
                value={alias.episodeRange?.endEpisodeId ?? null}
                onChange={(value) => handleEpisodeRangeChange('endEpisodeId', value)}
              />
            </Stack>
          )}

          <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
            <IconButton
              size="small"
              aria-label="Delete alias"
              onClick={() => onDelete(characterId, alias.id)}
            >
              <DeleteOutlineOutlinedIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
});
