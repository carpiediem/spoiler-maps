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
        // the header at the DOM level — sticking that (with an opaque
        // background, so scrolled content doesn't show through) is what
        // keeps the whole header visually pinned, not just the button.
        heading: {
          sx: {
            position: 'sticky',
            top: 0,
            zIndex: 1,
            backgroundColor: 'grey.100',
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
