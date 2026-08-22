import { render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCharacter, createStory } from '../db';
import { resetDatabaseForTests } from '../db/client';
import { isWelcomeDismissed } from '../lib/welcomeDismissed';
import { ViewScreen } from './ViewScreen';

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
  localStorage.clear();
  vi.unstubAllGlobals();
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/view/:storyId?"
          element={
            <>
              <Link to="/view?d=https://example.com/other.yaml">Switch map</Link>
              <ViewScreen />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

const validYaml = `
name: A Song of Ice and Fire
initialCenter: { lat: 1, lng: 2 }
initialZoom: 4
minZoom: 0
maxZoom: 19
books:
  - name: A Game of Thrones
    chapters:
      - name: Prologue
      - name: Bran
characters:
  - name: Jon Snow
    color: '#ff0000'
    positions:
      - lat: 10
        lng: 10
      - lat: 20
        lng: 20
        tail: [{ lat: 15, lng: 15 }]
        chapters: [1, null]
`;

describe('ViewScreen', () => {
  it('shows an error when neither a story id nor a data URL is given', async () => {
    renderAt('/view');

    expect(await screen.findByText(/no map specified/i)).toBeInTheDocument();
  });

  it('shows an error when the data URL fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, text: () => Promise.resolve('') }),
    );

    renderAt('/view?d=https://example.com/story.yaml');

    expect(await screen.findByText(/responded with 404/i)).toBeInTheDocument();
  });

  it('shows an error when the fetched document fails validation', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({ ok: true, text: () => Promise.resolve('not: a valid: document') }),
    );

    renderAt('/view?d=https://example.com/story.yaml');

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  it('renders the map, timeline heading, and character list from a fetched data URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(validYaml) }),
    );

    const { container } = renderAt('/view?d=https://example.com/story.yaml');

    expect(await screen.findByText('Show spoilers through:')).toBeInTheDocument();
    expect(screen.getByText('Jon Snow')).toBeInTheDocument();
    expect(container.querySelector('.leaflet-container')).toBeInTheDocument();
  });

  it('renders a local story directly from the database, given a story id and no data URL', async () => {
    const story = await createStory({
      name: 'A Song of Ice and Fire',
      tileUrlTemplate: null,
      tileLayerAuthor: null,
      tileLayerAttributionUrl: null,
      initialCenter: { lat: 5, lng: 5 },
      initialZoom: 4,
      minZoom: 0,
      maxZoom: 19,
    });
    await createCharacter({
      storyId: story.id,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: null,
      sortOrder: 0,
    });
    resetDatabaseForTests();

    renderAt(`/view/${story.id}`);

    expect(await screen.findByText('Jon Snow')).toBeInTheDocument();
  });

  it('shows a pin once a character is checked, respecting the spoiler slider', async () => {
    localStorage.setItem('spoiler-maps:view-welcome-dismissed', 'true');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(validYaml) }),
    );
    const user = userEvent.setup();
    const { container } = renderAt('/view?d=https://example.com/story.yaml');

    await screen.findByText('Jon Snow');
    expect(container.querySelectorAll('.leaflet-marker-icon')).toHaveLength(0);

    await user.click(screen.getByRole('checkbox', { name: 'Jon Snow' }));

    // The slider starts on the last chapter, so both of Jon's positions
    // (including the one starting at chapter index 1) are reached — but
    // only the last one shows as a pin, per buildViewPinsAndTails.
    await waitFor(() => {
      expect(container.querySelectorAll('.leaflet-marker-icon')).toHaveLength(1);
    });
  });

  it('draws a tail once "Show full path" is toggled on', async () => {
    localStorage.setItem('spoiler-maps:view-welcome-dismissed', 'true');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(validYaml) }),
    );
    const user = userEvent.setup();
    const { container } = renderAt('/view?d=https://example.com/story.yaml');

    await screen.findByText('Jon Snow');
    await user.click(screen.getByRole('checkbox', { name: 'Jon Snow' }));
    await waitFor(() => expect(container.querySelectorAll('.leaflet-marker-icon')).toHaveLength(1));

    const pathCountBefore = container.querySelectorAll('path.leaflet-interactive').length;

    await user.click(screen.getByRole('button', { name: /current locations only/i }));

    await waitFor(() => {
      expect(container.querySelectorAll('path.leaflet-interactive').length).toBeGreaterThan(
        pathCountBefore,
      );
    });
  });

  it('shows the welcome dialog once, dismissing it for future visits', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(validYaml) }),
    );
    const user = userEvent.setup();
    renderAt('/view?d=https://example.com/story.yaml');

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(isWelcomeDismissed()).toBe(false);

    await user.click(screen.getByRole('button', { name: /got it/i }));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));

    expect(isWelcomeDismissed()).toBe(true);
  });

  it('does not show the welcome dialog again once already dismissed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(validYaml) }),
    );
    localStorage.setItem('spoiler-maps:view-welcome-dismissed', 'true');

    renderAt('/view?d=https://example.com/story.yaml');

    await screen.findByText('Jon Snow');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('reloads when navigating from one data URL to another without unmounting', async () => {
    localStorage.setItem('spoiler-maps:view-welcome-dismissed', 'true');
    const otherYaml = validYaml.replace('Jon Snow', 'Daenerys Targaryen');
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(url.includes('other') ? otherYaml : validYaml),
        }),
      ),
    );
    const user = userEvent.setup();
    renderAt('/view?d=https://example.com/story.yaml');

    await screen.findByText('Jon Snow');
    await user.click(screen.getByRole('link', { name: /switch map/i }));

    expect(await screen.findByText('Daenerys Targaryen')).toBeInTheDocument();
  });

  it('does not update state after unmounting while the document is still loading', async () => {
    let resolveFetch: (value: { ok: boolean; text: () => Promise<string> }) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );
    const { unmount } = renderAt('/view?d=https://example.com/story.yaml');
    unmount();

    resolveFetch!({ ok: true, text: () => Promise.resolve(validYaml) });
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('does not update state after unmounting while the document load is failing', async () => {
    let rejectFetch: (reason: unknown) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise((_resolve, reject) => {
            rejectFetch = reject;
          }),
      ),
    );
    const { unmount } = renderAt('/view?d=https://example.com/story.yaml');
    unmount();

    rejectFetch!(new Error('network error'));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('stringifies a non-Error rejection from a failed fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('network is down'));

    renderAt('/view?d=https://example.com/story.yaml');

    expect(await screen.findByText('network is down')).toBeInTheDocument();
  });
});
