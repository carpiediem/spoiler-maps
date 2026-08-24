import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import { alpha, styled } from '@mui/material/styles';
import type { ReactNode, SyntheticEvent } from 'react';

// MUI's own default Accordion heading wrapper (a plain 'h3') uses
// `all: unset` so it doesn't affect layout at all — critical here, since
// this wraps a position:sticky AccordionSummary, and a real <h2>'s UA
// default margin/display breaks that positioning. slots={{ heading: 'h2' }}
// replaces the wrapper entirely (losing that reset, not just the tag), so
// this mirrors it on the tag we actually want.
const SectionHeading = styled('h2')({ all: 'unset' });

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
      slots={{ heading: SectionHeading }}
      sx={{ boxShadow: 'none', '&::before': { display: 'none' } }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={`${id}-content`}
        id={`${id}-header`}
        sx={{
          // An opaque base with the tint layered on top as a flat-color
          // background-image, not just a translucent backgroundColor —
          // this row is position: sticky, so a translucent color alone
          // would let whatever's scrolled underneath show through it.
          backgroundColor: 'background.paper',
          backgroundImage: (theme) =>
            `linear-gradient(${alpha(theme.palette.primary.main, 0.12)}, ${alpha(theme.palette.primary.main, 0.12)})`,
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
