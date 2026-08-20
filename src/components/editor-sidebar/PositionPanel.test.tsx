import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createBook,
  createCharacter,
  createChapter,
  createEpisode,
  createStory,
  createTvSeason,
  listCharacterPositionsForCharacter,
  type LatLng,
} from '../../db';
import { resetDatabaseForTests } from '../../db/client';
import { PositionPanel } from './PositionPanel';

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
  });
  return story.id;
}

async function seedCharacter(): Promise<{ storyId: number; characterId: number }> {
  const storyId = await seedStoryId();
  const character = await createCharacter({
    storyId,
    name: 'Jon Snow',
    group: null,
    icon: null,
    color: null,
  });
  return { storyId, characterId: character.id };
}

const INITIAL_POSITION: LatLng = { lat: 39.8283, lng: -98.5795 };

function DraggableWrapper({ storyId, characterId }: { storyId: number; characterId: number }) {
  const [position, setPosition] = useState<LatLng | null>(INITIAL_POSITION);
  return (
    <>
      <PositionPanel
        storyId={storyId}
        characterId={characterId}
        index={1}
        position={position}
        onBack={vi.fn()}
      />
      <button onClick={() => setPosition({ lat: 51.5, lng: -0.1278 })}>Simulate drag 1</button>
      <button onClick={() => setPosition({ lat: 40.7128, lng: -74.006 })}>Simulate drag 2</button>
    </>
  );
}

describe('PositionPanel', () => {
  it('shows the position index in the header and calls onBack', async () => {
    const storyId = await seedStoryId();
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(
      <PositionPanel storyId={storyId} characterId={1} index={3} position={null} onBack={onBack} />,
    );

    expect(screen.getByText('Position 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /back to sidebar/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('prompts to drag the pin when no position is set yet', async () => {
    const storyId = await seedStoryId();
    render(
      <PositionPanel
        storyId={storyId}
        characterId={1}
        index={1}
        position={null}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByText(/drag the pin on the map/i)).toBeInTheDocument();
  });

  it('shows the lat/lng once a position is set', async () => {
    const storyId = await seedStoryId();
    render(
      <PositionPanel
        storyId={storyId}
        characterId={1}
        index={1}
        position={{ lat: 51.5, lng: -0.1278 }}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByText('51.5000, -0.1278')).toBeInTheDocument();
  });

  it('hides the Chapter Range and Episode Range sections when there are no books or seasons', async () => {
    const storyId = await seedStoryId();
    render(
      <PositionPanel
        storyId={storyId}
        characterId={1}
        index={1}
        position={null}
        onBack={vi.fn()}
      />,
    );

    await waitFor(() => expect(screen.queryByText(/chapter range/i)).not.toBeInTheDocument());
    expect(screen.queryByText(/episode range/i)).not.toBeInTheDocument();
  });

  it('shows the Chapter Range section with an overall-indexed, book-grouped chapter list', async () => {
    const storyId = await seedStoryId();
    const book1 = await createBook({
      storyId,
      name: 'A Game of Thrones',
      author: null,
      url: null,
      sortOrder: 0,
    });
    const book2 = await createBook({
      storyId,
      name: 'A Clash of Kings',
      author: null,
      url: null,
      sortOrder: 1,
    });
    await createChapter({ bookId: book1.id, name: 'Prologue', url: null, sortOrder: 0 });
    await createChapter({ bookId: book1.id, name: 'Bran', url: null, sortOrder: 1 });
    await createChapter({ bookId: book2.id, name: 'Prologue', url: null, sortOrder: 0 });
    const user = userEvent.setup();
    render(
      <PositionPanel
        storyId={storyId}
        characterId={1}
        index={1}
        position={null}
        onBack={vi.fn()}
      />,
    );

    await screen.findByText(/chapter range/i);
    await user.click(screen.getByLabelText(/^start chapter$/i));

    expect(await screen.findByRole('option', { name: '1. AGOT: Prologue' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '2. AGOT: Bran' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '3. ACOK: Prologue' })).toBeInTheDocument();
  });

  it('shows the Episode Range section with an overall-indexed, season-grouped episode list', async () => {
    const storyId = await seedStoryId();
    const season1 = await createTvSeason({ storyId, url: null, sortOrder: 0 });
    const season2 = await createTvSeason({ storyId, url: null, sortOrder: 1 });
    await createEpisode({
      seasonId: season1.id,
      name: 'Winter Is Coming',
      url: null,
      sortOrder: 0,
    });
    await createEpisode({
      seasonId: season2.id,
      name: 'The North Remembers',
      url: null,
      sortOrder: 0,
    });
    const user = userEvent.setup();
    render(
      <PositionPanel
        storyId={storyId}
        characterId={1}
        index={1}
        position={null}
        onBack={vi.fn()}
      />,
    );

    await screen.findByText(/episode range/i);
    await user.click(screen.getByLabelText(/^start episode$/i));

    expect(
      await screen.findByRole('option', { name: '1. Season 1: Winter Is Coming' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: '2. Season 2: The North Remembers' }),
    ).toBeInTheDocument();
  });

  it('falls back to "Untitled Book"/"Untitled Chapter" for blank names', async () => {
    const book = await createBook({
      storyId: await seedStoryId(),
      name: '',
      author: null,
      url: null,
      sortOrder: 0,
    });
    await createChapter({ bookId: book.id, name: '', url: null, sortOrder: 0 });
    const user = userEvent.setup();
    render(
      <PositionPanel
        storyId={book.storyId}
        characterId={1}
        index={1}
        position={null}
        onBack={vi.fn()}
      />,
    );

    await user.click(await screen.findByLabelText(/^start chapter$/i));

    expect(
      await screen.findByRole('option', { name: '1. Untitled Book: Untitled Chapter' }),
    ).toBeInTheDocument();
  });

  it('falls back to "Untitled Episode" for a blank episode name', async () => {
    const storyId = await seedStoryId();
    const season = await createTvSeason({ storyId, url: null, sortOrder: 0 });
    await createEpisode({ seasonId: season.id, name: '', url: null, sortOrder: 0 });
    const user = userEvent.setup();
    render(
      <PositionPanel
        storyId={storyId}
        characterId={1}
        index={1}
        position={null}
        onBack={vi.fn()}
      />,
    );

    await user.click(await screen.findByLabelText(/^start episode$/i));

    expect(
      await screen.findByRole('option', { name: '1. Season 1: Untitled Episode' }),
    ).toBeInTheDocument();
  });

  it('selects a chapter as the range start, and can be set back to open', async () => {
    const storyId = await seedStoryId();
    const book = await createBook({
      storyId,
      name: 'A Game of Thrones',
      author: null,
      url: null,
      sortOrder: 0,
    });
    await createChapter({ bookId: book.id, name: 'Prologue', url: null, sortOrder: 0 });
    const user = userEvent.setup();
    render(
      <PositionPanel
        storyId={storyId}
        characterId={1}
        index={1}
        position={null}
        onBack={vi.fn()}
      />,
    );

    await user.click(await screen.findByLabelText(/^start chapter$/i));
    await user.click(await screen.findByRole('option', { name: '1. AGOT: Prologue' }));

    expect(screen.getByLabelText(/^start chapter$/i)).toHaveTextContent('1. AGOT: Prologue');

    await user.click(screen.getByLabelText(/^start chapter$/i));
    await user.click(await screen.findByRole('option', { name: /^open$/i }));

    expect(screen.getByLabelText(/^start chapter$/i)).toHaveTextContent('Open');
  });

  it('toggles the Dead checkbox', async () => {
    const storyId = await seedStoryId();
    const user = userEvent.setup();
    render(
      <PositionPanel
        storyId={storyId}
        characterId={1}
        index={1}
        position={null}
        onBack={vi.fn()}
      />,
    );

    const deadCheckbox = screen.getByRole('checkbox', { name: /dead/i });
    expect(deadCheckbox).not.toBeChecked();

    await user.click(deadCheckbox);
    expect(deadCheckbox).toBeChecked();
  });

  it('does not update state after unmounting while books/seasons are still loading', async () => {
    const storyId = await seedStoryId();
    const { unmount } = render(
      <PositionPanel
        storyId={storyId}
        characterId={1}
        index={1}
        position={null}
        onBack={vi.fn()}
      />,
    );

    unmount();

    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  it('does not persist a position while it stays at its initial value, even if fields change', async () => {
    const { storyId, characterId } = await seedCharacter();
    const user = userEvent.setup();
    render(<DraggableWrapper storyId={storyId} characterId={characterId} />);

    await user.click(screen.getByRole('checkbox', { name: /dead/i }));

    expect(await listCharacterPositionsForCharacter(characterId)).toEqual([]);
  });

  it('creates the position once the marker moves from its initial value', async () => {
    const { storyId, characterId } = await seedCharacter();
    const user = userEvent.setup();
    render(<DraggableWrapper storyId={storyId} characterId={characterId} />);

    await user.click(screen.getByRole('button', { name: /simulate drag 1/i }));

    await waitFor(async () => {
      expect(await listCharacterPositionsForCharacter(characterId)).toHaveLength(1);
    });
    const [saved] = await listCharacterPositionsForCharacter(characterId);
    expect(saved.position).toEqual({ lat: 51.5, lng: -0.1278 });
    expect(saved.dead).toBe(false);
  });

  it('updates the same position row on further marker moves and field changes', async () => {
    const { storyId, characterId } = await seedCharacter();
    const user = userEvent.setup();
    render(<DraggableWrapper storyId={storyId} characterId={characterId} />);

    await user.click(screen.getByRole('button', { name: /simulate drag 1/i }));
    await waitFor(async () => {
      expect(await listCharacterPositionsForCharacter(characterId)).toHaveLength(1);
    });
    const [firstSaved] = await listCharacterPositionsForCharacter(characterId);

    await user.click(screen.getByRole('checkbox', { name: /dead/i }));
    await waitFor(async () => {
      const [updated] = await listCharacterPositionsForCharacter(characterId);
      expect(updated.dead).toBe(true);
    });

    await user.click(screen.getByRole('button', { name: /simulate drag 2/i }));
    await waitFor(async () => {
      const [updated] = await listCharacterPositionsForCharacter(characterId);
      expect(updated.position).toEqual({ lat: 40.7128, lng: -74.006 });
    });

    const allPositions = await listCharacterPositionsForCharacter(characterId);
    expect(allPositions).toHaveLength(1);
    expect(allPositions[0]!.id).toBe(firstSaved.id);
    expect(allPositions[0]!.dead).toBe(true);
  });
});
