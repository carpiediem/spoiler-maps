import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBook, createChapter, createEpisode, createStory, createTvSeason } from '../db';
import { resetDatabaseForTests } from '../db/client';
import { MapTimelineControl } from './MapTimelineControl';

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

async function seedTwoChapters(storyId: number, urls: (string | null)[] = [null, null]) {
  const book = await createBook({
    storyId,
    name: 'A Game of Thrones',
    author: null,
    url: null,
    sortOrder: 0,
  });
  const chapter1 = await createChapter({
    bookId: book.id,
    name: 'Prologue',
    url: urls[0],
    sortOrder: 0,
  });
  const chapter2 = await createChapter({
    bookId: book.id,
    name: 'Bran',
    url: urls[1],
    sortOrder: 1,
  });
  return { book, chapter1, chapter2 };
}

async function seedTwoEpisodes(storyId: number) {
  const season = await createTvSeason({ storyId, url: null, sortOrder: 0 });
  const episode1 = await createEpisode({
    seasonId: season.id,
    name: 'Winter Is Coming',
    url: null,
    sortOrder: 0,
  });
  const episode2 = await createEpisode({
    seasonId: season.id,
    name: 'The Kingsroad',
    url: null,
    sortOrder: 1,
  });
  return { season, episode1, episode2 };
}

describe('MapTimelineControl', () => {
  it('renders nothing for a null storyId', () => {
    const { container } = render(<MapTimelineControl storyId={null} onChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for a story with no books or seasons', async () => {
    const storyId = await seedStoryId();
    const { container } = render(<MapTimelineControl storyId={storyId} onChange={vi.fn()} />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a placeholder and disables navigation when the story has a book but no chapters', async () => {
    const storyId = await seedStoryId();
    await createBook({
      storyId,
      name: 'A Game of Thrones',
      author: null,
      url: null,
      sortOrder: 0,
    });
    render(<MapTimelineControl storyId={storyId} onChange={vi.fn()} />);

    expect(await screen.findByText('—')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous Chapter' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next Chapter' })).toBeDisabled();
    expect(screen.getByRole('slider')).toBeDisabled();
  });

  it('clicking the already-active mode button leaves the mode unchanged', async () => {
    const storyId = await seedStoryId();
    await seedTwoChapters(storyId);
    const user = userEvent.setup();
    render(<MapTimelineControl storyId={storyId} onChange={vi.fn()} />);

    const booksButton = await screen.findByRole('button', { name: 'Books' });
    expect(booksButton).toHaveAttribute('aria-pressed', 'true');

    await user.click(booksButton);

    expect(booksButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('AGOT: Bran')).toBeInTheDocument();
  });

  it('defaults to book mode, starts on the last chapter, and reports it', async () => {
    const storyId = await seedStoryId();
    await seedTwoChapters(storyId);
    const onChange = vi.fn();
    render(<MapTimelineControl storyId={storyId} onChange={onChange} />);

    expect(await screen.findByText('AGOT: Bran')).toBeInTheDocument();
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('book', 2));
    expect(screen.getByRole('button', { name: 'Books' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('defaults to tv mode when the story has only seasons', async () => {
    const storyId = await seedStoryId();
    await seedTwoEpisodes(storyId);
    const onChange = vi.fn();
    render(<MapTimelineControl storyId={storyId} onChange={onChange} />);

    expect(await screen.findByText('S01E02: The Kingsroad')).toBeInTheDocument();
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('tv', 2));
    expect(screen.getByRole('button', { name: 'TV seasons' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('switches modes, jumping to the new medium’s last entry', async () => {
    const storyId = await seedStoryId();
    await seedTwoChapters(storyId);
    await seedTwoEpisodes(storyId);
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MapTimelineControl storyId={storyId} onChange={onChange} />);

    await screen.findByText('AGOT: Bran');
    await user.click(screen.getByRole('button', { name: 'TV seasons' }));

    expect(await screen.findByText('S01E02: The Kingsroad')).toBeInTheDocument();
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('tv', 2));
  });

  it('steps backward and forward with the arrow buttons, disabling them at the ends', async () => {
    const storyId = await seedStoryId();
    await seedTwoChapters(storyId);
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MapTimelineControl storyId={storyId} onChange={onChange} />);

    await screen.findByText('AGOT: Bran');
    const previous = screen.getByRole('button', { name: 'Previous Chapter' });
    const next = screen.getByRole('button', { name: 'Next Chapter' });
    expect(next).toBeDisabled();

    await user.click(previous);
    expect(await screen.findByText('AGOT: Prologue')).toBeInTheDocument();
    expect(previous).toBeDisabled();
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('book', 1));

    await user.click(next);
    expect(await screen.findByText('AGOT: Bran')).toBeInTheDocument();
    expect(next).toBeDisabled();
  });

  it('moves the scrub position via the slider', async () => {
    const storyId = await seedStoryId();
    await seedTwoChapters(storyId);
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MapTimelineControl storyId={storyId} onChange={onChange} />);

    await screen.findByText('AGOT: Bran');
    const slider = screen.getByRole('slider');
    slider.focus();
    await user.keyboard('{ArrowLeft}');

    expect(await screen.findByText('AGOT: Prologue')).toBeInTheDocument();
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('book', 1));
  });

  it('hyperlinks the label when the current chapter has a URL', async () => {
    const storyId = await seedStoryId();
    await seedTwoChapters(storyId, [null, 'https://example.com/bran']);
    render(<MapTimelineControl storyId={storyId} onChange={vi.fn()} />);

    const link = await screen.findByRole('link', { name: 'AGOT: Bran' });
    expect(link).toHaveAttribute('href', 'https://example.com/bran');
  });

  it('does not hyperlink the label when the current chapter has no URL', async () => {
    const storyId = await seedStoryId();
    await seedTwoChapters(storyId);
    render(<MapTimelineControl storyId={storyId} onChange={vi.fn()} />);

    await screen.findByText('AGOT: Bran');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
