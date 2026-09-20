import { FormControl, InputLabel, MenuItem, Select, type SelectChangeEvent } from '@mui/material';
import type { FlatOption } from '../../lib/rangeOptions';

const OPEN_END_VALUE = '';

interface RangeSelectProps {
  label: string;
  options: FlatOption[];
  value: number | null;
  onChange: (value: number | null) => void;
}

/** One Start/End Chapter or Episode boundary picker — shared by the Position form, alias editing, and marker editing. */
export function RangeSelect({ label, options, value, onChange }: RangeSelectProps) {
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
