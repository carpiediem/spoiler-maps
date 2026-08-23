import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import type { ReactNode, SyntheticEvent } from 'react';

/** This section header's rendered height, so a nested sticky header (e.g. CharacterItem's) can offset below it instead of overlapping it. */
export const SIDEBAR_SECTION_HEADER_HEIGHT = 48;

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
      slotProps={{
        // The heading (h3) slot, not AccordionSummary itself, is what wraps
        // the header at the DOM level, so it's what needs position: sticky
        // for the whole header to stay pinned. The opaque background goes
        // on AccordionSummary below instead — Chromium doesn't reliably
        // composite a sticky element's own background above unrelated
        // scrolled content otherwise (verified: background here alone left
        // scrolled-past content, e.g. an expanded form's floating labels,
        // visibly bleeding through).
        heading: {
          sx: {
            position: 'sticky',
            top: 0,
            // Above 1: MUI's own floating input labels (e.g. inside an
            // expanded character's form fields) use z-index: 1, and being
            // later in DOM order, could otherwise tie and win the paint
            // order against this header as it scrolls past them.
            zIndex: 2,
          },
        },
      }}
      sx={{ boxShadow: 'none', '&::before': { display: 'none' } }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={`${id}-content`}
        id={`${id}-header`}
        sx={{
          backgroundColor: 'grey.100',
          px: 1,
          minHeight: 40,
          '&.Mui-expanded': { minHeight: 40 },
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
