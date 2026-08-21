import MenuBookIcon from '@mui/icons-material/MenuBook';
import PersonalVideoIcon from '@mui/icons-material/PersonalVideo';
import { Box, Tooltip } from '@mui/material';
import type { ReactNode } from 'react';
import type { PositionRangeSummary, RangeSummaryPart } from './rangeOptions';

function RangeSummaryPartView({ icon, part }: { icon: ReactNode; part: RangeSummaryPart }) {
  return (
    <Tooltip title={part.fullLabel}>
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
        {icon}
        <span>{part.shortLabel}</span>
      </Box>
    </Tooltip>
  );
}

export function PositionRangeSummaryView({ summary }: { summary: PositionRangeSummary }) {
  if (!summary.chapters && !summary.episodes) return 'Always visible';

  return (
    <Box
      component="span"
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}
    >
      {summary.chapters && (
        <RangeSummaryPartView
          icon={<MenuBookIcon sx={{ fontSize: 14 }} />}
          part={summary.chapters}
        />
      )}
      {summary.episodes && (
        <RangeSummaryPartView
          icon={<PersonalVideoIcon sx={{ fontSize: 14 }} />}
          part={summary.episodes}
        />
      )}
    </Box>
  );
}
