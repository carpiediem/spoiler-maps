import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  Checkbox,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';
import { useEffect, useState } from 'react';
import {
  listBooksForStory,
  listChaptersForBook,
  listEpisodesForSeason,
  listTvSeasonsForStory,
  type Book,
  type Chapter,
  type Episode,
  type LatLng,
  type TvSeason,
} from '../../db';

const OPEN_END_VALUE = '';

interface FlatOption {
  id: number;
  label: string;
}

/** "A Game of Thrones" -> "AGOT" — keeps chapter option labels compact. */
function toAcronym(title: string): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase())
    .join('');
}

/**
 * Flattens each book's chapters, in order, each prefixed with its own
 * book's acronym plus an overall 1-based index that keeps growing across
 * every book — so "12." always means the same chapter regardless of
 * which book's dropdown group it's shown under.
 */
function flattenChapterOptions(
  books: Book[],
  chaptersByBookId: Record<number, Chapter[]>,
): FlatOption[] {
  let overallIndex = 0;
  // chaptersByBookId is populated for every book id in `books` in the same
  // state update, so this is never actually undefined.
  return books.flatMap((book) => {
    const bookLabel = book.name ? toAcronym(book.name) : 'Untitled Book';
    return chaptersByBookId[book.id]!.map((chapter) => {
      overallIndex += 1;
      return {
        id: chapter.id,
        label: `${overallIndex}. ${bookLabel}: ${chapter.name || 'Untitled Chapter'}`,
      };
    });
  });
}

/** The episode equivalent of flattenChapterOptions, grouped by "Season N" instead of book name. */
function flattenEpisodeOptions(
  seasons: TvSeason[],
  episodesBySeasonId: Record<number, Episode[]>,
): FlatOption[] {
  let overallIndex = 0;
  // episodesBySeasonId is populated for every season id in `seasons` in the
  // same state update, so this is never actually undefined.
  return seasons.flatMap((season, seasonIndex) =>
    episodesBySeasonId[season.id]!.map((episode) => {
      overallIndex += 1;
      return {
        id: episode.id,
        label: `${overallIndex}. Season ${seasonIndex + 1}: ${episode.name || 'Untitled Episode'}`,
      };
    }),
  );
}

interface RangeSelectProps {
  label: string;
  options: FlatOption[];
  value: number | null;
  onChange: (value: number | null) => void;
}

function RangeSelect({ label, options, value, onChange }: RangeSelectProps) {
  const labelId = `${label.replace(/\s+/g, '-').toLowerCase()}-label`;

  function handleChange(event: SelectChangeEvent) {
    onChange(event.target.value === OPEN_END_VALUE ? null : Number(event.target.value));
  }

  return (
    <FormControl size="small" fullWidth>
      <InputLabel id={labelId} shrink>
        {label}
      </InputLabel>
      <Select
        labelId={labelId}
        label={label}
        value={value === null ? OPEN_END_VALUE : String(value)}
        onChange={handleChange}
        displayEmpty
      >
        <MenuItem value={OPEN_END_VALUE}>
          <em>Open</em>
        </MenuItem>
        {options.map((option) => (
          <MenuItem key={option.id} value={String(option.id)}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

interface PositionPanelProps {
  storyId: number;
  /** 1-based ordinal of this position among the character's positions. */
  index: number;
  position: LatLng | null;
  onBack: () => void;
}

export function PositionPanel({ storyId, index, position, onBack }: PositionPanelProps) {
  const [books, setBooks] = useState<Book[] | null>(null);
  const [chaptersByBookId, setChaptersByBookId] = useState<Record<number, Chapter[]>>({});
  const [seasons, setSeasons] = useState<TvSeason[] | null>(null);
  const [episodesBySeasonId, setEpisodesBySeasonId] = useState<Record<number, Episode[]>>({});

  const [chapterRangeStart, setChapterRangeStart] = useState<number | null>(null);
  const [chapterRangeEnd, setChapterRangeEnd] = useState<number | null>(null);
  const [episodeRangeStart, setEpisodeRangeStart] = useState<number | null>(null);
  const [episodeRangeEnd, setEpisodeRangeEnd] = useState<number | null>(null);
  const [dead, setDead] = useState(false);

  useEffect(() => {
    let cancelled = false;

    listBooksForStory(storyId).then(async (loadedBooks) => {
      if (cancelled) return;
      const chapterLists = await Promise.all(
        loadedBooks.map((book) => listChaptersForBook(book.id)),
      );
      /* v8 ignore next -- exercising this specific unmount window (after listBooksForStory resolves but before the chapter Promise.all does) is too timing-dependent to test reliably; the outer cancelled check above covers the same defensive purpose. */
      if (cancelled) return;
      setBooks(loadedBooks);
      const chapterMap: Record<number, Chapter[]> = {};
      loadedBooks.forEach((book, i) => {
        chapterMap[book.id] = chapterLists[i];
      });
      setChaptersByBookId(chapterMap);
    });

    return () => {
      cancelled = true;
    };
  }, [storyId]);

  useEffect(() => {
    let cancelled = false;

    listTvSeasonsForStory(storyId).then(async (loadedSeasons) => {
      if (cancelled) return;
      const episodeLists = await Promise.all(
        loadedSeasons.map((season) => listEpisodesForSeason(season.id)),
      );
      /* v8 ignore next -- exercising this specific unmount window (after listTvSeasonsForStory resolves but before the episode Promise.all does) is too timing-dependent to test reliably; the outer cancelled check above covers the same defensive purpose. */
      if (cancelled) return;
      setSeasons(loadedSeasons);
      const episodeMap: Record<number, Episode[]> = {};
      loadedSeasons.forEach((season, i) => {
        episodeMap[season.id] = episodeLists[i];
      });
      setEpisodesBySeasonId(episodeMap);
    });

    return () => {
      cancelled = true;
    };
  }, [storyId]);

  const chapterOptions = books ? flattenChapterOptions(books, chaptersByBookId) : [];
  const episodeOptions = seasons ? flattenEpisodeOptions(seasons, episodesBySeasonId) : [];

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <IconButton size="small" aria-label="Back to sidebar" onClick={onBack}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
          Position {index}
        </Typography>
      </Stack>

      <Typography variant="body2" color="text.secondary">
        {position
          ? `${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`
          : 'Drag the pin on the map to set a position.'}
      </Typography>

      {!!books?.length && (
        <Stack spacing={1.5}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Chapter Range
          </Typography>
          <RangeSelect
            label="Start Chapter"
            options={chapterOptions}
            value={chapterRangeStart}
            onChange={setChapterRangeStart}
          />
          <RangeSelect
            label="End Chapter"
            options={chapterOptions}
            value={chapterRangeEnd}
            onChange={setChapterRangeEnd}
          />
        </Stack>
      )}

      {!!seasons?.length && (
        <Stack spacing={1.5}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Episode Range
          </Typography>
          <RangeSelect
            label="Start Episode"
            options={episodeOptions}
            value={episodeRangeStart}
            onChange={setEpisodeRangeStart}
          />
          <RangeSelect
            label="End Episode"
            options={episodeOptions}
            value={episodeRangeEnd}
            onChange={setEpisodeRangeEnd}
          />
        </Stack>
      )}

      <FormControlLabel
        control={<Checkbox checked={dead} onChange={(event) => setDead(event.target.checked)} />}
        label="Dead"
      />
    </Stack>
  );
}
