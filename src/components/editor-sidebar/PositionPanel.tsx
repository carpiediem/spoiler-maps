import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RouteIcon from '@mui/icons-material/Route';
import {
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import {
  createCharacterPosition,
  updateCharacterPosition,
  type CharacterPosition,
  type LatLng,
} from '../../db';
import { useRangeOptions, type FlatOption } from './characters/rangeOptions';

const OPEN_END_VALUE = '';

interface RangeSelectProps {
  label: string;
  options: FlatOption[];
  value: number | null;
  onChange: (value: number | null) => void;
}

function RangeSelect({ label, options, value, onChange }: RangeSelectProps) {
  const labelId = `${label.replace(/\s+/g, '-').toLowerCase()}-label`;

  function handleChange(event: SelectChangeEvent) {
    onChange(event.target.value === OPEN_END_VALUE ? null : Number(event.target.value));
  }

  return (
    <FormControl size="small" fullWidth>
      <InputLabel id={labelId} shrink>
        {label}
      </InputLabel>
      <Select
        labelId={labelId}
        label={label}
        value={value === null ? OPEN_END_VALUE : String(value)}
        onChange={handleChange}
        displayEmpty
      >
        <MenuItem value={OPEN_END_VALUE}>
          <em>Open</em>
        </MenuItem>
        {options.map((option) => (
          <MenuItem key={option.id} value={String(option.id)}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

interface PositionPanelProps {
  storyId: number;
  characterId: number;
  /** 1-based ordinal of this position among the character's positions. */
  index: number;
  position: LatLng | null;
  /** The CharacterPosition being edited, or null when creating a new one. */
  existingPosition: CharacterPosition | null;
  onBack: () => void;
  /** Whether the map is currently in tail-drawing mode. */
  isDrawingTail: boolean;
  /** Points clicked so far while drawing a tail. */
  tailDraftPoints: LatLng[];
  onStartDrawingTail: () => void;
  /** Called when Save or Cancel is clicked, to leave drawing mode either way. */
  onFinishDrawingTail: () => void;
}

export function PositionPanel({
  storyId,
  characterId,
  index,
  position,
  existingPosition,
  onBack,
  isDrawingTail,
  tailDraftPoints,
  onStartDrawingTail,
  onFinishDrawingTail,
}: PositionPanelProps) {
  const { chapterOptions, episodeOptions, hasBooks, hasSeasons } = useRangeOptions(storyId);

  const [chapterRangeStart, setChapterRangeStart] = useState<number | null>(
    existingPosition?.chapterRange?.startChapterId ?? null,
  );
  const [chapterRangeEnd, setChapterRangeEnd] = useState<number | null>(
    existingPosition?.chapterRange?.endChapterId ?? null,
  );
  const [episodeRangeStart, setEpisodeRangeStart] = useState<number | null>(
    existingPosition?.episodeRange?.startEpisodeId ?? null,
  );
  const [episodeRangeEnd, setEpisodeRangeEnd] = useState<number | null>(
    existingPosition?.episodeRange?.endEpisodeId ?? null,
  );
  const [dead, setDead] = useState(existingPosition?.dead ?? false);
  const [note, setNote] = useState(existingPosition?.note ?? '');
  const [tail, setTail] = useState<LatLng[] | null>(existingPosition?.tail ?? null);

  // The pin starts at the map's current center (or the existing position's
  // lat/lng, when editing); nothing is saved until the user actually drags
  // it away from that starting point. Captured once on mount (a fresh
  // PositionPanel instance per opening) so later renders can tell "the
  // marker moved" apart from "the panel re-rendered".
  const initialPositionRef = useRef(position);
  // Set immediately when editing an existing position, or once a new one is
  // first created, so later field/marker changes update it instead of
  // creating another one. A ref (not state) so setting it doesn't itself
  // trigger another save via the effect below.
  const savedPositionIdRef = useRef<number | null>(existingPosition?.id ?? null);
  // Skips this effect's very first run when opening an existing position —
  // nothing has changed yet, so there's nothing worth writing back.
  const hasRunEffectRef = useRef(false);

  useEffect(() => {
    if (position === null) return;
    const chapterRange = { startChapterId: chapterRangeStart, endChapterId: chapterRangeEnd };
    const episodeRange = { startEpisodeId: episodeRangeStart, endEpisodeId: episodeRangeEnd };
    const trimmedNote = note.trim() || null;

    if (!hasRunEffectRef.current) {
      hasRunEffectRef.current = true;
      if (savedPositionIdRef.current !== null) return;
    }

    if (savedPositionIdRef.current !== null) {
      updateCharacterPosition(savedPositionIdRef.current, {
        characterId,
        position,
        dead,
        note: trimmedNote,
        tail,
        chapterRange,
        episodeRange,
      });
      return;
    }

    if (position === initialPositionRef.current) return;

    createCharacterPosition({
      characterId,
      position,
      dead,
      note: trimmedNote,
      tail,
      chapterRange,
      episodeRange,
    }).then((created) => {
      savedPositionIdRef.current = created.id;
    });
  }, [
    characterId,
    position,
    chapterRangeStart,
    chapterRangeEnd,
    episodeRangeStart,
    episodeRangeEnd,
    dead,
    note,
    tail,
  ]);

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <IconButton size="small" aria-label="Back to sidebar" onClick={onBack}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
          Position {index}
        </Typography>
      </Stack>

      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Typography variant="body2" color="text.secondary">
          {position
            ? `${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`
            : 'Drag the pin on the map to set a position.'}
        </Typography>

        {isDrawingTail ? (
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              onClick={() => {
                setTail(tailDraftPoints);
                onFinishDrawingTail();
              }}
            >
              Save
            </Button>
            <Button size="small" onClick={onFinishDrawingTail}>
              Cancel
            </Button>
          </Stack>
        ) : (
          <Tooltip title="Add a tail">
            <span>
              <IconButton
                size="small"
                aria-label="Add a tail"
                onClick={onStartDrawingTail}
                disabled={position === null}
              >
                <RouteIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Stack>

      <TextField
        label="Note"
        size="small"
        fullWidth
        multiline
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />

      {hasBooks && (
        <Stack spacing={1.5}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Chapter Range
          </Typography>
          <RangeSelect
            label="Start Chapter"
            options={chapterOptions}
            value={chapterRangeStart}
            onChange={setChapterRangeStart}
          />
          <RangeSelect
            label="End Chapter"
            options={chapterOptions}
            value={chapterRangeEnd}
            onChange={setChapterRangeEnd}
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
            value={episodeRangeStart}
            onChange={setEpisodeRangeStart}
          />
          <RangeSelect
            label="End Episode"
            options={episodeOptions}
            value={episodeRangeEnd}
            onChange={setEpisodeRangeEnd}
          />
        </Stack>
      )}

      <FormControlLabel
        control={<Checkbox checked={dead} onChange={(event) => setDead(event.target.checked)} />}
        label="Dead"
      />
    </Stack>
  );
}
