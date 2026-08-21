import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createStory,
  createTvSeason,
  listEpisodesForSeason,
  listTvSeasonsForStory,
  type Episode,
  type TvSeason,
} from '../../../db';
import { resetDatabaseForTests } from '../../../db/client';
import { SeasonItem } from './SeasonItem';

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

async function seedSeason(
  overrides: Partial<Parameters<typeof createTvSeason>[0]> = {},
): Promise<TvSeason> {
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
  return createTvSeason({ storyId: story.id, url: null, sortOrder: 0, ...overrides });
}

function Wrapper({
  initialSeason,
  index,
  episodes: initialEpisodes,
  onDelete,
}: {
  initialSeason: TvSeason;
  index: number;
  episodes: Episode[];
  onDelete?: () => void;
}) {
  const [season, setSeason] = useState(initialSeason);
  const [episodes, setEpisodes] = useState(initialEpisodes);
  const [expanded, setExpanded] = useState(true);
  return (
    <SeasonItem
      season={season}
      index={index}
      episodes={episodes}
      expanded={expanded}
      onToggle={(_event, isExpanded) => setExpanded(isExpanded)}
      onSeasonChange={setSeason}
      onEpisodesChange={setEpisodes}
      onDelete={onDelete ?? vi.fn()}
    />
  );
}

describe('SeasonItem', () => {
  it('shows the season position and episode count in the summary, with a tooltip spelling out the count', async () => {
    const season: TvSeason = { id: 1, storyId: 1, url: null, sortOrder: 0 };
    const user = userEvent.setup();
    render(
      <SeasonItem
        season={season}
        index={2}
        episodes={[
          { id: 1, seasonId: 1, name: 'Winter Is Coming', url: null, sortOrder: 0 },
          { id: 2, seasonId: 1, name: 'The Kingsroad', url: null, sortOrder: 1 },
        ]}
        expanded={false}
        onToggle={vi.fn()}
        onSeasonChange={vi.fn()}
        onEpisodesChange={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Season 3')).toBeInTheDocument();
    const count = screen.getByText('2');
    expect(count).toBeInTheDocument();

    await user.hover(count);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('2 episodes');
  });

  it('uses singular "episode" in the tooltip for a single episode', async () => {
    const season: TvSeason = { id: 1, storyId: 1, url: null, sortOrder: 0 };
    const user = userEvent.setup();
    render(
      <SeasonItem
        season={season}
        index={0}
        episodes={[{ id: 1, seasonId: 1, name: 'Winter Is Coming', url: null, sortOrder: 0 }]}
        expanded={false}
        onToggle={vi.fn()}
        onSeasonChange={vi.fn()}
        onEpisodesChange={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const count = screen.getByText('1');
    await user.hover(count);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('1 episode');
  });

  it('edits and persists the URL field on blur', async () => {
    const season = await seedSeason();
    const user = userEvent.setup();
    render(<Wrapper initialSeason={season} index={0} episodes={[]} />);

    await user.type(screen.getByLabelText(/^url$/i), 'https://example.com/s1');
    await user.tab();

    const [persisted] = await listTvSeasonsForStory(season.storyId);
    expect(persisted.url).toBe('https://example.com/s1');
  });

  it('stores a blank URL as null', async () => {
    const season = await seedSeason({ url: 'https://example.com/s1' });
    const user = userEvent.setup();
    render(<Wrapper initialSeason={season} index={0} episodes={[]} />);

    await user.clear(screen.getByLabelText(/^url$/i));
    await user.tab();

    const [persisted] = await listTvSeasonsForStory(season.storyId);
    expect(persisted.url).toBeNull();
  });

  it('adds an episode and renames it via the episode editor dialog, persisting both', async () => {
    const season = await seedSeason();
    const user = userEvent.setup();
    render(<Wrapper initialSeason={season} index={0} episodes={[]} />);

    await user.click(screen.getByRole('button', { name: /edit episodes/i }));
    await user.click(await screen.findByRole('button', { name: /add episode/i }));

    const nameField = await screen.findByPlaceholderText(/episode name/i);
    await user.type(nameField, 'Winter Is Coming');
    await user.tab();

    const [persisted] = await listEpisodesForSeason(season.id);
    expect(persisted.name).toBe('Winter Is Coming');
  });

  it('asks for confirmation before deleting, and does not delete when cancelled', async () => {
    const season = await seedSeason();
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<Wrapper initialSeason={season} index={0} episodes={[]} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: /delete season/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('calls onDelete once the deletion is confirmed', async () => {
    const season = await seedSeason();
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(
      <Wrapper
        initialSeason={season}
        index={0}
        episodes={[
          { id: 1, seasonId: season.id, name: 'Winter Is Coming', url: null, sortOrder: 0 },
        ]}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByRole('button', { name: /delete season/i }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('1 of its episode');

    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
