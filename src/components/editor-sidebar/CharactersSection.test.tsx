import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCharacter, createStory, listCharactersForStory } from '../../db';
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
  });
  return story.id;
}

describe('CharactersSection', () => {
  it('shows a loading state, then "No characters yet." for a story with none', async () => {
    const storyId = await seedStoryId();
    render(<CharactersSection storyId={storyId} onAddPosition={vi.fn()} positionsVersion={0} />);

    expect(screen.getByText(/loading characters/i)).toBeInTheDocument();
    expect(await screen.findByText(/no characters yet/i)).toBeInTheDocument();
  });

  it('lists existing characters', async () => {
    const storyId = await seedStoryId();
    await createCharacter({ storyId, name: 'Jon Snow', group: null, icon: null, color: null });
    render(<CharactersSection storyId={storyId} onAddPosition={vi.fn()} positionsVersion={0} />);

    expect(await screen.findByText('Jon Snow')).toBeInTheDocument();
  });

  it('reports the character count for the story once loaded', async () => {
    const storyId = await seedStoryId();
    await createCharacter({ storyId, name: 'Jon Snow', group: null, icon: null, color: null });
    await createCharacter({
      storyId,
      name: 'Daenerys Targaryen',
      group: null,
      icon: null,
      color: null,
    });
    const onCountChange = vi.fn();
    render(
      <CharactersSection
        storyId={storyId}
        onCountChange={onCountChange}
        onAddPosition={vi.fn()}
        positionsVersion={0}
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
        positionsVersion={0}
      />,
    );

    await vi.waitFor(() => expect(onCountChange).toHaveBeenCalledWith(0));
  });

  it('adds a new character, expanded, and persists it', async () => {
    const storyId = await seedStoryId();
    await createCharacter({ storyId, name: 'Jon Snow', group: null, icon: null, color: null });
    const user = userEvent.setup();
    render(<CharactersSection storyId={storyId} onAddPosition={vi.fn()} positionsVersion={0} />);

    await screen.findByText('Jon Snow');
    await user.click(screen.getByRole('button', { name: /add character/i }));

    await screen.findByText('Unnamed Character');
    const [existingNameField, newNameField] = screen.getAllByLabelText(/^name$/i);
    await waitFor(() => expect(existingNameField).not.toBeVisible());
    await waitFor(() => expect(newNameField).toBeVisible());
    expect(await listCharactersForStory(storyId)).toHaveLength(2);
  });

  it('collapses a character when its accordion is closed again', async () => {
    const storyId = await seedStoryId();
    await createCharacter({ storyId, name: 'Jon Snow', group: null, icon: null, color: null });
    const user = userEvent.setup();
    render(<CharactersSection storyId={storyId} onAddPosition={vi.fn()} positionsVersion={0} />);

    await user.click(await screen.findByText('Jon Snow'));
    const nameField = screen.getByLabelText(/^name$/i);
    expect(nameField).toBeVisible();

    await user.click(screen.getByText('Jon Snow'));
    await waitFor(() => expect(nameField).not.toBeVisible());
  });

  it('editing one character does not affect a sibling character', async () => {
    const storyId = await seedStoryId();
    await createCharacter({ storyId, name: 'Jon Snow', group: null, icon: null, color: null });
    await createCharacter({
      storyId,
      name: 'Daenerys Targaryen',
      group: null,
      icon: null,
      color: null,
    });
    const user = userEvent.setup();
    render(<CharactersSection storyId={storyId} onAddPosition={vi.fn()} positionsVersion={0} />);

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
    await createCharacter({ storyId, name: 'Jon Snow', group: null, icon: null, color: null });
    await createCharacter({
      storyId,
      name: 'Daenerys Targaryen',
      group: null,
      icon: null,
      color: null,
    });
    const user = userEvent.setup();
    render(<CharactersSection storyId={storyId} onAddPosition={vi.fn()} positionsVersion={0} />);

    await user.click(await screen.findByText('Jon Snow'));
    await user.click(screen.getByRole('button', { name: /delete character/i }));
    await user.click(await screen.findByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(screen.queryByText('Jon Snow')).not.toBeInTheDocument());
    expect(screen.getByText('Daenerys Targaryen')).toBeInTheDocument();
    expect(await listCharactersForStory(storyId)).toHaveLength(1);
  });

  it('does not update state after unmounting while characters are still loading', async () => {
    const storyId = await seedStoryId();
    await createCharacter({ storyId, name: 'Jon Snow', group: null, icon: null, color: null });
    const { unmount } = render(
      <CharactersSection storyId={storyId} onAddPosition={vi.fn()} positionsVersion={0} />,
    );

    unmount();

    await new Promise((resolve) => setTimeout(resolve, 50));
  });
});
