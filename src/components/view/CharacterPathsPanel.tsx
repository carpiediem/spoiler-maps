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
import type { StoryDocumentCharacter } from '../../lib/storyDocument';

interface CharacterPathsPanelProps {
  characters: StoryDocumentCharacter[];
  checkedIndices: Set<number>;
  onCheckedIndicesChange: (next: Set<number>) => void;
  showFullPath: boolean;
  onShowFullPathChange: (next: boolean) => void;
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
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
        <Checkbox
          checked={allChecked}
          indeterminate={someChecked}
          onChange={handleToggleAll}
          disabled={characters.length === 0}
          slotProps={{ input: { 'aria-label': 'Toggle all characters' } }}
          size="small"
        />
        <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 600 }}>
          Character Paths
        </Typography>
        <Tooltip title={showFullPath ? 'Show full path' : 'Current locations only'} arrow>
          <IconButton
            size="small"
            aria-label={showFullPath ? 'Show full path' : 'Current locations only'}
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
            const name = character.name || 'Unnamed Character';
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
                    src={character.icon ?? undefined}
                    alt={name}
                    sx={{
                      width: 24,
                      height: 24,
                      bgcolor: character.color ?? 'grey.400',
                      border: 1,
                      borderColor: 'divider',
                    }}
                  />
                </ListItemAvatar>
                <ListItemText
                  primary={
                    character.url ? (
                      <Link href={character.url} target="_blank" rel="noopener noreferrer">
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
