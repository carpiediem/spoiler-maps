import AddIcon from '@mui/icons-material/Add';
import { Button, Stack, Typography } from '@mui/material';
import { useCallback, useState } from 'react';
import {
  createTvSeason,
  deleteTvSeason,
  listEpisodesForSeason,
  listTvSeasonsForStory,
  type Episode,
  type TvSeason,
} from '../../db';
import { sortOrderAfter } from '../../db/ordering';
import { SeasonItem } from './television/SeasonItem';
import { useExpandableEntityList } from './useExpandableEntityList';

interface TelevisionSectionProps {
  storyId: number;
  /** 1-based index of the season to auto-expand, e.g. from a #television-1 URL hash. */
  initialExpandedIndex?: number | null;
  onCountChange?: (count: number) => void;
}

export function TelevisionSection({
  storyId,
  initialExpandedIndex,
  onCountChange,
}: TelevisionSectionProps) {
  const [episodesBySeasonId, setEpisodesBySeasonId] = useState<Record<number, Episode[]>>({});

  const load = useCallback(async (storyId: number, isCancelled: () => boolean) => {
    const loadedSeasons = await listTvSeasonsForStory(storyId);
    if (isCancelled()) return loadedSeasons;
    const episodeLists = await Promise.all(
      loadedSeasons.map((season) => listEpisodesForSeason(season.id)),
    );
    /* v8 ignore next -- exercising this specific unmount window (after listTvSeasonsForStory resolves but before the episode Promise.all does) is too timing-dependent to test reliably; the outer isCancelled() check above covers the same defensive purpose. */
    if (isCancelled()) return loadedSeasons;

    const episodeMap: Record<number, Episode[]> = {};
    loadedSeasons.forEach((season, index) => {
      episodeMap[season.id] = episodeLists[index];
    });
    setEpisodesBySeasonId(episodeMap);
    return loadedSeasons;
  }, []);

  const onReset = useCallback(() => setEpisodesBySeasonId({}), []);

  const {
    entities: seasons,
    expandedId: expandedSeasonId,
    toggle,
    addEntity,
    updateEntity,
    removeEntity,
  } = useExpandableEntityList<TvSeason>({
    storyId,
    initialExpandedIndex,
    onCountChange,
    load,
    onReset,
  });

  // Only reachable once seasons have loaded: the Loading/Add Season UI below
  // only renders handleAddSeason's/handleSeasonChange's callers (the Add
  // Season button, SeasonItem) after the `seasons === null` early return.
  async function handleAddSeason() {
    const sortOrder = sortOrderAfter(seasons!.map((season) => season.sortOrder));
    const season = await createTvSeason({ storyId, url: null, sortOrder });
    addEntity(season);
    setEpisodesBySeasonId((previous) => ({ ...previous, [season.id]: [] }));
  }

  function handleEpisodesChange(seasonId: number, episodes: Episode[]) {
    setEpisodesBySeasonId((previous) => ({ ...previous, [seasonId]: episodes }));
  }

  // Only reachable while seasonId is the expanded season: the Delete Season
  // button that triggers this only renders inside that season's own
  // AccordionDetails.
  async function handleDeleteSeason(seasonId: number) {
    await deleteTvSeason(seasonId);
    removeEntity(seasonId);
    setEpisodesBySeasonId((previous) => {
      const next = { ...previous };
      delete next[seasonId];
      return next;
    });
  }

  if (seasons === null) {
    return (
      <Typography variant="body2" color="text.secondary">
        Loading television seasons…
      </Typography>
    );
  }

  return (
    <Stack spacing={1}>
      {seasons.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No television seasons yet.
        </Typography>
      )}

      {seasons.map((season, index) => (
        <SeasonItem
          key={season.id}
          season={season}
          index={index}
          episodes={episodesBySeasonId[season.id]}
          expanded={expandedSeasonId === season.id}
          onToggle={toggle(season.id)}
          onSeasonChange={updateEntity}
          onEpisodesChange={(episodes) => handleEpisodesChange(season.id, episodes)}
          onDelete={() => handleDeleteSeason(season.id)}
        />
      ))}

      <Button size="small" startIcon={<AddIcon fontSize="small" />} onClick={handleAddSeason}>
        Add Season
      </Button>
    </Stack>
  );
}
