import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createBook,
  createChapter,
  createCharacter,
  createCharacterPosition,
  createStory,
  listCharactersForStory,
} from '../../db';
import { resetDatabaseForTests } from '../../db/client';
import { CharactersSection } from './CharactersSection';

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

describe('CharactersSection', () => {
  it('shows a loading state, then "No characters yet." for a story with none', async () => {
    const storyId = await seedStoryId();
    render(
      <CharactersSection
        storyId={storyId}
        onAddPosition={vi.fn()}
        onEditPosition={vi.fn()}
        positionsVersion={0}
        onVisiblePositionsChange={vi.fn()}
        onVisibleTailsChange={vi.fn()}
        timelineMode="book"
        timelineIndex={1}
        sectionExpanded
      />,
    );

    expect(screen.getByText(/loading characters/i)).toBeInTheDocument();
    expect(await screen.findByText(/no characters yet/i)).toBeInTheDocument();
  });

  it('lists existing characters', async () => {
    const storyId = await seedStoryId();
    await createCharacter({
      storyId,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: null,
      sortOrder: 0,
    });
    render(
      <CharactersSection
        storyId={storyId}
        onAddPosition={vi.fn()}
        onEditPosition={vi.fn()}
        positionsVersion={0}
        onVisiblePositionsChange={vi.fn()}
        onVisibleTailsChange={vi.fn()}
        timelineMode="book"
        timelineIndex={1}
        sectionExpanded
      />,
    );

    expect(await screen.findByText('Jon Snow')).toBeInTheDocument();
  });

  it('reports the character count for the story once loaded', async () => {
    const storyId = await seedStoryId();
    await createCharacter({
      storyId,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: null,
      sortOrder: 1,
    });
    await createCharacter({
      storyId,
      name: 'Daenerys Targaryen',
      group: null,
      icon: null,
      color: null,
      sortOrder: 2,
    });
    const onCountChange = vi.fn();
    render(
      <CharactersSection
        storyId={storyId}
        onCountChange={onCountChange}
        onAddPosition={vi.fn()}
        onEditPosition={vi.fn()}
        positionsVersion={0}
        onVisiblePositionsChange={vi.fn()}
        onVisibleTailsChange={vi.fn()}
        timelineMode="book"
        timelineIndex={1}
        sectionExpanded
      />,
    );

    await vi.waitFor(() => expect(onCountChange).toHaveBeenCalledWith(2));
  });

  it('reports zero for a story with no characters', async () => {
    const storyId = await seedStoryId();
    const onCountChange = vi.fn();
    render(
      <CharactersSection
        storyId={storyId}
        onCountChange={onCountChange}
        onAddPosition={vi.fn()}
        onEditPosition={vi.fn()}
        positionsVersion={0}
        onVisiblePositionsChange={vi.fn()}
        onVisibleTailsChange={vi.fn()}
        timelineMode="book"
        timelineIndex={1}
        sectionExpanded
      />,
    );

    await vi.waitFor(() => expect(onCountChange).toHaveBeenCalledWith(0));
  });

  it('adds a new character, expanded, and persists it', async () => {
    const storyId = await seedStoryId();
    await createCharacter({
      storyId,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: null,
      sortOrder: 3,
    });
    const user = userEvent.setup();
    render(
      <CharactersSection
        storyId={storyId}
        onAddPosition={vi.fn()}
        onEditPosition={vi.fn()}
        positionsVersion={0}
        onVisiblePositionsChange={vi.fn()}
        onVisibleTailsChange={vi.fn()}
        timelineMode="book"
        timelineIndex={1}
        sectionExpanded
      />,
    );

    await screen.findByText('Jon Snow');
    await user.click(screen.getByRole('button', { name: /add character/i }));

    await screen.findByText('Unnamed Character');
    const [existingNameField, newNameField] = screen.getAllByLabelText(/^name$/i);
    await waitFor(() => expect(existingNameField).not.toBeVisible());
    await waitFor(() => expect(newNameField).toBeVisible());
    expect(await listCharactersForStory(storyId)).toHaveLength(2);
  });

  it('auto-expands the character at the 1-based initialExpandedIndex', async () => {
    const storyId = await seedStoryId();
    await createCharacter({
      storyId,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: null,
      sortOrder: 4,
    });
    await createCharacter({
      storyId,
      name: 'Daenerys Targaryen',
      group: null,
      icon: null,
      color: null,
      sortOrder: 5,
    });
    render(
      <CharactersSection
        storyId={storyId}
        initialExpandedIndex={2}
        onAddPosition={vi.fn()}
        onEditPosition={vi.fn()}
        positionsVersion={0}
        onVisiblePositionsChange={vi.fn()}
        onVisibleTailsChange={vi.fn()}
        timelineMode="book"
        timelineIndex={1}
        sectionExpanded
      />,
    );

    await screen.findByText('Jon Snow');
    await waitFor(() => {
      const visibleNameField = screen
        .getAllByLabelText(/^name$/i)
        .find(
          (field) =>
            window.getComputedStyle(field.closest('.MuiCollapse-root')!).visibility !== 'hidden',
        );
      expect(visibleNameField).toHaveValue('Daenerys Targaryen');
    });
  });

  it('ignores an out-of-range initialExpandedIndex', async () => {
    const storyId = await seedStoryId();
    await createCharacter({
      storyId,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: null,
      sortOrder: 6,
    });
    render(
      <CharactersSection
        storyId={storyId}
        initialExpandedIndex={5}
        onAddPosition={vi.fn()}
        onEditPosition={vi.fn()}
        positionsVersion={0}
        onVisiblePositionsChange={vi.fn()}
        onVisibleTailsChange={vi.fn()}
        timelineMode="book"
        timelineIndex={1}
        sectionExpanded
      />,
    );

    await screen.findByText('Jon Snow');
    expect(screen.getByLabelText(/^name$/i)).not.toBeVisible();
  });

  it('collapses a character when its accordion is closed again', async () => {
    const storyId = await seedStoryId();
    await createCharacter({
      storyId,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: null,
      sortOrder: 7,
    });
    const user = userEvent.setup();
    render(
      <CharactersSection
        storyId={storyId}
        onAddPosition={vi.fn()}
        onEditPosition={vi.fn()}
        positionsVersion={0}
        onVisiblePositionsChange={vi.fn()}
        onVisibleTailsChange={vi.fn()}
        timelineMode="book"
        timelineIndex={1}
        sectionExpanded
      />,
    );

    await user.click(await screen.findByText('Jon Snow'));
    const nameField = screen.getByLabelText(/^name$/i);
    expect(nameField).toBeVisible();

    await user.click(screen.getByText('Jon Snow'));
    await waitFor(() => expect(nameField).not.toBeVisible());
  });

  it('editing one character does not affect a sibling character', async () => {
    const storyId = await seedStoryId();
    await createCharacter({
      storyId,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: null,
      sortOrder: 8,
    });
    await createCharacter({
      storyId,
      name: 'Daenerys Targaryen',
      group: null,
      icon: null,
      color: null,
      sortOrder: 9,
    });
    const user = userEvent.setup();
    render(
      <CharactersSection
        storyId={storyId}
        onAddPosition={vi.fn()}
        onEditPosition={vi.fn()}
        positionsVersion={0}
        onVisiblePositionsChange={vi.fn()}
        onVisibleTailsChange={vi.fn()}
        timelineMode="book"
        timelineIndex={1}
        sectionExpanded
      />,
    );

    await user.click(await screen.findByText('Jon Snow'));
    const visibleNameField = screen
      .getAllByLabelText(/^name$/i)
      .find(
        (field) =>
          window.getComputedStyle(field.closest('.MuiCollapse-root')!).visibility !== 'hidden',
      )!;
    await user.type(visibleNameField, ' Targaryen');

    expect(screen.getByText('Jon Snow Targaryen')).toBeInTheDocument();
    expect(screen.getByText('Daenerys Targaryen')).toBeInTheDocument();
  });

  it('deletes a character from the database and the list, collapsing back to nothing expanded', async () => {
    const storyId = await seedStoryId();
    await createCharacter({
      storyId,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: null,
      sortOrder: 10,
    });
    await createCharacter({
      storyId,
      name: 'Daenerys Targaryen',
      group: null,
      icon: null,
      color: null,
      sortOrder: 11,
    });
    const user = userEvent.setup();
    render(
      <CharactersSection
        storyId={storyId}
        onAddPosition={vi.fn()}
        onEditPosition={vi.fn()}
        positionsVersion={0}
        onVisiblePositionsChange={vi.fn()}
        onVisibleTailsChange={vi.fn()}
        timelineMode="book"
        timelineIndex={1}
        sectionExpanded
      />,
    );

    await user.click(await screen.findByText('Jon Snow'));
    await user.click(screen.getByRole('button', { name: /delete character/i }));
    await user.click(await screen.findByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(screen.queryByText('Jon Snow')).not.toBeInTheDocument());
    expect(screen.getByText('Daenerys Targaryen')).toBeInTheDocument();
    expect(await listCharactersForStory(storyId)).toHaveLength(1);
  });

  it('reorders characters via drag and drop, persisting the new sort order', async () => {
    const storyId = await seedStoryId();
    await createCharacter({
      storyId,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: null,
      sortOrder: 0,
    });
    await createCharacter({
      storyId,
      name: 'Daenerys Targaryen',
      group: null,
      icon: null,
      color: null,
      sortOrder: 1,
    });
    await createCharacter({
      storyId,
      name: 'Tyrion Lannister',
      group: null,
      icon: null,
      color: null,
      sortOrder: 2,
    });
    render(
      <CharactersSection
        storyId={storyId}
        onAddPosition={vi.fn()}
        onEditPosition={vi.fn()}
        positionsVersion={0}
        onVisiblePositionsChange={vi.fn()}
        onVisibleTailsChange={vi.fn()}
        timelineMode="book"
        timelineIndex={1}
        sectionExpanded
      />,
    );

    await screen.findByText('Jon Snow');
    const jonRow = screen.getByRole('button', { name: 'Jon Snow' });
    const tyrionRow = screen.getByRole('button', { name: 'Tyrion Lannister' });

    fireEvent.dragStart(jonRow);
    fireEvent.dragOver(tyrionRow);
    fireEvent.drop(tyrionRow);

    await waitFor(async () => {
      const persisted = await listCharactersForStory(storyId);
      expect(persisted.map((character) => character.name)).toEqual([
        'Daenerys Targaryen',
        'Jon Snow',
        'Tyrion Lannister',
      ]);
    });
  });

  it('un-dims the dragged row once the drag ends without a drop (e.g. cancelled)', async () => {
    const storyId = await seedStoryId();
    await createCharacter({
      storyId,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: null,
      sortOrder: 0,
    });
    render(
      <CharactersSection
        storyId={storyId}
        onAddPosition={vi.fn()}
        onEditPosition={vi.fn()}
        positionsVersion={0}
        onVisiblePositionsChange={vi.fn()}
        onVisibleTailsChange={vi.fn()}
        timelineMode="book"
        timelineIndex={1}
        sectionExpanded
      />,
    );

    await screen.findByText('Jon Snow');
    const jonRow = screen.getByRole('button', { name: 'Jon Snow' });

    fireEvent.dragStart(jonRow);
    expect(jonRow.parentElement).toHaveStyle({ opacity: '0.5' });

    fireEvent.dragEnd(jonRow);
    expect(jonRow.parentElement).toHaveStyle({ opacity: '1' });
  });

  it('reorders to the very start of the list when dropped on the first character', async () => {
    const storyId = await seedStoryId();
    await createCharacter({
      storyId,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: null,
      sortOrder: 0,
    });
    await createCharacter({
      storyId,
      name: 'Daenerys Targaryen',
      group: null,
      icon: null,
      color: null,
      sortOrder: 1,
    });
    render(
      <CharactersSection
        storyId={storyId}
        onAddPosition={vi.fn()}
        onEditPosition={vi.fn()}
        positionsVersion={0}
        onVisiblePositionsChange={vi.fn()}
        onVisibleTailsChange={vi.fn()}
        timelineMode="book"
        timelineIndex={1}
        sectionExpanded
      />,
    );

    await screen.findByText('Jon Snow');
    const jonRow = screen.getByRole('button', { name: 'Jon Snow' });
    const daenerysRow = screen.getByRole('button', { name: 'Daenerys Targaryen' });

    fireEvent.dragStart(daenerysRow);
    fireEvent.dragOver(jonRow);
    fireEvent.drop(jonRow);

    await waitFor(async () => {
      const persisted = await listCharactersForStory(storyId);
      expect(persisted.map((character) => character.name)).toEqual([
        'Daenerys Targaryen',
        'Jon Snow',
      ]);
    });
  });

  it('does nothing when a character is dropped on itself', async () => {
    const storyId = await seedStoryId();
    await createCharacter({
      storyId,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: null,
      sortOrder: 0,
    });
    await createCharacter({
      storyId,
      name: 'Daenerys Targaryen',
      group: null,
      icon: null,
      color: null,
      sortOrder: 1,
    });
    render(
      <CharactersSection
        storyId={storyId}
        onAddPosition={vi.fn()}
        onEditPosition={vi.fn()}
        positionsVersion={0}
        onVisiblePositionsChange={vi.fn()}
        onVisibleTailsChange={vi.fn()}
        timelineMode="book"
        timelineIndex={1}
        sectionExpanded
      />,
    );

    await screen.findByText('Jon Snow');
    const jonRow = screen.getByRole('button', { name: 'Jon Snow' });

    fireEvent.dragStart(jonRow);
    fireEvent.dragOver(jonRow);
    fireEvent.drop(jonRow);

    const persisted = await listCharactersForStory(storyId);
    expect(persisted.map((character) => character.name)).toEqual([
      'Jon Snow',
      'Daenerys Targaryen',
    ]);
  });

  it('does nothing when a drop lands without a drag having started', async () => {
    const storyId = await seedStoryId();
    await createCharacter({
      storyId,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: null,
      sortOrder: 0,
    });
    await createCharacter({
      storyId,
      name: 'Daenerys Targaryen',
      group: null,
      icon: null,
      color: null,
      sortOrder: 1,
    });
    render(
      <CharactersSection
        storyId={storyId}
        onAddPosition={vi.fn()}
        onEditPosition={vi.fn()}
        positionsVersion={0}
        onVisiblePositionsChange={vi.fn()}
        onVisibleTailsChange={vi.fn()}
        timelineMode="book"
        timelineIndex={1}
        sectionExpanded
      />,
    );

    await screen.findByText('Jon Snow');
    const daenerysRow = screen.getByRole('button', { name: 'Daenerys Targaryen' });

    fireEvent.dragOver(daenerysRow);
    fireEvent.drop(daenerysRow);

    const persisted = await listCharactersForStory(storyId);
    expect(persisted.map((character) => character.name)).toEqual([
      'Jon Snow',
      'Daenerys Targaryen',
    ]);
  });

  it('does not update state after unmounting while characters are still loading', async () => {
    const storyId = await seedStoryId();
    await createCharacter({
      storyId,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: null,
      sortOrder: 12,
    });
    const { unmount } = render(
      <CharactersSection
        storyId={storyId}
        onAddPosition={vi.fn()}
        onEditPosition={vi.fn()}
        positionsVersion={0}
        onVisiblePositionsChange={vi.fn()}
        onVisibleTailsChange={vi.fn()}
        timelineMode="book"
        timelineIndex={1}
        sectionExpanded
      />,
    );

    unmount();

    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  it('reports numbered pins for the expanded character once its positions have loaded', async () => {
    const storyId = await seedStoryId();
    const character = await createCharacter({
      storyId,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: '#ff0000',
      sortOrder: 13,
    });
    await createCharacterPosition({
      characterId: character.id,
      position: { lat: 1, lng: 1 },
      dead: false,
      note: null,
      tail: null,
      chapterRange: null,
      episodeRange: null,
    });
    await createCharacterPosition({
      characterId: character.id,
      position: { lat: 2, lng: 2 },
      dead: false,
      note: null,
      tail: null,
      chapterRange: null,
      episodeRange: null,
    });
    const onVisiblePositionsChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CharactersSection
        storyId={storyId}
        onAddPosition={vi.fn()}
        onEditPosition={vi.fn()}
        positionsVersion={0}
        onVisiblePositionsChange={onVisiblePositionsChange}
        onVisibleTailsChange={vi.fn()}
        timelineMode="book"
        timelineIndex={1}
        sectionExpanded
      />,
    );

    await user.click(await screen.findByText('Jon Snow'));

    await waitFor(() =>
      expect(onVisiblePositionsChange).toHaveBeenLastCalledWith([
        {
          characterId: character.id,
          characterPosition: expect.objectContaining({ position: { lat: 1, lng: 1 } }),
          label: '1',
          positionIndex: 1,
          color: '#ff0000',
        },
        {
          characterId: character.id,
          characterPosition: expect.objectContaining({ position: { lat: 2, lng: 2 } }),
          label: '2',
          positionIndex: 2,
          color: '#ff0000',
        },
      ]),
    );
  });

  it('reports every tail at full opacity for the expanded character', async () => {
    const storyId = await seedStoryId();
    const character = await createCharacter({
      storyId,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: '#ff0000',
      sortOrder: 0,
    });
    await createCharacterPosition({
      characterId: character.id,
      position: { lat: 1, lng: 1 },
      dead: false,
      note: null,
      tail: [{ lat: 0.5, lng: 0.5 }],
      chapterRange: null,
      episodeRange: null,
    });
    await createCharacterPosition({
      characterId: character.id,
      position: { lat: 2, lng: 2 },
      dead: false,
      note: null,
      tail: [{ lat: 1.5, lng: 1.5 }],
      chapterRange: null,
      episodeRange: null,
    });
    const onVisibleTailsChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CharactersSection
        storyId={storyId}
        onAddPosition={vi.fn()}
        onEditPosition={vi.fn()}
        positionsVersion={0}
        onVisiblePositionsChange={vi.fn()}
        onVisibleTailsChange={onVisibleTailsChange}
        timelineMode="book"
        timelineIndex={1}
        sectionExpanded
      />,
    );

    await user.click(await screen.findByText('Jon Snow'));

    await waitFor(() =>
      expect(onVisibleTailsChange).toHaveBeenLastCalledWith([
        {
          characterId: character.id,
          points: [
            { lat: 1, lng: 1 },
            { lat: 0.5, lng: 0.5 },
          ],
          color: '#ff0000',
          opacity: 1,
        },
        {
          characterId: character.id,
          points: [
            { lat: 2, lng: 2 },
            { lat: 1.5, lng: 1.5 },
          ],
          color: '#ff0000',
          opacity: 1,
        },
      ]),
    );
  });

  it('clears the pins once the expanded character is collapsed again', async () => {
    const storyId = await seedStoryId();
    const character = await createCharacter({
      storyId,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: null,
      sortOrder: 14,
    });
    await createCharacterPosition({
      characterId: character.id,
      position: { lat: 1, lng: 1 },
      dead: false,
      note: null,
      tail: null,
      chapterRange: null,
      episodeRange: null,
    });
    const onVisiblePositionsChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CharactersSection
        storyId={storyId}
        onAddPosition={vi.fn()}
        onEditPosition={vi.fn()}
        positionsVersion={0}
        onVisiblePositionsChange={onVisiblePositionsChange}
        onVisibleTailsChange={vi.fn()}
        timelineMode="book"
        timelineIndex={1}
        sectionExpanded
      />,
    );

    await user.click(await screen.findByText('Jon Snow'));
    await waitFor(() =>
      expect(onVisiblePositionsChange).toHaveBeenLastCalledWith([expect.any(Object)]),
    );

    await user.click(screen.getByText('Jon Snow'));
    await waitFor(() => expect(onVisiblePositionsChange).toHaveBeenLastCalledWith(null));
  });

  it('collapses the expanded character when the Characters section itself collapses', async () => {
    const storyId = await seedStoryId();
    const character = await createCharacter({
      storyId,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: null,
      sortOrder: 14,
    });
    await createCharacterPosition({
      characterId: character.id,
      position: { lat: 1, lng: 1 },
      dead: false,
      note: null,
      tail: null,
      chapterRange: null,
      episodeRange: null,
    });
    const onVisiblePositionsChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <CharactersSection
        storyId={storyId}
        onAddPosition={vi.fn()}
        onEditPosition={vi.fn()}
        positionsVersion={0}
        onVisiblePositionsChange={onVisiblePositionsChange}
        onVisibleTailsChange={vi.fn()}
        timelineMode="book"
        timelineIndex={1}
        sectionExpanded
      />,
    );

    await user.click(await screen.findByText('Jon Snow'));
    await waitFor(() =>
      expect(onVisiblePositionsChange).toHaveBeenLastCalledWith([expect.any(Object)]),
    );

    rerender(
      <CharactersSection
        storyId={storyId}
        onAddPosition={vi.fn()}
        onEditPosition={vi.fn()}
        positionsVersion={0}
        onVisiblePositionsChange={onVisiblePositionsChange}
        onVisibleTailsChange={vi.fn()}
        timelineMode="book"
        timelineIndex={1}
        sectionExpanded={false}
      />,
    );

    await waitFor(() => expect(onVisiblePositionsChange).toHaveBeenLastCalledWith(null));

    // Re-expanding the section shouldn't bring the character back expanded.
    rerender(
      <CharactersSection
        storyId={storyId}
        onAddPosition={vi.fn()}
        onEditPosition={vi.fn()}
        positionsVersion={0}
        onVisiblePositionsChange={onVisiblePositionsChange}
        onVisibleTailsChange={vi.fn()}
        timelineMode="book"
        timelineIndex={1}
        sectionExpanded
      />,
    );

    const accordionButton = screen.getByRole('button', { name: /Jon Snow/i });
    expect(accordionButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('reports the newly expanded character’s pins when switching directly between two expanded characters', async () => {
    const storyId = await seedStoryId();
    const jon = await createCharacter({
      storyId,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: null,
      sortOrder: 15,
    });
    const daenerys = await createCharacter({
      storyId,
      name: 'Daenerys Targaryen',
      group: null,
      icon: null,
      color: null,
      sortOrder: 16,
    });
    await createCharacterPosition({
      characterId: jon.id,
      position: { lat: 1, lng: 1 },
      dead: false,
      note: null,
      tail: null,
      chapterRange: null,
      episodeRange: null,
    });
    await createCharacterPosition({
      characterId: daenerys.id,
      position: { lat: 2, lng: 2 },
      dead: false,
      note: null,
      tail: null,
      chapterRange: null,
      episodeRange: null,
    });
    const onVisiblePositionsChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CharactersSection
        storyId={storyId}
        onAddPosition={vi.fn()}
        onEditPosition={vi.fn()}
        positionsVersion={0}
        onVisiblePositionsChange={onVisiblePositionsChange}
        onVisibleTailsChange={vi.fn()}
        timelineMode="book"
        timelineIndex={1}
        sectionExpanded
      />,
    );

    await user.click(await screen.findByText('Jon Snow'));
    await waitFor(() =>
      expect(onVisiblePositionsChange).toHaveBeenLastCalledWith([
        {
          characterId: jon.id,
          characterPosition: expect.objectContaining({ position: { lat: 1, lng: 1 } }),
          label: '1',
          positionIndex: 1,
          color: null,
        },
      ]),
    );

    // Clicking a different character's summary switches expandedCharacterId
    // directly from Jon to Daenerys in one state update, so both
    // CharacterItems' positions-reporting effects fire in the same commit —
    // the result must reflect Daenerys (now expanded), not whichever
    // CharacterItem happens to run its effect last.
    await user.click(screen.getByText('Daenerys Targaryen'));
    await waitFor(() =>
      expect(onVisiblePositionsChange).toHaveBeenLastCalledWith([
        {
          characterId: daenerys.id,
          characterPosition: expect.objectContaining({ position: { lat: 2, lng: 2 } }),
          label: '1',
          positionIndex: 1,
          color: null,
        },
      ]),
    );
  });

  it('shows an initialed pin for the last position, a dot for earlier ones, plus every tail, once toggled visible while collapsed', async () => {
    const storyId = await seedStoryId();
    const jon = await createCharacter({
      storyId,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: '#ff0000',
      sortOrder: 17,
    });
    const firstPosition = await createCharacterPosition({
      characterId: jon.id,
      position: { lat: 1, lng: 1 },
      dead: false,
      note: null,
      tail: [{ lat: 0.5, lng: 0.5 }],
      chapterRange: null,
      episodeRange: null,
    });
    const lastPosition = await createCharacterPosition({
      characterId: jon.id,
      position: { lat: 2, lng: 2 },
      dead: false,
      note: null,
      tail: null,
      chapterRange: null,
      episodeRange: null,
    });
    const onVisiblePositionsChange = vi.fn();
    const onVisibleTailsChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CharactersSection
        storyId={storyId}
        onAddPosition={vi.fn()}
        onEditPosition={vi.fn()}
        positionsVersion={0}
        onVisiblePositionsChange={onVisiblePositionsChange}
        onVisibleTailsChange={onVisibleTailsChange}
        timelineMode="book"
        timelineIndex={1}
        sectionExpanded
      />,
    );

    await user.click(await screen.findByRole('button', { name: /show on map/i }));

    await waitFor(() =>
      expect(onVisiblePositionsChange).toHaveBeenLastCalledWith([
        {
          characterId: jon.id,
          characterPosition: expect.objectContaining({ id: firstPosition.id }),
          label: '',
          positionIndex: 1,
          color: '#ff0000',
          style: 'dot',
        },
        {
          characterId: jon.id,
          characterPosition: expect.objectContaining({ id: lastPosition.id }),
          label: 'JS',
          positionIndex: 2,
          color: '#ff0000',
          style: 'pin',
        },
      ]),
    );
    expect(onVisibleTailsChange).toHaveBeenLastCalledWith([
      {
        characterId: jon.id,
        points: [
          { lat: 1, lng: 1 },
          { lat: 0.5, lng: 0.5 },
        ],
        color: '#ff0000',
        opacity: 0.5,
      },
    ]);

    await user.click(screen.getByRole('button', { name: /hide on map/i }));

    await waitFor(() => expect(onVisiblePositionsChange).toHaveBeenLastCalledWith(null));
    expect(onVisibleTailsChange).toHaveBeenLastCalledWith([]);
  });

  it('skips the visible-toggle pin for the currently expanded character, since it is already shown numbered', async () => {
    const storyId = await seedStoryId();
    const jon = await createCharacter({
      storyId,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: null,
      sortOrder: 18,
    });
    await createCharacterPosition({
      characterId: jon.id,
      position: { lat: 1, lng: 1 },
      dead: false,
      note: null,
      tail: null,
      chapterRange: null,
      episodeRange: null,
    });
    const onVisiblePositionsChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CharactersSection
        storyId={storyId}
        onAddPosition={vi.fn()}
        onEditPosition={vi.fn()}
        positionsVersion={0}
        onVisiblePositionsChange={onVisiblePositionsChange}
        onVisibleTailsChange={vi.fn()}
        timelineMode="book"
        timelineIndex={1}
        sectionExpanded
      />,
    );

    await user.click(await screen.findByRole('button', { name: /show on map/i }));
    await user.click(screen.getByText('Jon Snow'));

    await waitFor(() =>
      expect(onVisiblePositionsChange).toHaveBeenLastCalledWith([
        expect.objectContaining({ label: '1' }),
      ]),
    );
  });

  it('clears a deleted character out of the visible set, without leaving it toggled on for a later character', async () => {
    const storyId = await seedStoryId();
    await createCharacter({
      storyId,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: null,
      sortOrder: 19,
    });
    const onVisiblePositionsChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CharactersSection
        storyId={storyId}
        onAddPosition={vi.fn()}
        onEditPosition={vi.fn()}
        positionsVersion={0}
        onVisiblePositionsChange={onVisiblePositionsChange}
        onVisibleTailsChange={vi.fn()}
        timelineMode="book"
        timelineIndex={1}
        sectionExpanded
      />,
    );

    await user.click(await screen.findByRole('button', { name: /show on map/i }));
    await user.click(screen.getByText('Jon Snow'));
    await user.click(screen.getByRole('button', { name: /delete character/i }));
    await user.click(await screen.findByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(screen.queryByText('Jon Snow')).not.toBeInTheDocument());
    expect(await listCharactersForStory(storyId)).toHaveLength(0);
  });

  it('calls onEditPosition with (characterId, index, position) when a list item is clicked', async () => {
    const storyId = await seedStoryId();
    const character = await createCharacter({
      storyId,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: null,
      sortOrder: 20,
    });
    const position = await createCharacterPosition({
      characterId: character.id,
      position: { lat: 1, lng: 1 },
      dead: false,
      note: null,
      tail: null,
      chapterRange: null,
      episodeRange: null,
    });
    const onEditPosition = vi.fn();
    const user = userEvent.setup();
    render(
      <CharactersSection
        storyId={storyId}
        onAddPosition={vi.fn()}
        onEditPosition={onEditPosition}
        positionsVersion={0}
        onVisiblePositionsChange={vi.fn()}
        onVisibleTailsChange={vi.fn()}
        timelineMode="book"
        timelineIndex={1}
        sectionExpanded
      />,
    );

    await user.click(await screen.findByText('Jon Snow'));
    await user.click(await screen.findByText('Always visible'));

    expect(onEditPosition).toHaveBeenCalledWith(character.id, 1, position, null);
  });

  it('hides an expanded character’s position once the timeline is before its start chapter', async () => {
    const storyId = await seedStoryId();
    const book = await createBook({
      storyId,
      name: 'A Game of Thrones',
      author: null,
      url: null,
      sortOrder: 0,
    });
    await createChapter({ bookId: book.id, name: 'Prologue', url: null, sortOrder: 0 });
    const chapter2 = await createChapter({
      bookId: book.id,
      name: 'Bran',
      url: null,
      sortOrder: 1,
    });
    const character = await createCharacter({
      storyId,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: '#ff0000',
      sortOrder: 21,
    });
    const reachedPosition = await createCharacterPosition({
      characterId: character.id,
      position: { lat: 1, lng: 1 },
      dead: false,
      note: null,
      tail: null,
      chapterRange: null,
      episodeRange: null,
    });
    await createCharacterPosition({
      characterId: character.id,
      position: { lat: 2, lng: 2 },
      dead: false,
      note: null,
      tail: null,
      chapterRange: { startChapterId: chapter2.id, endChapterId: null },
      episodeRange: null,
    });
    const onVisiblePositionsChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CharactersSection
        storyId={storyId}
        onAddPosition={vi.fn()}
        onEditPosition={vi.fn()}
        positionsVersion={0}
        onVisiblePositionsChange={onVisiblePositionsChange}
        onVisibleTailsChange={vi.fn()}
        timelineMode="book"
        timelineIndex={1}
        sectionExpanded
      />,
    );

    await user.click(await screen.findByText('Jon Snow'));

    await waitFor(() =>
      expect(onVisiblePositionsChange).toHaveBeenLastCalledWith([
        {
          characterId: character.id,
          characterPosition: expect.objectContaining({ id: reachedPosition.id }),
          label: '1',
          positionIndex: 1,
          color: '#ff0000',
        },
      ]),
    );
  });

  it('skips a visible-but-collapsed character’s not-yet-reached positions, marking the last reached one as the pin', async () => {
    const storyId = await seedStoryId();
    const book = await createBook({
      storyId,
      name: 'A Game of Thrones',
      author: null,
      url: null,
      sortOrder: 0,
    });
    await createChapter({ bookId: book.id, name: 'Prologue', url: null, sortOrder: 0 });
    const chapter2 = await createChapter({
      bookId: book.id,
      name: 'Bran',
      url: null,
      sortOrder: 1,
    });
    const chapter3 = await createChapter({
      bookId: book.id,
      name: 'Catelyn',
      url: null,
      sortOrder: 2,
    });
    const character = await createCharacter({
      storyId,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: '#ff0000',
      sortOrder: 22,
    });
    const reachedPosition = await createCharacterPosition({
      characterId: character.id,
      position: { lat: 1, lng: 1 },
      dead: false,
      note: null,
      tail: null,
      chapterRange: { startChapterId: chapter2.id, endChapterId: null },
      episodeRange: null,
    });
    await createCharacterPosition({
      characterId: character.id,
      position: { lat: 2, lng: 2 },
      dead: false,
      note: null,
      tail: null,
      chapterRange: { startChapterId: chapter3.id, endChapterId: null },
      episodeRange: null,
    });
    const onVisiblePositionsChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CharactersSection
        storyId={storyId}
        onAddPosition={vi.fn()}
        onEditPosition={vi.fn()}
        positionsVersion={0}
        onVisiblePositionsChange={onVisiblePositionsChange}
        onVisibleTailsChange={vi.fn()}
        timelineMode="book"
        timelineIndex={2}
        sectionExpanded
      />,
    );

    await user.click(await screen.findByRole('button', { name: /show on map/i }));

    await waitFor(() =>
      expect(onVisiblePositionsChange).toHaveBeenLastCalledWith([
        {
          characterId: character.id,
          characterPosition: expect.objectContaining({ id: reachedPosition.id }),
          label: 'JS',
          positionIndex: 1,
          color: '#ff0000',
          style: 'pin',
        },
      ]),
    );
  });
});
