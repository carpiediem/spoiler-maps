import { createTheme, type Theme, type ThemeOptions } from '@mui/material';
import { PALETTES } from './lib/palettes';

const baseThemeOptions: ThemeOptions = {
  palette: {
    primary: {
      main: '#2563eb',
    },
  },
};

export const theme = createTheme(baseThemeOptions);

/**
 * Merges a named palette (see lib/palettes.ts) onto the base theme; a null or
 * unrecognized key falls back to it unchanged. Built from the base's raw
 * ThemeOptions (not the already-processed `theme`) — createTheme only
 * derives a color's light/dark/contrastText from `main` via augmentColor
 * when they're absent, so merging onto an already-processed Theme would
 * leave those shades stale (e.g. a correct button background but a hover
 * state still tinted by the old palette).
 */
export function buildStoryTheme(paletteKey: string | null): Theme {
  const palette = paletteKey ? PALETTES[paletteKey]?.palette : undefined;
  if (!palette) return theme;
  return createTheme({
    ...baseThemeOptions,
    palette: { ...baseThemeOptions.palette, ...palette },
  });
}
