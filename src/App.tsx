import { useEffect, useState } from 'react';
import { EditorSidebar } from './components/EditorSidebar';
import { MapView } from './components/MapView';
import { createStory, listStories, updateStory, type Story } from './db';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from './lib/mapDefaults';
import './App.css';

function App() {
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStoryId, setSelectedStoryId] = useState<number | null>(null);
  const [tileUrl, setTileUrl] = useState<string | null>(null);

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

  function handleSelectStory(storyId: number | null) {
    setSelectedStoryId(storyId);
    const story = storyId === null ? null : stories.find((s) => s.id === storyId);
    setTileUrl(story?.tileUrlTemplate ?? null);
  }

  async function handleSave(input: { name: string; tileUrlTemplate: string }) {
    if (selectedStoryId === null) {
      const created = await createStory({
        name: input.name,
        tileUrlTemplate: input.tileUrlTemplate,
        initialCenter: DEFAULT_CENTER,
        initialZoom: DEFAULT_ZOOM,
      });
      setStories((previous) => [...previous, created]);
      setSelectedStoryId(created.id);
    } else {
      const existing = stories.find((s) => s.id === selectedStoryId);
      /* v8 ignore next -- selectedStoryId only ever comes from a story already in `stories`, via handleSelectStory or the create branch above. */
      if (!existing) return;

      const updated: Story = {
        ...existing,
        name: input.name,
        tileUrlTemplate: input.tileUrlTemplate,
      };
      await updateStory(selectedStoryId, updated);
      setStories((previous) => previous.map((s) => (s.id === selectedStoryId ? updated : s)));
    }

    setTileUrl(input.tileUrlTemplate);
  }

  return (
    <div className="app">
      <main aria-label="Map">
        <MapView tileUrl={tileUrl} />
      </main>
      <EditorSidebar
        stories={stories}
        selectedStoryId={selectedStoryId}
        onSelectStory={handleSelectStory}
        onSave={handleSave}
      />
    </div>
  );
}

export default App;
