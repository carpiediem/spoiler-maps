import { useEffect, useRef, useState } from 'react';
import type { Story } from '../db';
import './StorySelector.css';

const NEW_MAP_OPTION = 'new-map';

interface StorySelectorProps {
  stories: Story[];
  selectedStoryId: number | null;
  onSelect: (storyId: number | null) => void;
}

export function StorySelector({ stories, selectedStoryId, onSelect }: StorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedStory = stories.find((story) => story.id === selectedStoryId) ?? null;
  const title = selectedStory ? selectedStory.name : 'New Map';

  const filteredStories = stories.filter((story) =>
    story.name.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        close();
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  function close() {
    setIsOpen(false);
    setQuery('');
  }

  function handleSelect(value: string) {
    onSelect(value === NEW_MAP_OPTION ? null : Number(value));
    close();
  }

  return (
    <div className="story-selector" ref={containerRef}>
      <button
        type="button"
        className="story-selector__trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="story-selector__title">{title}</span>
        <span className="story-selector__chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {isOpen && (
        <div className="story-selector__menu">
          <div className="story-selector__heading">Switch story</div>
          <input
            type="text"
            className="story-selector__search"
            placeholder="Search stories"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
          />
          <ul className="story-selector__list" role="listbox" aria-label="Stories">
            {filteredStories.map((story) => (
              <li key={story.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={story.id === selectedStoryId}
                  className="story-selector__option"
                  onClick={() => handleSelect(String(story.id))}
                >
                  <span className="story-selector__check" aria-hidden="true">
                    {story.id === selectedStoryId ? '✓' : ''}
                  </span>
                  {story.name}
                </button>
              </li>
            ))}
            {filteredStories.length === 0 && (
              <li className="story-selector__empty">No stories found</li>
            )}
          </ul>
          <div className="story-selector__divider" />
          <button
            type="button"
            role="option"
            aria-selected={selectedStoryId === null}
            className="story-selector__option story-selector__option--new"
            onClick={() => handleSelect(NEW_MAP_OPTION)}
          >
            <span className="story-selector__check" aria-hidden="true">
              {selectedStoryId === null ? '✓' : '+'}
            </span>
            New Map
          </button>
        </div>
      )}
    </div>
  );
}
