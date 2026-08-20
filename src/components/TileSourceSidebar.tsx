import { useState, type FormEvent } from 'react';
import { resolveTileUrlTemplate } from '../lib/tileUrl';
import './TileSourceSidebar.css';

interface TileSourceSidebarProps {
  onApply: (tileUrl: string) => void;
}

export function TileSourceSidebar({ onApply }: TileSourceSidebarProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const resolved = resolveTileUrlTemplate(value);
    if (!resolved) {
      setError(
        'Enter a URL template with {x}, {y}, {z} (or {q}) placeholders, or a real tile URL to extract a {q} quadkey template from.',
      );
      return;
    }

    setError(null);
    onApply(resolved.template);
  }

  return (
    <aside className="tile-source-sidebar">
      <h2>Tile Source</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="tile-url-input">Tile URL template</label>
        <input
          id="tile-url-input"
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="https://tile.example.com/{z}/{x}/{y}.png"
        />
        {error && (
          <p className="tile-source-sidebar__error" role="alert">
            {error}
          </p>
        )}
        <button type="submit">Apply</button>
      </form>
    </aside>
  );
}
