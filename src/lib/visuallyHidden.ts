import type { SxProps, Theme } from '@mui/material';

/** Keeps content available to screen readers/accessibility tooling without showing it visually. */
export const visuallyHidden: SxProps<Theme> = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};
