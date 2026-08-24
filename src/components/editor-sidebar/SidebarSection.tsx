import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { ReactNode, SyntheticEvent } from 'react';

/** This section header's rendered height, so a nested sticky header (e.g. CharacterItem's) can offset below it instead of overlapping it. */
export const SIDEBAR_SECTION_HEADER_HEIGHT = 48;

/**
 * Sticky z-index for this outer header — above MUI's own floating input
 * labels (z-index: 1), and above CharacterItem's own sticky header (which
 * uses one less than this), so this one stays on top when both are stuck
 * and stacked.
 */
export const SIDEBAR_SECTION_HEADER_Z_INDEX = 3;

interface SidebarSectionProps {
  id: string;
  title: string;
  /** Shown as a Chip next to the title when set, e.g. the number of books linked to the story. */
  count?: number;
  expanded: boolean;
  onChange: (event: SyntheticEvent, isExpanded: boolean) => void;
  children: ReactNode;
}

export function SidebarSection({
  id,
  title,
  count,
  expanded,
  onChange,
  children,
}: SidebarSectionProps) {
  return (
    <Accordion
      expanded={expanded}
      onChange={onChange}
      disableGutters
      elevation={0}
      square
      // MUI wraps AccordionSummary in an <h3> by default; this section
      // heading is one level under the page's own (visually hidden) <h1>,
      // so it should be an <h2> — the nested per-item accordions (BookItem/
      // SeasonItem/CharacterItem) keep the default <h3>, correctly one
      // level under this.
      slots={{ heading: 'h2' }}
      sx={{ boxShadow: 'none', '&::before': { display: 'none' } }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={`${id}-content`}
        id={`${id}-header`}
        sx={{
          backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.12),
          px: 1,
          minHeight: 40,
          '&.Mui-expanded': { minHeight: 40 },
          position: 'sticky',
          top: 0,
          zIndex: SIDEBAR_SECTION_HEADER_Z_INDEX,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography component="span" sx={{ fontWeight: 500 }}>
            {title}
          </Typography>
          {!!count && <Chip label={count} size="small" variant="outlined" />}
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 1 }}>{children}</AccordionDetails>
    </Accordion>
  );
}
