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
      sx={{ boxShadow: 'none', '&::before': { display: 'none' } }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={`${id}-content`}
        id={`${id}-header`}
        sx={{
          backgroundColor: 'rgba(0, 0, 0, .03)',
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
