import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { SyntheticEvent } from 'react';
import { updateMarker, type Marker } from '../../../db';
import { DEFAULT_MARKER_COLOR } from '../../../lib/markerColor';
import type { FlatOption } from '../characters/rangeOptions';
import { RangeSelect } from '../RangeSelect';

interface MarkerItemProps {
  marker: Marker;
  expanded: boolean;
  onToggle: (event: SyntheticEvent, isExpanded: boolean) => void;
  onMarkerChange: (marker: Marker) => void;
  onDelete: () => void;
  chapterOptions: FlatOption[];
  episodeOptions: FlatOption[];
  hasBooks: boolean;
  hasSeasons: boolean;
  /** Whether this marker's area is currently being drawn/edited on the map. */
  isEditingArea?: boolean;
  /** The number of points in the in-progress area draft, for enabling/disabling Save. */
  areaDraftPointCount?: number;
  onStartEditingArea?: () => void;
  onSaveArea?: () => void;
  onCancelArea?: () => void;
  onClearArea?: () => void;
}

export function MarkerItem({
  marker,
  expanded,
  onToggle,
  onMarkerChange,
  onDelete,
  chapterOptions,
  episodeOptions,
  hasBooks,
  hasSeasons,
  isEditingArea,
  areaDraftPointCount,
  onStartEditingArea,
  onSaveArea,
  onCancelArea,
  onClearArea,
}: MarkerItemProps) {
  function handleFieldChange(field: 'label' | 'icon' | 'url' | 'color', value: string) {
    onMarkerChange({ ...marker, [field]: field === 'label' ? value : value || null });
  }

  async function persistMarker(updated: Marker) {
    await updateMarker(updated.id, {
      markerSetId: updated.markerSetId,
      label: updated.label,
      icon: updated.icon,
      url: updated.url,
      color: updated.color,
      large: updated.large,
      position: updated.position,
      polygon: updated.polygon,
      chapterRange: updated.chapterRange,
      episodeRange: updated.episodeRange,
    });
  }

  function handleBlur() {
    return persistMarker(marker);
  }

  function handleChapterRangeChange(
    boundary: 'startChapterId' | 'endChapterId',
    value: number | null,
  ) {
    const updated: Marker = {
      ...marker,
      chapterRange: {
        startChapterId: marker.chapterRange?.startChapterId ?? null,
        endChapterId: marker.chapterRange?.endChapterId ?? null,
        [boundary]: value,
      },
    };
    onMarkerChange(updated);
    persistMarker(updated);
  }

  function handleEpisodeRangeChange(
    boundary: 'startEpisodeId' | 'endEpisodeId',
    value: number | null,
  ) {
    const updated: Marker = {
      ...marker,
      episodeRange: {
        startEpisodeId: marker.episodeRange?.startEpisodeId ?? null,
        endEpisodeId: marker.episodeRange?.endEpisodeId ?? null,
        [boundary]: value,
      },
    };
    onMarkerChange(updated);
    persistMarker(updated);
  }

  function handleLargeChange(checked: boolean) {
    const updated: Marker = { ...marker, large: checked };
    onMarkerChange(updated);
    persistMarker(updated);
  }

  return (
    <Accordion
      expanded={expanded}
      onChange={onToggle}
      disableGutters
      elevation={0}
      square
      // A collection can hold hundreds of markers, each with 4 chapter/
      // episode range dropdowns (one Select per boundary) built from the
      // story's full chapter/episode list — rendered eagerly for every
      // marker regardless of its own expanded state, that's enough
      // MenuItems combined to visibly freeze the tab. unmountOnExit skips
      // building all of that for every collapsed marker, only paying the
      // cost for whichever one (at most) is actually open.
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
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', flexGrow: 1, minWidth: 0 }}
        >
          {marker.icon && (
            <Box
              component="img"
              src={marker.icon}
              alt={marker.label || 'Unnamed Marker'}
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
          <Typography variant="body2" noWrap sx={{ fontWeight: 500, maxWidth: 200 }}>
            {marker.label || 'Unnamed Marker'}
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 1 }}>
        <Stack spacing={1.5}>
          <TextField
            label="Name"
            size="small"
            fullWidth
            value={marker.label}
            onChange={(event) => handleFieldChange('label', event.target.value)}
            onBlur={handleBlur}
          />
          <TextField
            label="Wiki URL"
            size="small"
            fullWidth
            value={marker.url ?? ''}
            onChange={(event) => handleFieldChange('url', event.target.value)}
            onBlur={handleBlur}
            sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
            slotProps={{
              input: {
                endAdornment: marker.url && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      aria-label="Open Wiki URL"
                      href={marker.url}
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
            label="Icon URL"
            size="small"
            fullWidth
            value={marker.icon ?? ''}
            onChange={(event) => handleFieldChange('icon', event.target.value)}
            onBlur={handleBlur}
            sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
            slotProps={{
              input: {
                endAdornment: marker.icon && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      aria-label="Open Icon URL"
                      href={marker.icon}
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
            label="Color"
            type="color"
            size="small"
            value={marker.color ?? DEFAULT_MARKER_COLOR}
            onChange={(event) => handleFieldChange('color', event.target.value)}
            onBlur={handleBlur}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
            helperText="Used for the marker's area, and its pin when no icon is set."
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
          <FormControlLabel
            control={
              <Checkbox
                checked={marker.large}
                onChange={(event) => handleLargeChange(event.target.checked)}
              />
            }
            label="Large marker"
          />

          {isEditingArea ? (
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary">
                Click the map to add points; drag a point to move it; click a point to remove it (at
                least 3 required).
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  onClick={onSaveArea}
                  /* v8 ignore next -- EditScreen (the only real caller) always passes a real count (areaDraftPoints?.length ?? 0), never leaving this prop undefined. */
                  disabled={(areaDraftPointCount ?? 0) < 3}
                >
                  Save Area
                </Button>
                <Button size="small" onClick={onCancelArea}>
                  Cancel
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={onStartEditingArea}>
                {marker.polygon ? 'Edit Area' : 'Draw Area'}
              </Button>
              {marker.polygon && (
                <Button size="small" color="error" onClick={onClearArea}>
                  Clear Area
                </Button>
              )}
            </Stack>
          )}

          {hasBooks && (
            <Stack spacing={1.5}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Chapter Range
              </Typography>
              <RangeSelect
                label="Start Chapter"
                options={chapterOptions}
                value={marker.chapterRange?.startChapterId ?? null}
                onChange={(value) => handleChapterRangeChange('startChapterId', value)}
              />
              <RangeSelect
                label="End Chapter"
                options={chapterOptions}
                value={marker.chapterRange?.endChapterId ?? null}
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
                value={marker.episodeRange?.startEpisodeId ?? null}
                onChange={(value) => handleEpisodeRangeChange('startEpisodeId', value)}
              />
              <RangeSelect
                label="End Episode"
                options={episodeOptions}
                value={marker.episodeRange?.endEpisodeId ?? null}
                onChange={(value) => handleEpisodeRangeChange('endEpisodeId', value)}
              />
            </Stack>
          )}

          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Typography variant="caption" color="text.secondary">
              {marker.position.lat.toFixed(4)}, {marker.position.lng.toFixed(4)} — drag the pin on
              the map to move it.
            </Typography>
            <IconButton size="small" aria-label="Delete marker" onClick={onDelete}>
              <DeleteOutlineOutlinedIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
