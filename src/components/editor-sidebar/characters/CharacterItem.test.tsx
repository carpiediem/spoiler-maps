import {
  fireEvent,
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createCharacter,
  createCharacterPosition,
  createStory,
  listCharactersForStory,
  type Character,
} from '../../../db';
import { resetDatabaseForTests } from '../../../db/client';
import { CharacterItem } from './CharacterItem';

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

async function seedCharacter(
  overrides: Partial<Parameters<typeof createCharacter>[0]> = {},
): Promise<Character> {
  const story = await createStory({
    name: 'A Song of Ice and Fire',
    tileUrlTemplate: null,
    tileLayerAuthor: null,
    tileLayerAttributionUrl: null,
    initialCenter: { lat: 0, lng: 0 },
    initialZoom: 4,
  });
  return createCharacter({
    storyId: story.id,
    name: 'Jon Snow',
    group: null,
    icon: null,
    color: null,
    ...overrides,
  });
}

function Wrapper({
  initialCharacter,
  onDelete,
  onAddPosition,
}: {
  initialCharacter: Character;
  onDelete?: () => void;
  onAddPosition?: (index: number) => void;
}) {
  const [character, setCharacter] = useState(initialCharacter);
  const [expanded, setExpanded] = useState(true);
  return (
    <CharacterItem
      character={character}
      expanded={expanded}
      onToggle={(_event, isExpanded) => setExpanded(isExpanded)}
      onCharacterChange={setCharacter}
      onDelete={onDelete ?? vi.fn()}
      onAddPosition={onAddPosition ?? vi.fn()}
    />
  );
}

describe('CharacterItem', () => {
  it('shows the character name in the summary', () => {
    const character: Character = {
      id: 1,
      storyId: 1,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: null,
    };
    render(
      <CharacterItem
        character={character}
        expanded={false}
        onToggle={vi.fn()}
        onCharacterChange={vi.fn()}
        onDelete={vi.fn()}
        onAddPosition={vi.fn()}
      />,
    );

    expect(screen.getByText('Jon Snow')).toBeInTheDocument();
  });

  it('falls back to "Unnamed Character" in the summary', () => {
    const character: Character = {
      id: 1,
      storyId: 1,
      name: '',
      group: null,
      icon: null,
      color: null,
    };
    render(
      <CharacterItem
        character={character}
        expanded={false}
        onToggle={vi.fn()}
        onCharacterChange={vi.fn()}
        onDelete={vi.fn()}
        onAddPosition={vi.fn()}
      />,
    );

    expect(screen.getByText('Unnamed Character')).toBeInTheDocument();
  });

  it('edits and persists the name, group, and icon URL fields on blur', async () => {
    const character = await seedCharacter();
    const user = userEvent.setup();
    render(<Wrapper initialCharacter={character} />);

    await user.clear(screen.getByLabelText(/^name$/i));
    await user.type(screen.getByLabelText(/^name$/i), 'Aegon Targaryen');
    await user.type(screen.getByLabelText(/^group$/i), "Night's Watch");
    await user.type(screen.getByLabelText(/^icon url$/i), 'https://example.com/jon.png');
    await user.tab();

    const [persisted] = await listCharactersForStory(character.storyId);
    expect(persisted).toMatchObject({
      name: 'Aegon Targaryen',
      group: "Night's Watch",
      icon: 'https://example.com/jon.png',
    });
  });

  it('stores blank group/icon as null', async () => {
    const character = await seedCharacter({
      group: 'Stark',
      icon: 'https://example.com/jon.png',
    });
    const user = userEvent.setup();
    render(<Wrapper initialCharacter={character} />);

    await user.clear(screen.getByLabelText(/^group$/i));
    await user.tab();
    await user.clear(screen.getByLabelText(/^icon url$/i));
    await user.tab();

    const [persisted] = await listCharactersForStory(character.storyId);
    expect(persisted.group).toBeNull();
    expect(persisted.icon).toBeNull();
  });

  it('edits and persists the color field on blur', async () => {
    const character = await seedCharacter();
    render(<Wrapper initialCharacter={character} />);

    const colorInput = screen.getByLabelText(/^color$/i);
    fireEvent.change(colorInput, { target: { value: '#abcdef' } });
    fireEvent.blur(colorInput);

    const [persisted] = await listCharactersForStory(character.storyId);
    expect(persisted.color).toBe('#abcdef');
  });

  it('asks for confirmation before deleting, and does not delete when cancelled', async () => {
    const character = await seedCharacter();
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<Wrapper initialCharacter={character} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: /delete character/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('falls back to "Unnamed Character" in the delete confirmation title', async () => {
    const character = await seedCharacter({ name: '' });
    const user = userEvent.setup();
    render(<Wrapper initialCharacter={character} />);

    await user.click(screen.getByRole('button', { name: /delete character/i }));

    expect(await screen.findByRole('dialog')).toHaveTextContent('Delete “Unnamed Character”?');
  });

  it('calls onDelete once the deletion is confirmed', async () => {
    const character = await seedCharacter();
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<Wrapper initialCharacter={character} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: /delete character/i }));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('calls onAddPosition with 1 for a character with no existing positions', async () => {
    const character = await seedCharacter();
    const onAddPosition = vi.fn();
    const user = userEvent.setup();
    render(<Wrapper initialCharacter={character} onAddPosition={onAddPosition} />);

    const positionButton = await screen.findByRole('button', { name: /^position$/i });
    await waitFor(() => expect(positionButton).toBeEnabled());
    await user.click(positionButton);

    expect(onAddPosition).toHaveBeenCalledWith(1);
  });

  it('calls onAddPosition with the next 1-based index for a character with existing positions', async () => {
    const character = await seedCharacter();
    await createCharacterPosition({
      characterId: character.id,
      position: { lat: 1, lng: 1 },
      dead: false,
      chapterRange: null,
      episodeRange: null,
    });
    await createCharacterPosition({
      characterId: character.id,
      position: { lat: 2, lng: 2 },
      dead: false,
      chapterRange: null,
      episodeRange: null,
    });
    const onAddPosition = vi.fn();
    const user = userEvent.setup();
    render(<Wrapper initialCharacter={character} onAddPosition={onAddPosition} />);

    const positionButton = await screen.findByRole('button', { name: /^position$/i });
    await waitFor(() => expect(positionButton).toBeEnabled());
    await user.click(positionButton);

    expect(onAddPosition).toHaveBeenCalledWith(3);
  });
});
