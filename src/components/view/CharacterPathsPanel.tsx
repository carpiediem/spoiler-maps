import RoomOutlinedIcon from '@mui/icons-material/RoomOutlined';
import RouteOutlinedIcon from '@mui/icons-material/RouteOutlined';
import {
  Avatar,
  Checkbox,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import type { TimelineMode } from '../MapTimelineControl';
import type { StoryDocumentCharacter } from '../../lib/storyDocument';
import { isPositionVisible } from '../../lib/viewTimeline';

interface CharacterPathsPanelProps {
  characters: StoryDocumentCharacter[];
  checkedIndices: Set<number>;
  onCheckedIndicesChange: (next: Set<number>) => void;
  showFullPath: boolean;
  onShowFullPathChange: (next: boolean) => void;
  /** The map timeline control's current mode and scrub position, used to tell which alias (if any) is currently active for each character. */
  timelineMode: TimelineMode;
  timelineIndex: number;
}

/**
 * The view screen's sidebar: a checkbox per character (all off by default)
 * to toggle their positions on the map, a select-all control, and a toggle
 * for whether a checked character's full path (not just its current
 * location) is drawn.
 */
export function CharacterPathsPanel({
  characters,
  checkedIndices,
  onCheckedIndicesChange,
  showFullPath,
  onShowFullPathChange,
  timelineMode,
  timelineIndex,
}: CharacterPathsPanelProps) {
  const allChecked = characters.length > 0 && checkedIndices.size === characters.length;
  const someChecked = checkedIndices.size > 0 && !allChecked;

  function handleToggleAll() {
    onCheckedIndicesChange(
      allChecked ? new Set() : new Set(characters.map((_character, index) => index)),
    );
  }

  function handleToggleOne(index: number) {
    const next = new Set(checkedIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    onCheckedIndicesChange(next);
  }

  return (
    <Paper
      component="aside"
      elevation={4}
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1000,
        width: 280,
        maxHeight: 'calc(100vh - 32px)',
        overflowY: 'auto',
        p: 2,
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          mb: 1,
          position: 'sticky',
          top: 0,
          // MUI's Checkbox hardcodes z-index: 1 on its own internal <input>
          // (see @mui/material/internal/SwitchBase), and none of the List/
          // ListItem/checkbox wrapper elements below establish their own
          // stacking context — so that input's z-index is compared directly
          // against this row's here. z-index: 1 here would tie with it, and
          // ties resolve in DOM order, which favors the List (it renders
          // after this row) — so a click where the two visually overlap
          // during a scroll would hit the character's checkbox underneath
          // instead of this row's. zIndex: 2 wins outright.
          zIndex: 2,
          // A dedicated stacking context, so this row's z-index is compared
          // as a single unit against the list instead of leaking past it.
          isolation: 'isolate',
          // Opaque, matching the Paper's own background — otherwise the
          // list below shows through as it scrolls past this header.
          bgcolor: 'background.paper',
        }}
      >
        <Checkbox
          checked={allChecked}
          indeterminate={someChecked}
          onChange={handleToggleAll}
          disabled={characters.length === 0}
          slotProps={{ input: { 'aria-label': 'Toggle all characters' } }}
          size="small"
        />
        {/* One level under the page's own (visually hidden) <h1>. */}
        <Typography variant="subtitle1" component="h2" sx={{ flex: 1, fontWeight: 600 }}>
          Character Paths
        </Typography>
        <Tooltip title={showFullPath ? 'Current locations only' : 'Show full path'} arrow>
          <IconButton
            size="small"
            aria-label={showFullPath ? 'Current locations only' : 'Show full path'}
            onClick={() => onShowFullPathChange(!showFullPath)}
          >
            {showFullPath ? (
              <RoomOutlinedIcon fontSize="small" />
            ) : (
              <RouteOutlinedIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      </Stack>

      {characters.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          This map has no characters yet.
        </Typography>
      ) : (
        <List dense disablePadding>
          {characters.map((character, index) => {
            // The first alias (in array order) whose own chapter/episode
            // range is currently active, if any — matches
            // buildViewPinsAndTails's identical resolution for this
            // character's map pins, so the sidebar and the map always agree
            // on which identity is showing.
            const activeAlias = character.aliases?.find((alias) =>
              isPositionVisible(alias, timelineMode, timelineIndex),
            );
            const name = activeAlias?.name || character.name || 'Unnamed Character';
            const icon = activeAlias?.icon ?? character.icon;
            const color = activeAlias?.color ?? character.color;
            const url = activeAlias?.url ?? character.url;
            return (
              <ListItem key={index} disablePadding>
                <Checkbox
                  checked={checkedIndices.has(index)}
                  onChange={() => handleToggleOne(index)}
                  size="small"
                  slotProps={{ input: { 'aria-label': name } }}
                />
                <ListItemAvatar sx={{ minWidth: 0, mr: 1 }}>
                  <Avatar
                    src={icon ?? undefined}
                    alt={name}
                    sx={{
                      width: 24,
                      height: 24,
                      bgcolor: color ?? 'grey.400',
                      border: 1,
                      borderColor: 'divider',
                    }}
                  />
                </ListItemAvatar>
                <ListItemText
                  primary={
                    url ? (
                      <Link href={url} target="_blank" rel="noopener noreferrer">
                        {name}
                      </Link>
                    ) : (
                      name
                    )
                  }
                  slotProps={{ primary: { noWrap: true } }}
                />
              </ListItem>
            );
          })}
        </List>
      )}
    </Paper>
  );
}
