import AddIcon from '@mui/icons-material/Add';
import {
  Avatar,
  Box,
  Button,
  FormControl,
  InputLabel,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  useTheme,
} from '@mui/material';
import { useMemo } from 'react';
import type { CharacterPosition } from '../../../db';
import { makeTimelineVisibilityChecker } from '../../../lib/timelineVisibility';
import type { TimelineMode } from '../../MapTimelineControl';
import { PositionRangeSummaryView } from './PositionRangeSummaryView';
import { summarizePositionRange, useRangeOptions } from './rangeOptions';

interface PositionListProps {
  storyId: number;
  positions: CharacterPosition[] | null;
  characterColor: string;
  /** The map timeline control's current mode, used to tell which positions it currently shows on the map. */
  timelineMode: TimelineMode;
  /** The map timeline control's current scrub position (a flat 1-based chapter/episode index). */
  timelineIndex: number;
  /** Called with the 1-based index the new position would have when "+ Position" is clicked. */
  onAddPosition: (index: number) => void;
  /** Called with (position, 1-based index) when an existing position is clicked. */
  onEditPosition: (position: CharacterPosition, index: number) => void;
}

/** A character's saved positions, each shown as a numbered avatar reflecting
 * whether the map timeline has currently reached it. */
export function PositionList({
  storyId,
  positions,
  characterColor,
  timelineMode,
  timelineIndex,
  onAddPosition,
  onEditPosition,
}: PositionListProps) {
  const { chapterOptions, episodeOptions } = useRangeOptions(storyId);
  const theme = useTheme();
  const isPositionVisible = useMemo(
    () =>
      makeTimelineVisibilityChecker(timelineMode, timelineIndex, chapterOptions, episodeOptions),
    [timelineMode, timelineIndex, chapterOptions, episodeOptions],
  );

  return (
    <FormControl
      size="small"
      fullWidth
      sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mt: 1 }}
    >
      <InputLabel shrink sx={{ px: 0.5, ml: 0.5, backgroundColor: 'background.paper' }}>
        Route
      </InputLabel>
      {/* Clips the list/button to the FormControl's rounded corners,
          separately from the label above, which pokes above this box
          and would otherwise get clipped along with them. */}
      <Box sx={{ borderRadius: 1, overflow: 'hidden' }}>
        {!!positions?.length && (
          <List dense disablePadding>
            {positions.map((position, positionIndex) => {
              const isVisibleOnMap = isPositionVisible(position);
              return (
                <ListItemButton
                  key={position.id}
                  onClick={() => onEditPosition(position, positionIndex + 1)}
                  sx={{ py: 0.5 }}
                >
                  <ListItemAvatar sx={{ minWidth: 32 }}>
                    <Avatar
                      sx={{
                        width: 22,
                        height: 22,
                        fontSize: '0.75rem',
                        ...(isVisibleOnMap
                          ? {
                              bgcolor: characterColor,
                              color: theme.palette.getContrastText(characterColor),
                            }
                          : {
                              bgcolor: 'transparent',
                              color: characterColor,
                              border: 1,
                              borderColor: characterColor,
                            }),
                      }}
                    >
                      {positionIndex + 1}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      position.note ||
                      `${position.position.lat.toFixed(4)}, ${position.position.lng.toFixed(4)}`
                    }
                    secondary={
                      <PositionRangeSummaryView
                        summary={summarizePositionRange(
                          position.chapterRange,
                          position.episodeRange,
                          chapterOptions,
                          episodeOptions,
                        )}
                      />
                    }
                    slotProps={{
                      primary: { variant: 'body2' },
                      secondary: { component: 'span' },
                    }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        )}
        <Button
          size="small"
          startIcon={<AddIcon fontSize="small" />}
          // Only reachable once positions have loaded: disabled below
          // while it's still null.
          onClick={() => onAddPosition(positions!.length + 1)}
          disabled={positions === null}
          fullWidth
          sx={{ borderRadius: 0 }}
        >
          Position
        </Button>
      </Box>
    </FormControl>
  );
}
