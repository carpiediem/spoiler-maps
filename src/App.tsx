import type { Map as LeafletMap } from 'leaflet';
import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorSidebar } from './components/EditorSidebar';
import { MapTimelineControl, type TimelineMode } from './components/MapTimelineControl';
import { MapView } from './components/MapView';
import {
  createStory,
  listStories,
  updateStory,
  type CharacterPosition,
  type LatLng,
  type Story,
} from './db';
import { buildTileAttribution } from './lib/attribution';
import type { CharacterPositionPin, CharacterTailOverlay } from './lib/characterPositionPins';
import { downloadTextFile } from './lib/downloadTextFile';
import {
  DEFAULT_CENTER,
  DEFAULT_MAX_ZOOM,
  DEFAULT_MIN_ZOOM,
  DEFAULT_ZOOM,
} from './lib/mapDefaults';
import { exportStoryToYaml } from './lib/storyExport';
import { importStoryFromYaml } from './lib/storyImport';
import './App.css';

function App() {
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStoryId, setSelectedStoryId] = useState<number | null>(null);
  const [tileUrl, setTileUrl] = useState<string | null>(null);
  const [mapPosition, setMapPosition] = useState<{ center: LatLng; zoom: number }>({
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
  });
  const [draftPosition, setDraftPosition] = useState<LatLng | null>(null);
  const [characterPositionPins, setCharacterPositionPins] = useState<CharacterPositionPin[] | null>(
    null,
  );
  const [characterTails, setCharacterTails] = useState<CharacterTailOverlay[]>([]);
  // When set, the sidebar slides its main content out to the left and
  // slides a Position form in from the right, in place of the accordion
  // list. Owned here (rather than by EditorSidebar) so a click on a map
  // pin — a sibling of EditorSidebar — can open it too.
  const [activePosition, setActivePosition] = useState<{
    characterId: number;
    index: number;
    existing: CharacterPosition | null;
    color: string | null;
  } | null>(null);
  // Bumped whenever a position editing session ends, so each CharacterItem
  // re-fetches its list.
  const [positionsVersion, setPositionsVersion] = useState(0);
  // null when not drawing a tail; an (possibly empty) array of points
  // clicked so far while drawing one.
  const [tailDraftPoints, setTailDraftPoints] = useState<LatLng[] | null>(null);
  // The map timeline control's current mode and scrub position (a flat
  // 1-based index into that mode's chapters or episodes) — filters which
  // character positions CharactersSection surfaces as map pins.
  const [timelineMode, setTimelineMode] = useState<TimelineMode>('book');
  const [timelineIndex, setTimelineIndex] = useState(1);
  const mapRef = useRef<LeafletMap | null>(null);

  // Stable identity (functional setState form needs no deps) so it doesn't
  // re-trigger MapTimelineControl's onChange effect on every unrelated App
  // re-render.
  const handleTimelineChange = useCallback((mode: TimelineMode, index: number) => {
    setTimelineMode(mode);
    setTimelineIndex(index);
  }, []);

  useEffect(() => {
    let cancelled = false;

    listStories().then((loaded) => {
      if (cancelled) return;
      setStories(loaded);
      if (loaded.length > 0) {
        setSelectedStoryId(loaded[0].id);
        setTileUrl(loaded[0].tileUrlTemplate);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedStory = stories.find((s) => s.id === selectedStoryId) ?? null;
  const mapCenter = selectedStory?.initialCenter ?? DEFAULT_CENTER;
  const mapZoom = selectedStory?.initialZoom ?? DEFAULT_ZOOM;
  const mapMinZoom = selectedStory?.minZoom ?? DEFAULT_MIN_ZOOM;
  const mapMaxZoom = selectedStory?.maxZoom ?? DEFAULT_MAX_ZOOM;
  const tileAttribution = buildTileAttribution(
    selectedStory?.tileLayerAuthor ?? null,
    selectedStory?.tileLayerAttributionUrl ?? null,
  );

  // MapView remounts (via the key below) whenever the selected story
  // changes, so its live position tracking should start over from that
  // story's own saved position too — otherwise the pushpin button would
  // judge "has the map moved" against the previous story's position.
  useEffect(() => {
    setMapPosition({ center: mapCenter, zoom: mapZoom });
    setActivePosition(null);
    setDraftPosition(null);
    setTailDraftPoints(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStoryId]);

  function handleSelectStory(storyId: number | null) {
    setSelectedStoryId(storyId);
    const story = storyId === null ? null : stories.find((s) => s.id === storyId);
    setTileUrl(story?.tileUrlTemplate ?? null);
  }

  function getCurrentMapPosition(): { center: LatLng; zoom: number } | null {
    const map = mapRef.current;
    /* v8 ignore next -- mapRef is set synchronously when MapView mounts, before any user interaction that could call this. */
    if (!map) return null;
    const center = map.getCenter();
    return { center: { lat: center.lat, lng: center.lng }, zoom: map.getZoom() };
  }

  function handleAddPosition(characterId: number, index: number, color: string | null) {
    setActivePosition({ characterId, index, existing: null, color });
    setDraftPosition(mapPosition.center);
  }

  // Called once, right as the panel opens: a marker being edited belongs on
  // screen, but shouldn't otherwise fight the user by recentering on every
  // subsequent drag or field change.
  function recenterMapIfPositionNotVisible(position: LatLng) {
    const map = mapRef.current;
    /* v8 ignore next -- mapRef is set synchronously when MapView mounts, before any user interaction that could call this. */
    if (!map) return;
    /* v8 ignore next -- jsdom gives the map container zero real size, so getBounds() is always a degenerate (zero-area) box that never truly contains a point; only reachable with real layout, verified manually in a real browser. */
    if (map.getBounds().contains(position)) return;
    map.flyTo(position, map.getZoom());
  }

  function handleEditPosition(
    characterId: number,
    index: number,
    existing: CharacterPosition,
    color: string | null,
  ) {
    setActivePosition({ characterId, index, existing, color });
    setDraftPosition(existing.position);
    recenterMapIfPositionNotVisible(existing.position);
  }

  function handlePinClick(pin: CharacterPositionPin) {
    handleEditPosition(pin.characterId, pin.positionIndex, pin.characterPosition, pin.color);
  }

  function handleBackFromPosition() {
    setActivePosition(null);
    setDraftPosition(null);
    setTailDraftPoints(null);
    // Picked up by CharacterItem's positions-fetch effect, so the sidebar
    // list reflects whatever was just created/updated while its accordion
    // stayed mounted (and silently stale) behind the Position panel.
    setPositionsVersion((previous) => previous + 1);
  }

  function handleStartDrawingTail() {
    setTailDraftPoints([]);
  }

  // Only reachable while drawing: MapView's click-catching listener is only
  // mounted while tailDraftPoints is non-null.
  function handleTailPointClick(point: LatLng) {
    setTailDraftPoints((previous) => [...previous!, point]);
  }

  function handleFinishDrawingTail() {
    setTailDraftPoints(null);
  }

  async function handleSave(input: {
    name: string;
    tileUrlTemplate: string;
    tileLayerAuthor: string | null;
    tileLayerAttributionUrl: string | null;
    initialCenter: LatLng;
    initialZoom: number;
    minZoom: number;
    maxZoom: number;
  }) {
    if (selectedStoryId === null) {
      const created = await createStory(input);
      setStories((previous) => [...previous, created]);
      setSelectedStoryId(created.id);
    } else {
      const existing = stories.find((s) => s.id === selectedStoryId);
      /* v8 ignore next -- selectedStoryId only ever comes from a story already in `stories`, via handleSelectStory or the create branch above. */
      if (!existing) return;

      const updated: Story = { ...existing, ...input };
      await updateStory(selectedStoryId, updated);
      setStories((previous) => previous.map((s) => (s.id === selectedStoryId ? updated : s)));
    }

    setTileUrl(input.tileUrlTemplate);
  }

  async function handleExportStory() {
    if (selectedStoryId === null) return;
    const story = stories.find((s) => s.id === selectedStoryId);
    /* v8 ignore next -- the Export button only renders once selectedStoryId names a story already in `stories`. */
    if (!story) return;

    const yamlText = await exportStoryToYaml(selectedStoryId);
    const slug =
      story.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'story';
    downloadTextFile(`${slug}.yaml`, yamlText, 'text/yaml');
  }

  async function handleImportFile(file: File) {
    const text = await file.text();
    const imported = await importStoryFromYaml(text);
    setStories((previous) => [...previous, imported]);
    setSelectedStoryId(imported.id);
    setTileUrl(imported.tileUrlTemplate);
  }

  return (
    <div className="app">
      <main aria-label="Map">
        <MapView
          key={selectedStoryId ?? 'new'}
          mapRef={mapRef}
          tileUrl={tileUrl}
          attribution={tileAttribution}
          center={mapCenter}
          zoom={mapZoom}
          minZoom={mapMinZoom}
          maxZoom={mapMaxZoom}
          onPositionChange={setMapPosition}
          draftPosition={draftPosition}
          onDraftPositionChange={setDraftPosition}
          characterPositionPins={characterPositionPins}
          characterTails={characterTails}
          editingPositionId={activePosition?.existing?.id ?? null}
          onCharacterPositionPinClick={handlePinClick}
          tailDraftPoints={tailDraftPoints}
          onTailPointClick={handleTailPointClick}
          tailColor={activePosition?.color ?? null}
        />
        <MapTimelineControl storyId={selectedStoryId} onChange={handleTimelineChange} />
      </main>
      <EditorSidebar
        stories={stories}
        selectedStoryId={selectedStoryId}
        onSelectStory={handleSelectStory}
        onExportStory={handleExportStory}
        onImportFile={handleImportFile}
        onSave={handleSave}
        onCaptureMapPosition={getCurrentMapPosition}
        mapPosition={mapPosition}
        draftPosition={draftPosition}
        activePosition={activePosition}
        onAddPosition={handleAddPosition}
        onEditPosition={handleEditPosition}
        onBackFromPosition={handleBackFromPosition}
        positionsVersion={positionsVersion}
        onVisiblePositionsChange={setCharacterPositionPins}
        onVisibleTailsChange={setCharacterTails}
        isDrawingTail={tailDraftPoints !== null}
        tailDraftPoints={tailDraftPoints ?? []}
        onStartDrawingTail={handleStartDrawingTail}
        onFinishDrawingTail={handleFinishDrawingTail}
        timelineMode={timelineMode}
        timelineIndex={timelineIndex}
      />
    </div>
  );
}

export default App;
