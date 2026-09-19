import { CircularProgress, Stack, Typography } from '@mui/material';

/** The placeholder a lazily-mounted sidebar section shows while its data loads, so an expanded section never looks empty. */
export function SectionLoading({ children }: { children: string }) {
  return (
    <Stack direction="row" spacing={1} role="status" sx={{ alignItems: 'center', py: 1 }}>
      {/* Decorative: the adjacent text already announces what's loading. */}
      <CircularProgress size={16} aria-hidden="true" />
      <Typography variant="body2" color="text.secondary">
        {children}
      </Typography>
    </Stack>
  );
}
