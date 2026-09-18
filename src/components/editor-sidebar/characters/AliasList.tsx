import AddIcon from '@mui/icons-material/Add';
import { Box, Button, FormControl, InputLabel, Stack, Typography } from '@mui/material';
import type { SyntheticEvent } from 'react';
import type { CharacterAlias } from '../../../db';
import { AliasItem } from './AliasItem';
import { useRangeOptions } from './rangeOptions';

interface AliasListProps {
  storyId: number;
  characterId: number;
  aliases: CharacterAlias[] | null;
  expandedAliasId: number | null;
  onToggle: (
    characterId: number,
    aliasId: number,
    event: SyntheticEvent,
    isExpanded: boolean,
  ) => void;
  onAliasChange: (characterId: number, alias: CharacterAlias) => void;
  onDelete: (characterId: number, aliasId: number) => void;
  onAddAlias: (characterId: number) => void;
}

/**
 * A character's alternate identities for part of the story (e.g.
 * introduced in disguise), styled to match PositionList's bordered "Route"
 * box — labeled "Aliases" instead, with each alias as its own accordion
 * (Name/Group/Color/Icon URL/URL plus chapter/episode ranges) rather than a
 * flat list, since an alias has several fields worth editing at once.
 */
export function AliasList({
  storyId,
  characterId,
  aliases,
  expandedAliasId,
  onToggle,
  onAliasChange,
  onDelete,
  onAddAlias,
}: AliasListProps) {
  const { chapterOptions, episodeOptions, hasBooks, hasSeasons } = useRangeOptions(storyId);

  return (
    <FormControl
      size="small"
      fullWidth
      sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mt: 1 }}
    >
      <InputLabel shrink sx={{ px: 0.5, ml: 0.5, backgroundColor: 'background.paper' }}>
        Aliases
      </InputLabel>
      {/* See PositionList's identical comment: clips the list/button to the
          FormControl's rounded corners, separately from the label above. */}
      <Box sx={{ borderRadius: 1, overflow: 'hidden' }}>
        {!aliases?.length && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, py: 1 }}>
            No aliases yet.
          </Typography>
        )}
        {!!aliases?.length && (
          <Stack spacing={0.5} sx={{ p: 0.5 }}>
            {aliases.map((alias) => (
              <AliasItem
                key={alias.id}
                characterId={characterId}
                alias={alias}
                expanded={expandedAliasId === alias.id}
                onToggle={onToggle}
                onAliasChange={onAliasChange}
                onDelete={onDelete}
                chapterOptions={chapterOptions}
                episodeOptions={episodeOptions}
                hasBooks={hasBooks}
                hasSeasons={hasSeasons}
              />
            ))}
          </Stack>
        )}
        <Button
          size="small"
          startIcon={<AddIcon fontSize="small" />}
          onClick={() => onAddAlias(characterId)}
          disabled={aliases === null}
          fullWidth
          sx={{ borderRadius: 0 }}
        >
          Add Alias
        </Button>
      </Box>
    </FormControl>
  );
}
