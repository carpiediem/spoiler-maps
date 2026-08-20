import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Story } from '../db';
import { resolveTileUrlTemplate } from '../lib/tileUrl';
import { StorySelector } from './StorySelector';
import './EditorSidebar.css';

interface EditorSidebarProps {
  stories: Story[];
  selectedStoryId: number | null;
  onSelectStory: (storyId: number | null) => void;
  onSave: (input: { name: string; tileUrlTemplate: string }) => void;
}

export function EditorSidebar({
  stories,
  selectedStoryId,
  onSelectStory,
  onSave,
}: EditorSidebarProps) {
  const [name, setName] = useState('');
  const [tileUrlValue, setTileUrlValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Tracks the selectedStoryId last synced to the form, so the list simply
  // reloading (e.g. the initial fetch resolving) doesn't reset the form out
  // from under whatever the user is typing — only an actual change of
  // *which* story is selected does.
  const syncedStoryIdRef = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    if (syncedStoryIdRef.current === selectedStoryId) return;
    syncedStoryIdRef.current = selectedStoryId;

    const story = stories.find((candidate) => candidate.id === selectedStoryId) ?? null;
    setName(story?.name ?? '');
    setTileUrlValue(story?.tileUrlTemplate ?? '');
    setError(null);
  }, [selectedStoryId, stories]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Enter a name for this map.');
      return;
    }

    const resolved = resolveTileUrlTemplate(tileUrlValue);
    if (!resolved) {
      setError(
        'Enter a URL template with {x}, {y}, {z} (or {q}) placeholders, or a real tile URL to extract a {q} quadkey template from.',
      );
      return;
    }

    setError(null);
    onSave({ name: trimmedName, tileUrlTemplate: resolved.template });
  }

  return (
    <aside className="editor-sidebar">
      <StorySelector stories={stories} selectedStoryId={selectedStoryId} onSelect={onSelectStory} />

      <form onSubmit={handleSubmit}>
        <label htmlFor="map-name-input">Map Name</label>
        <input
          id="map-name-input"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="My Story Map"
        />

        <label htmlFor="tile-url-input">Tile URL template</label>
        <input
          id="tile-url-input"
          type="text"
          value={tileUrlValue}
          onChange={(event) => setTileUrlValue(event.target.value)}
          placeholder="https://tile.example.com/{z}/{x}/{y}.png"
        />

        {error && (
          <p className="editor-sidebar__error" role="alert">
            {error}
          </p>
        )}

        <button type="submit">Save</button>
      </form>
    </aside>
  );
}
