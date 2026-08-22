import { Alert, Box, CircularProgress } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CharacterPathsPanel } from '../components/view/CharacterPathsPanel';
import { WelcomeDialog } from '../components/view/WelcomeDialog';
import { MapTimelineControl, type TimelineMode } from '../components/MapTimelineControl';
import { MapView } from '../components/MapView';
import { buildTileAttribution } from '../lib/attribution';
import { buildStoryDocument } from '../lib/storyExport';
import { parseStoryDocument } from '../lib/storyImport';
import type { StoryDocument } from '../lib/storyDocument';
import { buildDocumentChapterOptions, buildDocumentEpisodeOptions } from '../lib/viewTimeline';
import { buildViewPinsAndTails } from '../lib/viewCharacterPins';
import { isWelcomeDismissed, setWelcomeDismissed } from '../lib/welcomeDismissed';
import './EditScreen.css';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; document: StoryDocument };

/** Reads and validates a story document from wherever the URL points: an external `?d=` URL, or a local story id. */
function useLoadedDocument(storyId: number | null, dataUrl: string | null): LoadState {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  // Resets to "loading" as soon as the source changes, without waiting for
  // the effect below to run — done during render (React's documented
  // pattern for this) rather than as a synchronous setState inside the
  // effect, which would just trigger an extra render.
  const sourceKey = `${storyId ?? ''}:${dataUrl ?? ''}`;
  const [loadedForKey, setLoadedForKey] = useState(sourceKey);
  if (sourceKey !== loadedForKey) {
    setLoadedForKey(sourceKey);
    setState({ status: 'loading' });
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (dataUrl) {
        const response = await fetch(dataUrl);
        if (!response.ok) {
          throw new Error(`Could not load this map: the server responded with ${response.status}.`);
        }
        return parseStoryDocument(await response.text());
      }
      if (storyId !== null) return buildStoryDocument(storyId);
      throw new Error('No map specified — this link is missing a story or a data URL.');
    }

    load()
      .then((document) => {
        if (cancelled) return;
        setState({ status: 'ready', document });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [storyId, dataUrl]);

  return state;
}

export function ViewScreen() {
  const { storyId: storyIdParam } = useParams<{ storyId: string }>();
  const [searchParams] = useSearchParams();
  const dataUrl = searchParams.get('d');
  const parsedStoryId = storyIdParam ? Number(storyIdParam) : null;
  const storyId = parsedStoryId !== null && Number.isFinite(parsedStoryId) ? parsedStoryId : null;

  const loadState = useLoadedDocument(storyId, dataUrl);

  const [checkedIndices, setCheckedIndices] = useState<Set<number>>(new Set());
  const [showFullPath, setShowFullPath] = useState(false);
  const [timelineMode, setTimelineMode] = useState<TimelineMode>('book');
  const [timelineIndex, setTimelineIndex] = useState(1);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(() => !isWelcomeDismissed());

  const document = loadState.status === 'ready' ? loadState.document : null;

  const chapterOptions = useMemo(
    () => (document ? buildDocumentChapterOptions(document) : []),
    [document],
  );
  const episodeOptions = useMemo(
    () => (document ? buildDocumentEpisodeOptions(document) : []),
    [document],
  );

  const { pins, tails } = useMemo(() => {
    if (!document) return { pins: [], tails: [] };
    return buildViewPinsAndTails(
      document,
      checkedIndices,
      showFullPath,
      timelineMode,
      timelineIndex,
    );
  }, [document, checkedIndices, showFullPath, timelineMode, timelineIndex]);

  function handleCloseWelcome() {
    setWelcomeDismissed();
    setIsWelcomeOpen(false);
  }

  if (loadState.status === 'loading') {
    return (
      <Box
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (loadState.status === 'error') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          p: 2,
        }}
      >
        <Alert severity="error" sx={{ maxWidth: 480 }}>
          {loadState.message}
        </Alert>
      </Box>
    );
  }

  const tileAttribution = buildTileAttribution(
    document!.tileLayerAuthor ?? null,
    document!.tileLayerAttributionUrl ?? null,
  );
  /* v8 ignore next -- by the time a document is loaded, load() has already guaranteed dataUrl or storyId is set. */
  const timelineKey = dataUrl ?? storyId ?? 'none';

  return (
    <div className="app">
      <main aria-label="Map">
        <MapView
          tileUrl={document!.tileUrlTemplate ?? null}
          attribution={tileAttribution}
          center={document!.initialCenter}
          zoom={document!.initialZoom}
          minZoom={document!.minZoom}
          maxZoom={document!.maxZoom}
          characterPositionPins={pins.length > 0 ? pins : null}
          characterTails={tails}
        />
        <MapTimelineControl
          key={timelineKey}
          chapterOptions={chapterOptions}
          episodeOptions={episodeOptions}
          hasBooks={chapterOptions.length > 0}
          hasSeasons={episodeOptions.length > 0}
          heading="Show spoilers through:"
          onChange={(mode, index) => {
            setTimelineMode(mode);
            setTimelineIndex(index);
          }}
        />
      </main>
      <CharacterPathsPanel
        characters={document!.characters}
        checkedIndices={checkedIndices}
        onCheckedIndicesChange={setCheckedIndices}
        showFullPath={showFullPath}
        onShowFullPathChange={setShowFullPath}
      />
      <WelcomeDialog open={isWelcomeOpen} onClose={handleCloseWelcome} />
    </div>
  );
}
