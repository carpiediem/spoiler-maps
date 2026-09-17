import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  Paper,
  ThemeProvider,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { CharacterPathsPanel } from '../components/view/CharacterPathsPanel';
import { DescriptionDialog } from '../components/view/DescriptionDialog';
import { MarkersPanel } from '../components/view/MarkersPanel';
import { WelcomeDialog } from '../components/view/WelcomeDialog';
import { MapErrorBoundary } from '../components/MapErrorBoundary';
import { MapTimelineControl, type TimelineMode } from '../components/MapTimelineControl';
import { MapView } from '../components/MapView';
import { buildTileAttribution } from '../lib/attribution';
import { buildStoryDocument } from '../lib/storyExport';
import { parseStoryDocument } from '../lib/storyImport';
import type { StoryDocument } from '../lib/storyDocument';
import { parseTimelineHash } from '../lib/timelineHash';
import { buildDocumentChapterOptions, buildDocumentEpisodeOptions } from '../lib/viewTimeline';
import { buildViewPinsAndTails } from '../lib/viewCharacterPins';
import { buildViewMarkerPins } from '../lib/viewMarkerPins';
import { buildStoryTheme } from '../theme';
import { visuallyHidden } from '../lib/visuallyHidden';
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
  const location = useLocation();
  const dataUrl = searchParams.get('d');
  const parsedStoryId = storyIdParam ? Number(storyIdParam) : null;
  const storyId = parsedStoryId !== null && Number.isFinite(parsedStoryId) ? parsedStoryId : null;

  const loadState = useLoadedDocument(storyId, dataUrl);

  const [checkedIndices, setCheckedIndices] = useState<Set<number>>(new Set());
  const [showFullPath, setShowFullPath] = useState(true);
  // null until the user first touches a checkbox; until then, every marker
  // collection is hidden by default, matching characters' own "nothing
  // revealed yet" default (see hiddenMarkerSetIndices below).
  const [hiddenMarkerSetIndicesOverride, setHiddenMarkerSetIndicesOverride] =
    useState<Set<number> | null>(null);
  const [timelineMode, setTimelineMode] = useState<TimelineMode>('book');
  const [timelineIndex, setTimelineIndex] = useState(1);
  // Seeded once from a #chapter-N or #episode-N URL fragment at first
  // render, so a shared link can start the spoiler slider past the
  // default (the story's last chapter/episode). Read from the router's own
  // location (not window.location) so it works under MemoryRouter in tests
  // too, not just a real BrowserRouter.
  const [initialTimeline] = useState(() => parseTimelineHash(location.hash));
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(true);

  const document = loadState.status === 'ready' ? loadState.document : null;
  const storyTheme = useMemo(
    () => buildStoryTheme(document?.paletteKey ?? null),
    [document?.paletteKey],
  );

  const chapterOptions = useMemo(
    () => (document ? buildDocumentChapterOptions(document) : []),
    [document],
  );
  const episodeOptions = useMemo(
    () => (document ? buildDocumentEpisodeOptions(document) : []),
    [document],
  );

  // Every listable (non-noIcons) marker collection's index, until the user
  // overrides it by touching a checkbox — computed fresh each time rather
  // than seeded via an effect, so there's no flash of "all visible" on the
  // first render where the document becomes available. A noIcons collection
  // is never included: it has no checkbox to hide it behind, so it's always
  // visible.
  const hiddenMarkerSetIndices = useMemo(() => {
    if (hiddenMarkerSetIndicesOverride !== null) return hiddenMarkerSetIndicesOverride;
    if (!document) return new Set<number>();
    return new Set(
      document.markerSets
        .map((markerSet, index) => ({ markerSet, index }))
        .filter(({ markerSet }) => !markerSet.noIcons)
        .map(({ index }) => index),
    );
  }, [hiddenMarkerSetIndicesOverride, document]);

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

  const markerPins = useMemo(() => {
    if (!document) return [];
    return buildViewMarkerPins(document, timelineMode, timelineIndex, hiddenMarkerSetIndices);
  }, [document, timelineMode, timelineIndex, hiddenMarkerSetIndices]);

  function handleCloseWelcome() {
    setIsWelcomeOpen(false);
  }

  if (loadState.status === 'loading') {
    return (
      <ThemeProvider theme={storyTheme}>
        <Box
          component="main"
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}
        >
          <Typography component="h1" sx={visuallyHidden}>
            Spoiler Maps
          </Typography>
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  if (loadState.status === 'error') {
    return (
      <ThemeProvider theme={storyTheme}>
        <Box
          component="main"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            p: 2,
          }}
        >
          <Typography component="h1" sx={visuallyHidden}>
            Spoiler Maps
          </Typography>
          <Alert severity="error" sx={{ maxWidth: 480 }}>
            {loadState.message}
          </Alert>
        </Box>
      </ThemeProvider>
    );
  }

  const tileAttribution = buildTileAttribution(
    document!.tileLayerAuthor ?? null,
    document!.tileLayerAttributionUrl ?? null,
  );
  /* v8 ignore next -- by the time a document is loaded, load() has already guaranteed dataUrl or storyId is set. */
  const timelineKey = dataUrl ?? storyId ?? 'none';

  return (
    <ThemeProvider theme={storyTheme}>
      <div className="app">
        <main aria-label="Map">
          {/* Inside the main landmark, not a sibling of it — otherwise it's
              page content not contained by any landmark. */}
          <Typography component="h1" sx={visuallyHidden}>
            {document!.name}
          </Typography>
          <MapErrorBoundary key={timelineKey}>
            <MapView
              tileUrl={document!.tileUrlTemplate ?? null}
              attribution={tileAttribution}
              center={document!.initialCenter}
              zoom={document!.initialZoom}
              minZoom={document!.minZoom}
              maxZoom={document!.maxZoom}
              characterPositionPins={pins.length > 0 ? pins : null}
              characterTails={tails}
              markerPins={markerPins.length > 0 ? markerPins : null}
            />
          </MapErrorBoundary>
          <MapTimelineControl
            key={timelineKey}
            chapterOptions={chapterOptions}
            episodeOptions={episodeOptions}
            hasBooks={chapterOptions.length > 0}
            hasSeasons={episodeOptions.length > 0}
            heading="Show spoilers through:"
            initialMode={initialTimeline?.mode}
            // Defaults to the very start (no spoilers revealed yet) unless
            // a #chapter-N/#episode-N URL fragment says otherwise — a
            // shared link with no fragment shouldn't open showing every
            // spoiler by default. EditScreen has no such default (it keeps
            // MapTimelineControl's own "last chapter" default), since the
            // author placing markers wants to see everything by default.
            initialIndex={initialTimeline?.index ?? 1}
            onChange={(mode, index) => {
              setTimelineMode(mode);
              setTimelineIndex(index);
            }}
          />
        </main>
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
          <MarkersPanel
            markerSets={document!.markerSets}
            hiddenIndices={hiddenMarkerSetIndices}
            onHiddenIndicesChange={setHiddenMarkerSetIndicesOverride}
          />
          <Divider sx={{ my: 2 }} />
          <CharacterPathsPanel
            characters={document!.characters}
            checkedIndices={checkedIndices}
            onCheckedIndicesChange={setCheckedIndices}
            showFullPath={showFullPath}
            onShowFullPathChange={setShowFullPath}
            timelineMode={timelineMode}
            timelineIndex={timelineIndex}
          />
        </Paper>
        {document!.description ? (
          <DescriptionDialog
            open={isWelcomeOpen}
            onClose={handleCloseWelcome}
            storyName={document!.name}
            description={document!.description}
          />
        ) : (
          <WelcomeDialog open={isWelcomeOpen} onClose={handleCloseWelcome} />
        )}
      </div>
    </ThemeProvider>
  );
}
