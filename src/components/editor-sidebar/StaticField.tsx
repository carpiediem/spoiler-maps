import { FormControl, InputLabel } from '@mui/material';
import type { ReactNode } from 'react';

interface StaticFieldProps {
  label: string;
  /** Matches the `id` on whatever element within `children` represents this field's value, for label association. */
  htmlFor: string;
  children: ReactNode;
}

/** A form-field-styled label over arbitrary content (not an actual input) — e.g. a read-only value with an inline action button. */
export function StaticField({ label, htmlFor, children }: StaticFieldProps) {
  return (
    <FormControl fullWidth variant="outlined" size="small">
      <InputLabel
        shrink
        htmlFor={htmlFor}
        sx={{ position: 'static', transform: 'none', ml: '14px', fontSize: '0.75rem' }}
      >
        {label}
      </InputLabel>
      {children}
    </FormControl>
  );
}
