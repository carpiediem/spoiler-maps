import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  Checkbox,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';
import { useState } from 'react';
import type { LatLng } from '../../db';
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
  /** 1-based ordinal of this position among the character's positions. */
  index: number;
  position: LatLng | null;
  onBack: () => void;
}

export function PositionPanel({ storyId, index, position, onBack }: PositionPanelProps) {
  const { chapterOptions, episodeOptions, hasBooks, hasSeasons } = useRangeOptions(storyId);

  const [chapterRangeStart, setChapterRangeStart] = useState<number | null>(null);
  const [chapterRangeEnd, setChapterRangeEnd] = useState<number | null>(null);
  const [episodeRangeStart, setEpisodeRangeStart] = useState<number | null>(null);
  const [episodeRangeEnd, setEpisodeRangeEnd] = useState<number | null>(null);
  const [dead, setDead] = useState(false);

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

      <Typography variant="body2" color="text.secondary">
        {position
          ? `${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`
          : 'Drag the pin on the map to set a position.'}
      </Typography>

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
