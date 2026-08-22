import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createBook,
  createCharacter,
  createCharacterPosition,
  createChapter,
  createEpisode,
  createStory,
  createTvSeason,
  listCharacterPositionsForCharacter,
  type CharacterPosition,
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
    minZoom: 0,
    maxZoom: 19,
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
    sortOrder: 0,
    url: null,
  });
  return { storyId, characterId: character.id };
}

const INITIAL_POSITION: LatLng = { lat: 39.8283, lng: -98.5795 };

function DraggableWrapper({
  storyId,
  characterId,
  existingPosition = null,
  isDrawingTail = false,
  tailDraftPoints = [],
  onStartDrawingTail,
  onFinishDrawingTail,
}: {
  storyId: number;
  characterId: number;
  existingPosition?: CharacterPosition | null;
  isDrawingTail?: boolean;
  tailDraftPoints?: LatLng[];
  onStartDrawingTail?: () => void;
  onFinishDrawingTail?: () => void;
}) {
  const [position, setPosition] = useState<LatLng | null>(
    existingPosition?.position ?? INITIAL_POSITION,
  );
  return (
    <>
      <PositionPanel
        storyId={storyId}
        characterId={characterId}
        index={1}
        position={position}
        onBack={vi.fn()}
        existingPosition={existingPosition}
        isDrawingTail={isDrawingTail}
        tailDraftPoints={tailDraftPoints}
        onStartDrawingTail={onStartDrawingTail ?? vi.fn()}
        onFinishDrawingTail={onFinishDrawingTail ?? vi.fn()}
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
      <PositionPanel
        storyId={storyId}
        characterId={1}
        index={3}
        position={null}
        existingPosition={null}
        isDrawingTail={false}
        tailDraftPoints={[]}
        onStartDrawingTail={vi.fn()}
        onFinishDrawingTail={vi.fn()}
        onBack={onBack}
      />,
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
        existingPosition={null}
        isDrawingTail={false}
        tailDraftPoints={[]}
        onStartDrawingTail={vi.fn()}
        onFinishDrawingTail={vi.fn()}
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
        existingPosition={null}
        isDrawingTail={false}
        tailDraftPoints={[]}
        onStartDrawingTail={vi.fn()}
        onFinishDrawingTail={vi.fn()}
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
        existingPosition={null}
        isDrawingTail={false}
        tailDraftPoints={[]}
        onStartDrawingTail={vi.fn()}
        onFinishDrawingTail={vi.fn()}
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
        existingPosition={null}
        isDrawingTail={false}
        tailDraftPoints={[]}
        onStartDrawingTail={vi.fn()}
        onFinishDrawingTail={vi.fn()}
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
        existingPosition={null}
        isDrawingTail={false}
        tailDraftPoints={[]}
        onStartDrawingTail={vi.fn()}
        onFinishDrawingTail={vi.fn()}
      />,
    );

    await screen.findByText(/episode range/i);
    await user.click(screen.getByLabelText(/^start episode$/i));

    expect(
      await screen.findByRole('option', { name: '1. S01E01: Winter Is Coming' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: '2. S02E01: The North Remembers' }),
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
        existingPosition={null}
        isDrawingTail={false}
        tailDraftPoints={[]}
        onStartDrawingTail={vi.fn()}
        onFinishDrawingTail={vi.fn()}
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
        existingPosition={null}
        isDrawingTail={false}
        tailDraftPoints={[]}
        onStartDrawingTail={vi.fn()}
        onFinishDrawingTail={vi.fn()}
      />,
    );

    await user.click(await screen.findByLabelText(/^start episode$/i));

    expect(
      await screen.findByRole('option', { name: '1. S01E01: Untitled Episode' }),
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
        existingPosition={null}
        isDrawingTail={false}
        tailDraftPoints={[]}
        onStartDrawingTail={vi.fn()}
        onFinishDrawingTail={vi.fn()}
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
        existingPosition={null}
        isDrawingTail={false}
        tailDraftPoints={[]}
        onStartDrawingTail={vi.fn()}
        onFinishDrawingTail={vi.fn()}
      />,
    );

    const deadCheckbox = screen.getByRole('checkbox', { name: /dead/i });
    expect(deadCheckbox).not.toBeChecked();

    await user.click(deadCheckbox);
    expect(deadCheckbox).toBeChecked();
  });

  it('types into the Note field', async () => {
    const storyId = await seedStoryId();
    const user = userEvent.setup();
    render(
      <PositionPanel
        storyId={storyId}
        characterId={1}
        index={1}
        position={null}
        onBack={vi.fn()}
        existingPosition={null}
        isDrawingTail={false}
        tailDraftPoints={[]}
        onStartDrawingTail={vi.fn()}
        onFinishDrawingTail={vi.fn()}
      />,
    );

    const noteField = screen.getByLabelText(/^note$/i);
    await user.type(noteField, 'Hiding at the Wall');

    expect(noteField).toHaveValue('Hiding at the Wall');
  });

  it('shows the "Add a tail" button with its tooltip, disabled until a position is set', async () => {
    const { storyId, characterId } = await seedCharacter();
    const user = userEvent.setup();
    const onStartDrawingTail = vi.fn();
    const { rerender } = render(
      <PositionPanel
        storyId={storyId}
        characterId={characterId}
        index={1}
        position={null}
        onBack={vi.fn()}
        existingPosition={null}
        isDrawingTail={false}
        tailDraftPoints={[]}
        onStartDrawingTail={onStartDrawingTail}
        onFinishDrawingTail={vi.fn()}
      />,
    );

    const tailButton = screen.getByRole('button', { name: /add a tail/i });
    expect(tailButton).toBeDisabled();

    // Hover the Tooltip's wrapping <span>, not the disabled button itself:
    // a disabled element gets pointer-events: none, which blocks hover.
    await user.hover(tailButton.parentElement!);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Add a tail');

    rerender(
      <PositionPanel
        storyId={storyId}
        characterId={characterId}
        index={1}
        position={{ lat: 51.5, lng: -0.1278 }}
        onBack={vi.fn()}
        existingPosition={null}
        isDrawingTail={false}
        tailDraftPoints={[]}
        onStartDrawingTail={onStartDrawingTail}
        onFinishDrawingTail={vi.fn()}
      />,
    );

    const enabledTailButton = screen.getByRole('button', { name: /add a tail/i });
    expect(enabledTailButton).toBeEnabled();
    await user.click(enabledTailButton);
    expect(onStartDrawingTail).toHaveBeenCalledTimes(1);

    await waitFor(async () => {
      expect(await listCharacterPositionsForCharacter(characterId)).toHaveLength(1);
    });
  });

  it('shows Save/Cancel instead of the tail button while drawing, and Save persists the drawn points', async () => {
    const { storyId, characterId } = await seedCharacter();
    const onFinishDrawingTail = vi.fn();
    const user = userEvent.setup();
    render(
      <DraggableWrapper
        storyId={storyId}
        characterId={characterId}
        isDrawingTail
        tailDraftPoints={[
          { lat: 51.5, lng: -0.1278 },
          { lat: 52, lng: -1 },
        ]}
        onFinishDrawingTail={onFinishDrawingTail}
      />,
    );

    expect(screen.queryByRole('button', { name: /add a tail/i })).not.toBeInTheDocument();
    // The marker itself must actually move before any position row exists
    // to attach a tail to.
    await user.click(screen.getByRole('button', { name: /simulate drag 1/i }));
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    expect(onFinishDrawingTail).toHaveBeenCalledTimes(1);
    await waitFor(async () => {
      const [saved] = await listCharacterPositionsForCharacter(characterId);
      expect(saved.tail).toEqual([
        { lat: 51.5, lng: -0.1278 },
        { lat: 52, lng: -1 },
      ]);
    });
  });

  it('discards the drawn points when Cancel is clicked', async () => {
    const { storyId, characterId } = await seedCharacter();
    const onFinishDrawingTail = vi.fn();
    const user = userEvent.setup();
    render(
      <DraggableWrapper
        storyId={storyId}
        characterId={characterId}
        isDrawingTail
        tailDraftPoints={[{ lat: 51.5, lng: -0.1278 }]}
        onFinishDrawingTail={onFinishDrawingTail}
      />,
    );

    await user.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(onFinishDrawingTail).toHaveBeenCalledTimes(1);
    // Nothing has moved yet, so no position row exists at all — proving
    // Cancel didn't trigger a save.
    expect(await listCharacterPositionsForCharacter(characterId)).toEqual([]);
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
        existingPosition={null}
        isDrawingTail={false}
        tailDraftPoints={[]}
        onStartDrawingTail={vi.fn()}
        onFinishDrawingTail={vi.fn()}
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
    expect(saved.note).toBeNull();
  });

  it('saves a typed note, trimmed, as part of the created position', async () => {
    const { storyId, characterId } = await seedCharacter();
    const user = userEvent.setup();
    render(<DraggableWrapper storyId={storyId} characterId={characterId} />);

    await user.type(screen.getByLabelText(/^note$/i), '  Hiding at the Wall  ');
    await user.click(screen.getByRole('button', { name: /simulate drag 1/i }));

    await waitFor(async () => {
      const [saved] = await listCharacterPositionsForCharacter(characterId);
      expect(saved.note).toBe('Hiding at the Wall');
    });
  });

  it('clears a blank note back to null', async () => {
    const { storyId, characterId } = await seedCharacter();
    const existingPosition = await createCharacterPosition({
      characterId,
      position: INITIAL_POSITION,
      dead: false,
      note: 'Hiding at the Wall',
      tail: null,
      chapterRange: null,
      episodeRange: null,
    });
    const user = userEvent.setup();
    render(
      <DraggableWrapper
        storyId={storyId}
        characterId={characterId}
        existingPosition={existingPosition}
      />,
    );

    const noteField = screen.getByLabelText(/^note$/i);
    expect(noteField).toHaveValue('Hiding at the Wall');
    await user.clear(noteField);

    await waitFor(async () => {
      const [updated] = await listCharacterPositionsForCharacter(characterId);
      expect(updated.note).toBeNull();
    });
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

  it('prefills its fields from an existing position', async () => {
    const { storyId, characterId } = await seedCharacter();
    const existingPosition = await createCharacterPosition({
      characterId,
      position: INITIAL_POSITION,
      dead: true,
      note: null,
      tail: null,
      chapterRange: null,
      episodeRange: null,
    });
    render(
      <DraggableWrapper
        storyId={storyId}
        characterId={characterId}
        existingPosition={existingPosition}
      />,
    );

    expect(screen.getByRole('checkbox', { name: /dead/i })).toBeChecked();
  });

  it('prefills the chapter and episode range selects from an existing position', async () => {
    const { storyId, characterId } = await seedCharacter();
    const book = await createBook({
      storyId,
      name: 'A Game of Thrones',
      author: null,
      url: null,
      sortOrder: 0,
    });
    const chapter = await createChapter({
      bookId: book.id,
      name: 'Prologue',
      url: null,
      sortOrder: 0,
    });
    const season = await createTvSeason({ storyId, url: null, sortOrder: 0 });
    const episode = await createEpisode({
      seasonId: season.id,
      name: 'Winter Is Coming',
      url: null,
      sortOrder: 0,
    });
    const existingPosition = await createCharacterPosition({
      characterId,
      position: INITIAL_POSITION,
      dead: false,
      note: null,
      tail: null,
      chapterRange: { startChapterId: chapter.id, endChapterId: null },
      episodeRange: { startEpisodeId: episode.id, endEpisodeId: null },
    });
    render(
      <DraggableWrapper
        storyId={storyId}
        characterId={characterId}
        existingPosition={existingPosition}
      />,
    );

    expect(await screen.findByLabelText(/^start chapter$/i)).toHaveTextContent('1. AGOT: Prologue');
    expect(screen.getByLabelText(/^end chapter$/i)).toHaveTextContent('Open');
    expect(screen.getByLabelText(/^start episode$/i)).toHaveTextContent(
      '1. S01E01: Winter Is Coming',
    );
  });

  it('does not write to the database merely from opening an existing position', async () => {
    const { storyId, characterId } = await seedCharacter();
    const existingPosition = await createCharacterPosition({
      characterId,
      position: INITIAL_POSITION,
      dead: false,
      note: null,
      tail: null,
      chapterRange: null,
      episodeRange: null,
    });
    render(
      <DraggableWrapper
        storyId={storyId}
        characterId={characterId}
        existingPosition={existingPosition}
      />,
    );

    await screen.findByRole('checkbox', { name: /dead/i });
    await new Promise((resolve) => setTimeout(resolve, 50));

    const [current] = await listCharacterPositionsForCharacter(characterId);
    expect(current).toEqual(existingPosition);
  });

  it('updates (rather than duplicates) an existing position when its marker moves', async () => {
    const { storyId, characterId } = await seedCharacter();
    const existingPosition = await createCharacterPosition({
      characterId,
      position: INITIAL_POSITION,
      dead: false,
      note: null,
      tail: null,
      chapterRange: null,
      episodeRange: null,
    });
    const user = userEvent.setup();
    render(
      <DraggableWrapper
        storyId={storyId}
        characterId={characterId}
        existingPosition={existingPosition}
      />,
    );

    await user.click(screen.getByRole('button', { name: /simulate drag 1/i }));

    await waitFor(async () => {
      const [updated] = await listCharacterPositionsForCharacter(characterId);
      expect(updated.position).toEqual({ lat: 51.5, lng: -0.1278 });
    });

    const allPositions = await listCharacterPositionsForCharacter(characterId);
    expect(allPositions).toHaveLength(1);
    expect(allPositions[0]!.id).toBe(existingPosition.id);
  });
});
