import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PersonalVideoIcon from '@mui/icons-material/PersonalVideo';
import {
  Box,
  IconButton,
  Link,
  Paper,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useRangeOptions } from './editor-sidebar/characters/rangeOptions';

export type TimelineMode = 'book' | 'tv';

interface MapTimelineControlProps {
  storyId: number | null;
  /** Called with the active mode and the flat 1-based index of the selected chapter/episode. */
  onChange: (mode: TimelineMode, index: number) => void;
}

/**
 * A small overlay panel, floated to the right of the map's zoom control,
 * that lets the user scrub through a story's chapters or episodes to see
 * which character positions had happened by that point.
 */
export function MapTimelineControl({ storyId, onChange }: MapTimelineControlProps) {
  const { chapterOptions, episodeOptions, hasBooks, hasSeasons } = useRangeOptions(storyId);
  // Starts in book mode unless the story has only TV seasons; null (the
  // no-override case) keeps tracking that default live as the story's
  // books/seasons finish loading, until the user picks a mode themselves.
  const [modeOverride, setModeOverride] = useState<{
    storyId: number | null;
    mode: TimelineMode;
  } | null>(null);
  const defaultMode: TimelineMode = hasSeasons && !hasBooks ? 'tv' : 'book';
  const mode = modeOverride?.storyId === storyId ? modeOverride.mode : defaultMode;

  const activeOptions = mode === 'book' ? chapterOptions : episodeOptions;

  // Starts on the last chapter/episode; re-derived (rather than reset via an
  // effect) whenever the story, mode, or option-list length changes, so a
  // manual scrub sticks until one of those actually changes.
  const optionsKey = `${storyId ?? 'none'}:${mode}:${activeOptions.length}`;
  const [indexOverride, setIndexOverride] = useState<{ key: string; index: number } | null>(null);
  const index =
    indexOverride?.key === optionsKey ? indexOverride.index : Math.max(activeOptions.length, 1);

  useEffect(() => {
    if (activeOptions.length === 0) return;
    onChange(mode, index);
  }, [mode, index, activeOptions.length, onChange]);

  if (!hasBooks && !hasSeasons) return null;

  function handleModeChange(_event: unknown, next: TimelineMode | null) {
    if (next) setModeOverride({ storyId, mode: next });
  }

  function setIndex(next: number) {
    setIndexOverride({ key: optionsKey, index: Math.min(activeOptions.length, Math.max(1, next)) });
  }

  function step(delta: number) {
    setIndex(index + delta);
  }

  const currentOption = activeOptions[index - 1] ?? null;
  // FlatOption.label leads with its own overall index (e.g. "12. AGOT:
  // Bran") for range summaries elsewhere; this control shows that index via
  // the slider itself, so it's stripped here to avoid showing it twice.
  const currentLabel = currentOption?.label.replace(/^\d+\.\s*/, '') ?? null;

  return (
    <Paper
      elevation={2}
      sx={{
        position: 'absolute',
        top: 10,
        left: 52,
        zIndex: 1000,
        p: 0.5,
        display: 'flex',
        gap: 0.5,
        width: 260,
      }}
    >
      <ToggleButtonGroup
        value={mode}
        exclusive
        orientation="vertical"
        size="small"
        onChange={handleModeChange}
      >
        <ToggleButton value="book" disabled={!hasBooks} aria-label="Books">
          <Tooltip title="Books" arrow placement="left">
            <MenuBookIcon fontSize="small" />
          </Tooltip>
        </ToggleButton>
        <ToggleButton value="tv" disabled={!hasSeasons} aria-label="TV seasons">
          <Tooltip title="TV" arrow placement="left">
            <PersonalVideoIcon fontSize="small" />
          </Tooltip>
        </ToggleButton>
      </ToggleButtonGroup>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          flex: 1,
          minWidth: 0,
        }}
      >
        <Slider
          size="small"
          min={1}
          max={Math.max(activeOptions.length, 1)}
          value={index}
          onChange={(_event, value) => setIndex(value as number)}
          disabled={activeOptions.length === 0}
          aria-label={mode === 'book' ? 'Chapter' : 'Episode'}
          sx={{ mx: 1, width: 'auto' }}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => step(-1)}
            disabled={index <= 1}
            aria-label="Previous"
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <Typography variant="caption" noWrap sx={{ flex: 1, textAlign: 'center' }}>
            {currentOption ? (
              currentOption.url ? (
                <Link href={currentOption.url} target="_blank" rel="noopener noreferrer">
                  {currentLabel}
                </Link>
              ) : (
                currentLabel
              )
            ) : (
              '—'
            )}
          </Typography>
          <IconButton
            size="small"
            onClick={() => step(1)}
            disabled={index >= activeOptions.length}
            aria-label="Next"
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
}
