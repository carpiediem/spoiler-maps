import { readFileSync } from 'fs';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetDatabaseForTests } from './db/client';
import { ViewScreen } from './screens/ViewScreen';

// public/sample-story.yaml is served statically by GitHub Pages and scanned
// by the accessibility-scanner workflow (see .github/workflows/a11y-scan.yml)
// as a `/view?d=` URL — the scanner has no scripted-interaction capability,
// so this is the only way it ever sees ViewScreen's populated UI (character
// list, timeline, map pins/tails, the description dialog) rather than just
// EditScreen's empty "New Map" state. This test guards that fixture against
// silently breaking (e.g. a StoryDocument schema change) without anyone
// noticing until the next manual scan run.
async function deleteStoredDatabase(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('spoiler-maps');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

beforeEach(() => {
  resetDatabaseForTests();
});

afterEach(async () => {
  resetDatabaseForTests();
  await deleteStoredDatabase();
  vi.unstubAllGlobals();
});

describe('public/sample-story.yaml', () => {
  it('renders end-to-end on the view screen, dialog and all', async () => {
    const yamlText = readFileSync('public/sample-story.yaml', 'utf-8');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(yamlText) }),
    );
    const user = userEvent.setup();

    const { container } = render(
      <MemoryRouter initialEntries={['/view?d=https://example.com/sample-story.yaml']}>
        <Routes>
          <Route path="/view" element={<ViewScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Mira Ashwood')).toBeInTheDocument();
    expect(screen.getByText('Corin Vale')).toBeInTheDocument();
    expect(screen.getByText('Show spoilers through:')).toBeInTheDocument();
    expect(container.querySelector('.leaflet-container')).toBeInTheDocument();

    // The description dialog (Markdown formatting included) opens by default.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('sample map')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /got it/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    expect(
      screen.getByRole('heading', { level: 1, name: 'The Wandering Lantern' }),
    ).toBeInTheDocument();

    // The book/TV toggle is present since both a book and a season exist.
    expect(screen.getByRole('button', { name: 'Books' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'TV seasons' })).toBeInTheDocument();
  });
});
