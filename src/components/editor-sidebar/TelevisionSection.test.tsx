import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createStory, createTvSeason, listTvSeasonsForStory } from '../../db';
import { resetDatabaseForTests } from '../../db/client';
import { TelevisionSection } from './TelevisionSection';

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
});

async function seedStoryId(): Promise<number> {
  const story = await createStory({
    name: 'A Song of Ice and Fire',
    tileUrlTemplate: null,
    tileLayerAuthor: null,
    tileLayerAttributionUrl: null,
    initialCenter: { lat: 0, lng: 0 },
    initialZoom: 4,
    minZoom: 0,
    maxZoom: 19,
  });
  return story.id;
}

describe('TelevisionSection', () => {
  it('shows a loading state, then "No television seasons yet." for a story with none', async () => {
    const storyId = await seedStoryId();
    render(<TelevisionSection storyId={storyId} />);

    expect(screen.getByText(/loading television seasons/i)).toBeInTheDocument();
    expect(await screen.findByText(/no television seasons yet/i)).toBeInTheDocument();
  });

  it('lists existing seasons by position, with their episode counts', async () => {
    const storyId = await seedStoryId();
    await createTvSeason({ storyId, url: null, sortOrder: 0 });
    render(<TelevisionSection storyId={storyId} />);

    expect(await screen.findByText('Season 1')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('adds a new season at the bottom of the list, expanded, and persists it', async () => {
    const storyId = await seedStoryId();
    await createTvSeason({ storyId, url: null, sortOrder: 0 });
    const user = userEvent.setup();
    render(<TelevisionSection storyId={storyId} />);

    await screen.findByText('Season 1');
    await user.click(screen.getByRole('button', { name: /add season/i }));

    await screen.findByText('Season 2');
    const [existingUrlField, newUrlField] = screen.getAllByLabelText(/^url$/i);
    await waitFor(() => expect(existingUrlField).not.toBeVisible());
    await waitFor(() => expect(newUrlField).toBeVisible());
    expect(await listTvSeasonsForStory(storyId)).toHaveLength(2);
  });

  it('auto-expands the season at the 1-based initialExpandedIndex', async () => {
    const storyId = await seedStoryId();
    await createTvSeason({ storyId, url: 'https://example.com/s1', sortOrder: 0 });
    await createTvSeason({ storyId, url: 'https://example.com/s2', sortOrder: 1 });
    render(<TelevisionSection storyId={storyId} initialExpandedIndex={2} />);

    await screen.findByText('Season 1');
    await waitFor(() => expect(screen.getByDisplayValue('https://example.com/s2')).toBeVisible());
    expect(screen.getByDisplayValue('https://example.com/s1')).not.toBeVisible();
  });

  it('reflects season edits and added episodes, and collapses when the accordion is closed again', async () => {
    const storyId = await seedStoryId();
    await createTvSeason({ storyId, url: null, sortOrder: 0 });
    const user = userEvent.setup();
    render(<TelevisionSection storyId={storyId} />);

    await user.click(await screen.findByText('Season 1'));

    const urlField = screen.getByLabelText(/^url$/i);
    await user.type(urlField, 'https://example.com/s1');
    await waitFor(() => expect(urlField).toHaveValue('https://example.com/s1'));

    await user.click(screen.getByRole('button', { name: /edit episodes/i }));
    await user.click(await screen.findByRole('button', { name: /add episode/i }));
    expect(await screen.findByText('1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByText('Season 1'));
    await waitFor(() => expect(urlField).not.toBeVisible());
  });

  it('editing one season does not affect a sibling season', async () => {
    const storyId = await seedStoryId();
    await createTvSeason({ storyId, url: null, sortOrder: 0 });
    await createTvSeason({ storyId, url: null, sortOrder: 1 });
    const user = userEvent.setup();
    render(<TelevisionSection storyId={storyId} />);

    await user.click(await screen.findByText('Season 1'));
    const visibleUrlField = screen
      .getAllByLabelText(/^url$/i)
      .find(
        (field) =>
          window.getComputedStyle(field.closest('.MuiCollapse-root')!).visibility !== 'hidden',
      )!;
    await user.type(visibleUrlField, 'https://example.com/s1');

    await waitFor(() => expect(visibleUrlField).toHaveValue('https://example.com/s1'));
    expect(screen.getByText('Season 2')).toBeInTheDocument();
  });

  it('deletes a season from the database, shifting the remaining season label', async () => {
    const storyId = await seedStoryId();
    await createTvSeason({ storyId, url: 'https://example.com/s1', sortOrder: 0 });
    await createTvSeason({ storyId, url: 'https://example.com/s2', sortOrder: 1 });
    const user = userEvent.setup();
    render(<TelevisionSection storyId={storyId} />);

    await user.click(await screen.findByText('Season 1'));
    await user.click(screen.getByRole('button', { name: /delete season/i }));
    await user.click(await screen.findByRole('button', { name: /^delete$/i }));

    await waitFor(async () => expect(await listTvSeasonsForStory(storyId)).toHaveLength(1));
    const [remaining] = await listTvSeasonsForStory(storyId);
    expect(remaining.url).toBe('https://example.com/s2');
    expect(screen.getByText('Season 1')).toBeInTheDocument();
  });

  it('does not update state after unmounting while seasons are still loading', async () => {
    const storyId = await seedStoryId();
    await createTvSeason({ storyId, url: null, sortOrder: 0 });
    const { unmount } = render(<TelevisionSection storyId={storyId} />);

    unmount();

    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  it('ignores an out-of-range initialExpandedIndex', async () => {
    const storyId = await seedStoryId();
    await createTvSeason({ storyId, url: 'https://example.com/s1', sortOrder: 0 });
    render(<TelevisionSection storyId={storyId} initialExpandedIndex={5} />);

    await screen.findByText('Season 1');
    expect(screen.getByDisplayValue('https://example.com/s1')).not.toBeVisible();
  });
});
