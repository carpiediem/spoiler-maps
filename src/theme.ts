import { createTheme, type Theme } from '@mui/material';
import { PALETTES } from './lib/palettes';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#2563eb',
    },
  },
});

/** Merges a named palette (see lib/palettes.ts) onto the base theme; a null or unrecognized key falls back to it unchanged. */
export function buildStoryTheme(paletteKey: string | null): Theme {
  const palette = paletteKey ? PALETTES[paletteKey]?.palette : undefined;
  return palette ? createTheme(theme, { palette }) : theme;
}
