import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState, type SyntheticEvent } from 'react';
import {
  createEpisode,
  deleteEpisode,
  updateEpisode,
  updateTvSeason,
  type Episode,
  type TvSeason,
} from '../../../db';
import { DeleteConfirmDialog } from '../DeleteConfirmDialog';
import { EntryEditorDialog } from '../EntryEditorDialog';
import { EntryList } from '../EntryList';

interface SeasonItemProps {
  season: TvSeason;
  /** 0-based position within the story's season list, for the "Season N" label. */
  index: number;
  episodes: Episode[];
  expanded: boolean;
  onToggle: (event: SyntheticEvent, isExpanded: boolean) => void;
  onSeasonChange: (season: TvSeason) => void;
  onEpisodesChange: (episodes: Episode[]) => void;
  onDelete: () => void;
}

export function SeasonItem({
  season,
  index,
  episodes,
  expanded,
  onToggle,
  onSeasonChange,
  onEpisodesChange,
  onDelete,
}: SeasonItemProps) {
  const [isEpisodesDialogOpen, setIsEpisodesDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const seasonLabel = `Season ${index + 1}`;

  function handleUrlChange(value: string) {
    onSeasonChange({ ...season, url: value || null });
  }

  async function handleBlur() {
    await updateTvSeason(season.id, {
      storyId: season.storyId,
      url: season.url,
      sortOrder: season.sortOrder,
    });
  }

  return (
    <Accordion
      expanded={expanded}
      onChange={onToggle}
      disableGutters
      elevation={0}
      square
      sx={{
        boxShadow: 'none',
        '&::before': { display: 'none' },
        borderRadius: 1,
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{ backgroundColor: 'rgba(0, 0, 0, .03)', px: 1, minHeight: 40 }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {seasonLabel}
          </Typography>
          <Tooltip
            title={`${episodes.length} ${episodes.length === 1 ? 'episode' : 'episodes'}`}
            arrow
          >
            <Chip label={episodes.length} size="small" variant="outlined" />
          </Tooltip>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 1, backgroundColor: 'rgba(0, 0, 0, .015)' }}>
        <Stack spacing={1.5}>
          <TextField
            label="URL"
            size="small"
            fullWidth
            value={season.url ?? ''}
            onChange={(event) => handleUrlChange(event.target.value)}
            onBlur={handleBlur}
            sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
            slotProps={{
              input: {
                endAdornment: season.url && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      aria-label="Open URL"
                      href={season.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      edge="end"
                    >
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          <Button size="small" onClick={() => setIsEpisodesDialogOpen(true)} fullWidth>
            Edit Episodes
          </Button>
          <Button size="small" color="error" onClick={() => setIsDeleteConfirmOpen(true)} fullWidth>
            Delete Season
          </Button>
        </Stack>
      </AccordionDetails>

      <EntryEditorDialog
        open={isEpisodesDialogOpen}
        onClose={() => setIsEpisodesDialogOpen(false)}
        title={`${seasonLabel} — Episodes`}
      >
        <EntryList
          items={episodes}
          onItemsChange={onEpisodesChange}
          onCreate={(sortOrder) =>
            createEpisode({ seasonId: season.id, name: '', url: null, sortOrder })
          }
          onUpdate={(episode) =>
            updateEpisode(episode.id, {
              seasonId: episode.seasonId,
              name: episode.name,
              url: episode.url,
              sortOrder: episode.sortOrder,
            })
          }
          onDelete={deleteEpisode}
          nameColumnLabel="Title"
          namePlaceholder="Episode name"
          urlPlaceholder="Episode Wiki URL"
          addLabel="Add Episode"
          deleteLabel="Delete episode"
        />
      </EntryEditorDialog>

      <DeleteConfirmDialog
        open={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => {
          setIsDeleteConfirmOpen(false);
          onDelete();
        }}
        title={`Delete “${seasonLabel}”?`}
        description={
          episodes.length === 0
            ? 'This will permanently delete the season. This can’t be undone.'
            : `This will permanently delete the season and all ${episodes.length} of its ${episodes.length === 1 ? 'episode' : 'episodes'}. This can’t be undone.`
        }
      />
    </Accordion>
  );
}
