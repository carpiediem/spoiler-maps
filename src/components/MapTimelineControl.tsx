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
import { alpha } from '@mui/material/styles';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { FlatOption } from './editor-sidebar/characters/rangeOptions';

export type TimelineMode = 'book' | 'tv';

// How often, in ms, the slider advances while an arrow key is held down.
const HELD_KEY_STEP_INTERVAL_MS = 150;

interface MapTimelineControlProps {
  chapterOptions: FlatOption[];
  episodeOptions: FlatOption[];
  hasBooks: boolean;
  hasSeasons: boolean;
  /** Called with the active mode and the flat 1-based index of the selected chapter/episode. */
  onChange: (mode: TimelineMode, index: number) => void;
  /** An optional label shown above the panel, e.g. "Show spoilers through:" for the view screen. */
  heading?: string;
  /** Starts the slider here instead of defaulting to book mode's last entry, e.g. from a #chapter-N URL fragment. Applied once, the first time the named medium's options are non-empty — chapterOptions/episodeOptions may still be loading (e.g. from the database) when this component first mounts. */
  initialMode?: TimelineMode;
  /** Paired with initialMode: the flat 1-based index to start on, clamped to the named medium's actual range once known. */
  initialIndex?: number;
}

/**
 * A small overlay panel, floated to the right of the map's zoom control,
 * that lets the user scrub through a story's chapters or episodes to see
 * which character positions had happened by that point. The caller should
 * give it a `key` that changes whenever the underlying story/document does,
 * so a manual mode/scrub choice doesn't carry over to an unrelated one.
 */
export function MapTimelineControl({
  chapterOptions,
  episodeOptions,
  hasBooks,
  hasSeasons,
  onChange,
  heading,
  initialMode,
  initialIndex,
}: MapTimelineControlProps) {
  // Starts in book mode unless the story has only TV seasons; null (the
  // no-override case) keeps tracking that default live as the story's
  // books/seasons finish loading, until the user picks a mode themselves
  // (or initialMode applies, below).
  const [modeOverride, setModeOverride] = useState<TimelineMode | null>(null);
  const defaultMode: TimelineMode = hasSeasons && !hasBooks ? 'tv' : 'book';
  const mode = modeOverride ?? defaultMode;

  const activeOptions = mode === 'book' ? chapterOptions : episodeOptions;

  // Starts on the last chapter/episode; re-derived (rather than reset via an
  // effect) whenever the mode or option-list length changes, so a manual
  // scrub sticks until one of those actually changes.
  const optionsKey = `${mode}:${activeOptions.length}`;
  const [indexOverride, setIndexOverride] = useState<{ key: string; index: number } | null>(null);
  const index =
    indexOverride?.key === optionsKey ? indexOverride.index : Math.max(activeOptions.length, 1);

  useEffect(() => {
    if (activeOptions.length === 0) return;
    onChange(mode, index);
  }, [mode, index, activeOptions.length, onChange]);

  // Applies initialMode/initialIndex exactly once, but only once the named
  // medium's own options are non-empty — for the editor, chapterOptions/
  // episodeOptions load from the database asynchronously and are still
  // empty on this component's first render, so clamping against them at
  // mount time (like a manual scrub does) would immediately clamp a
  // #chapter-20 request down to nothing. The view screen's document is
  // already fully loaded before this component ever mounts, so there this
  // just applies on the very next render. Adjusting state directly during
  // render (React's documented pattern for this — see
  // https://react.dev/learn/you-might-not-need-an-effect) rather than in a
  // useEffect, since initialIndex/initialTargetOptions.length are already
  // known synchronously; no need for the extra render an effect would cost.
  const [appliedInitial, setAppliedInitial] = useState(initialIndex === undefined);
  const initialTargetMode = initialMode ?? defaultMode;
  const initialTargetOptions = initialTargetMode === 'book' ? chapterOptions : episodeOptions;

  if (!appliedInitial && initialIndex !== undefined && initialTargetOptions.length > 0) {
    setAppliedInitial(true);
    if (initialMode !== undefined) setModeOverride(initialMode);
    setIndexOverride({
      key: `${initialTargetMode}:${initialTargetOptions.length}`,
      index: Math.min(initialTargetOptions.length, Math.max(1, initialIndex)),
    });
  }

  // Tracks the setInterval id for an arrow key currently held down, so
  // scrubbing continues at a steady rate until that key is released,
  // regardless of which control within the panel has focus.
  const heldStepIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (heldStepIntervalRef.current !== null) window.clearInterval(heldStepIntervalRef.current);
    };
  }, []);

  if (!hasBooks && !hasSeasons) return null;

  function handleModeChange(_event: unknown, next: TimelineMode | null) {
    if (next) setModeOverride(next);
  }

  function setIndex(next: number) {
    setIndexOverride({ key: optionsKey, index: Math.min(activeOptions.length, Math.max(1, next)) });
  }

  // Uses a functional update (rather than `setIndex(index + delta)`) so
  // repeated calls from a held-key interval each advance from the latest
  // index instead of the one captured when the key was first pressed.
  function step(delta: number) {
    setIndexOverride((prev) => {
      const current = prev?.key === optionsKey ? prev.index : Math.max(activeOptions.length, 1);
      return {
        key: optionsKey,
        index: Math.min(activeOptions.length, Math.max(1, current + delta)),
      };
    });
  }

  // Captured (rather than bubbled) so this runs before, and can suppress,
  // the Slider's own native arrow-key handling — otherwise a press while
  // the slider itself is focused would step twice: once from MUI's built-in
  // behavior and once from here.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    event.stopPropagation();
    if (event.repeat) return;

    if (heldStepIntervalRef.current !== null) window.clearInterval(heldStepIntervalRef.current);

    const delta = event.key === 'ArrowLeft' ? -1 : 1;
    step(delta);
    heldStepIntervalRef.current = window.setInterval(() => step(delta), HELD_KEY_STEP_INTERVAL_MS);
  }

  function handleKeyUp(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.stopPropagation();
    if (heldStepIntervalRef.current !== null) {
      window.clearInterval(heldStepIntervalRef.current);
      heldStepIntervalRef.current = null;
    }
  }

  const unitLabel = mode === 'book' ? 'Chapter' : 'Episode';
  const currentOption = activeOptions[index - 1] ?? null;
  // FlatOption.label leads with its own overall index (e.g. "12. AGOT:
  // Bran") for range summaries elsewhere; this control shows that index via
  // the slider itself, so it's stripped here to avoid showing it twice.
  const currentLabel = currentOption?.label.replace(/^\d+\.\s*/, '') ?? null;

  return (
    <Paper
      elevation={2}
      onKeyDownCapture={handleKeyDown}
      onKeyUpCapture={handleKeyUp}
      sx={{
        position: 'absolute',
        top: 10,
        left: 52,
        zIndex: 1000,
        width: 260,
        p: 0.5,
      }}
    >
      {heading && (
        <Typography variant="caption" sx={{ display: 'block', px: 0.5, pt: 0.5, fontWeight: 500 }}>
          {heading}
        </Typography>
      )}
      <Box
        sx={{
          display: 'flex',
          gap: 0.5,
          backgroundColor: (theme) => alpha(theme.palette.info.light, 0.08),
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
            aria-label={unitLabel}
            sx={{ mx: 1, width: 'auto' }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title={`Previous ${unitLabel}`}>
              <span>
                <IconButton
                  size="small"
                  onClick={() => step(-1)}
                  disabled={index <= 1}
                  aria-label={`Previous ${unitLabel}`}
                >
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

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

            <Tooltip title={`Next ${unitLabel}`}>
              <span>
                <IconButton
                  size="small"
                  onClick={() => step(1)}
                  disabled={index >= activeOptions.length}
                  aria-label={`Next ${unitLabel}`}
                >
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}
