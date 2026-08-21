import type { Map as LeafletMap } from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { EditorSidebar } from './components/EditorSidebar';
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
import type { CharacterPositionPin } from './lib/characterPositionPins';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from './lib/mapDefaults';
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
  // When set, the sidebar slides its main content out to the left and
  // slides a Position form in from the right, in place of the accordion
  // list. Owned here (rather than by EditorSidebar) so a click on a map
  // pin — a sibling of EditorSidebar — can open it too.
  const [activePosition, setActivePosition] = useState<{
    characterId: number;
    index: number;
    existing: CharacterPosition | null;
  } | null>(null);
  // Bumped whenever a position editing session ends, so each CharacterItem
  // re-fetches its list.
  const [positionsVersion, setPositionsVersion] = useState(0);
  const mapRef = useRef<LeafletMap | null>(null);

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

  function handleAddPosition(characterId: number, index: number) {
    setActivePosition({ characterId, index, existing: null });
    setDraftPosition(mapPosition.center);
  }

  function handleEditPosition(characterId: number, index: number, existing: CharacterPosition) {
    setActivePosition({ characterId, index, existing });
    setDraftPosition(existing.position);
  }

  function handlePinClick(pin: CharacterPositionPin) {
    handleEditPosition(pin.characterId, Number(pin.label), pin.characterPosition);
  }

  function handleBackFromPosition() {
    setActivePosition(null);
    setDraftPosition(null);
    // Picked up by CharacterItem's positions-fetch effect, so the sidebar
    // list reflects whatever was just created/updated while its accordion
    // stayed mounted (and silently stale) behind the Position panel.
    setPositionsVersion((previous) => previous + 1);
  }

  async function handleSave(input: {
    name: string;
    tileUrlTemplate: string;
    tileLayerAuthor: string | null;
    tileLayerAttributionUrl: string | null;
    initialCenter: LatLng;
    initialZoom: number;
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
          onPositionChange={setMapPosition}
          draftPosition={draftPosition}
          onDraftPositionChange={setDraftPosition}
          characterPositionPins={characterPositionPins}
          editingPositionId={activePosition?.existing?.id ?? null}
          onCharacterPositionPinClick={handlePinClick}
        />
      </main>
      <EditorSidebar
        stories={stories}
        selectedStoryId={selectedStoryId}
        onSelectStory={handleSelectStory}
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
      />
    </div>
  );
}

export default App;
