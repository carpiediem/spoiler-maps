import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Story } from '../db';
import './StorySelector.css';

const NEW_MAP_OPTION = 'new-map';

interface StorySelectorProps {
  stories: Story[];
  selectedStoryId: number | null;
  onSelect: (storyId: number | null) => void;
  /** Reads and imports a YAML export as a brand-new story; rejects with a user-facing message on failure. */
  onImportFile: (file: File) => Promise<void>;
  /** Downloads the currently selected story as a YAML file. */
  onExportStory: () => void;
}

export function StorySelector({
  stories,
  selectedStoryId,
  onSelect,
  onImportFile,
  onExportStory,
}: StorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setImportError(null);
  }

  function handleSelect(value: string) {
    onSelect(value === NEW_MAP_OPTION ? null : Number(value));
    close();
  }

  function handleImportClick() {
    setImportError(null);
    fileInputRef.current?.click();
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsImporting(true);
    setImportError(null);
    try {
      await onImportFile(file);
      close();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsImporting(false);
    }
  }

  function handleExportClick() {
    onExportStory();
    close();
  }

  return (
    <div className="story-selector" ref={containerRef}>
      <div className="story-selector__trigger-group">
        {selectedStoryId !== null ? (
          <Link to={`/view/${selectedStoryId}`} className="story-selector__title-link">
            <span className="story-selector__title">{title}</span>
          </Link>
        ) : (
          <span className="story-selector__title-link story-selector__title-link--disabled">
            <span className="story-selector__title">{title}</span>
          </span>
        )}
        <button
          type="button"
          className="story-selector__chevron-button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={title}
          onClick={() => setIsOpen((open) => !open)}
        >
          <span className="story-selector__chevron" aria-hidden="true">
            ▾
          </span>
        </button>
      </div>

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
          <button
            type="button"
            className="story-selector__option"
            onClick={handleImportClick}
            disabled={isImporting}
          >
            <FileUploadOutlinedIcon className="story-selector__check" aria-hidden="true" />
            {isImporting ? 'Importing…' : 'Import from file…'}
          </button>
          <button
            type="button"
            className="story-selector__option"
            onClick={handleExportClick}
            disabled={selectedStoryId === null}
          >
            <FileDownloadOutlinedIcon className="story-selector__check" aria-hidden="true" />
            Export as YAML
          </button>
          {importError && <div className="story-selector__error">{importError}</div>}
          <input
            ref={fileInputRef}
            type="file"
            accept=".yaml,.yml,text/yaml"
            className="story-selector__file-input"
            onChange={handleFileChange}
            aria-label="Import from file"
          />
        </div>
      )}
    </div>
  );
}
