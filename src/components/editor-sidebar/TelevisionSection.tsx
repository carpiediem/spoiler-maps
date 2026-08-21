import AddIcon from '@mui/icons-material/Add';
import { Button, Stack, Typography } from '@mui/material';
import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
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
  const [seasons, setSeasons] = useState<TvSeason[] | null>(null);
  const [episodesBySeasonId, setEpisodesBySeasonId] = useState<Record<number, Episode[]>>({});
  const [expandedSeasonId, setExpandedSeasonId] = useState<number | null>(null);
  const appliedInitialIndexRef = useRef(false);

  useEffect(() => {
    if (seasons !== null) onCountChange?.(seasons.length);
  }, [seasons, onCountChange]);

  useEffect(() => {
    let cancelled = false;

    function resetForNewStory() {
      setSeasons(null);
      setExpandedSeasonId(null);
      appliedInitialIndexRef.current = false;
    }
    resetForNewStory();

    listTvSeasonsForStory(storyId).then(async (loadedSeasons) => {
      if (cancelled) return;
      const episodeLists = await Promise.all(
        loadedSeasons.map((season) => listEpisodesForSeason(season.id)),
      );
      /* v8 ignore next -- exercising this specific unmount window (after listTvSeasonsForStory resolves but before the episode Promise.all does) is too timing-dependent to test reliably; the outer cancelled check above covers the same defensive purpose. */
      if (cancelled) return;

      setSeasons(loadedSeasons);
      const episodeMap: Record<number, Episode[]> = {};
      loadedSeasons.forEach((season, index) => {
        episodeMap[season.id] = episodeLists[index];
      });
      setEpisodesBySeasonId(episodeMap);
    });

    return () => {
      cancelled = true;
    };
  }, [storyId]);

  useEffect(() => {
    function applyInitialExpandedIndex() {
      if (seasons === null || appliedInitialIndexRef.current) return;
      appliedInitialIndexRef.current = true;
      const targetSeason = initialExpandedIndex ? seasons[initialExpandedIndex - 1] : undefined;
      if (targetSeason) setExpandedSeasonId(targetSeason.id);
    }
    applyInitialExpandedIndex();
  }, [seasons, initialExpandedIndex]);

  // Only reachable once seasons have loaded: the Loading/Add Season UI below
  // only renders handleAddSeason's/handleSeasonChange's callers (the Add
  // Season button, SeasonItem) after the `seasons === null` early return.
  async function handleAddSeason() {
    const sortOrder = sortOrderAfter(seasons!.map((season) => season.sortOrder));
    const season = await createTvSeason({ storyId, url: null, sortOrder });
    setSeasons((previous) => [...previous!, season]);
    setEpisodesBySeasonId((previous) => ({ ...previous, [season.id]: [] }));
    setExpandedSeasonId(season.id);
  }

  function handleSeasonChange(updated: TvSeason) {
    setSeasons((previous) =>
      previous!.map((season) => (season.id === updated.id ? updated : season)),
    );
  }

  function handleEpisodesChange(seasonId: number, episodes: Episode[]) {
    setEpisodesBySeasonId((previous) => ({ ...previous, [seasonId]: episodes }));
  }

  // Only reachable while seasonId is the expanded season: the Delete Season
  // button that triggers this only renders inside that season's own
  // AccordionDetails.
  async function handleDeleteSeason(seasonId: number) {
    await deleteTvSeason(seasonId);
    setSeasons((previous) => previous!.filter((season) => season.id !== seasonId));
    setEpisodesBySeasonId((previous) => {
      const next = { ...previous };
      delete next[seasonId];
      return next;
    });
    setExpandedSeasonId(null);
  }

  function handleToggle(seasonId: number) {
    return (_event: SyntheticEvent, isExpanded: boolean) => {
      setExpandedSeasonId(isExpanded ? seasonId : null);
    };
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
          onToggle={handleToggle(season.id)}
          onSeasonChange={handleSeasonChange}
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
