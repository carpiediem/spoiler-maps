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
  type CharacterPosition,
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
  onEditPosition,
  onPositionsChange,
}: {
  initialCharacter: Character;
  onDelete?: () => void;
  onAddPosition?: (index: number) => void;
  onEditPosition?: (position: CharacterPosition, index: number) => void;
  onPositionsChange?: (characterId: number, positions: CharacterPosition[]) => void;
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
      onEditPosition={onEditPosition ?? vi.fn()}
      onPositionsChange={onPositionsChange ?? vi.fn()}
      positionsVersion={0}
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
        onEditPosition={vi.fn()}
        onPositionsChange={vi.fn()}
        positionsVersion={0}
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
        onEditPosition={vi.fn()}
        onPositionsChange={vi.fn()}
        positionsVersion={0}
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
    const onAddPosition = vi.fn();
    const user = userEvent.setup();
    render(<Wrapper initialCharacter={character} onAddPosition={onAddPosition} />);

    const positionButton = await screen.findByRole('button', { name: /^position$/i });
    await waitFor(() => expect(positionButton).toBeEnabled());
    await user.click(positionButton);

    expect(onAddPosition).toHaveBeenCalledWith(3);
  });

  it('lists existing positions, labeled with their chapter/episode range', async () => {
    const character = await seedCharacter();
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
      chapterRange: { startChapterId: null, endChapterId: null },
      episodeRange: null,
    });
    render(<Wrapper initialCharacter={character} />);

    expect(await screen.findAllByText('Always visible')).toHaveLength(2);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1.0000, 1.0000')).toBeInTheDocument();
    expect(screen.getByText('2.0000, 2.0000')).toBeInTheDocument();
  });

  it('shows a position’s note instead of its lat/lng when one is set', async () => {
    const character = await seedCharacter();
    await createCharacterPosition({
      characterId: character.id,
      position: { lat: 1, lng: 1 },
      dead: false,
      note: 'Hiding at the Wall',
      tail: null,
      chapterRange: null,
      episodeRange: null,
    });
    render(<Wrapper initialCharacter={character} />);

    expect(await screen.findByText('Hiding at the Wall')).toBeInTheDocument();
    expect(screen.queryByText('1.0000, 1.0000')).not.toBeInTheDocument();
  });

  it('calls onEditPosition with the position and its 1-based index when a list item is clicked', async () => {
    const character = await seedCharacter();
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
    render(<Wrapper initialCharacter={character} onEditPosition={onEditPosition} />);

    await user.click(await screen.findByText('Always visible'));

    expect(onEditPosition).toHaveBeenCalledWith(position, 1);
  });

  it('reports its loaded positions via onPositionsChange, regardless of expanded state', async () => {
    const character = await seedCharacter();
    const position = await createCharacterPosition({
      characterId: character.id,
      position: { lat: 1, lng: 1 },
      dead: false,
      note: null,
      tail: null,
      chapterRange: null,
      episodeRange: null,
    });
    const onPositionsChange = vi.fn();
    render(<Wrapper initialCharacter={character} onPositionsChange={onPositionsChange} />);

    await waitFor(() => expect(onPositionsChange).toHaveBeenCalledWith(character.id, [position]));
  });

  it('does not render a positions list for a character with none', async () => {
    const character = await seedCharacter();
    render(<Wrapper initialCharacter={character} />);

    await screen.findByRole('button', { name: /^position$/i });
    expect(screen.queryByText(/always visible/i)).not.toBeInTheDocument();
  });

  it('shows the character icon in the summary instead of the color swatch when set', async () => {
    const character = await seedCharacter({ icon: 'https://example.com/jon.png' });
    render(<Wrapper initialCharacter={character} />);

    const icon = screen.getByRole('img', { name: character.name });
    expect(icon).toHaveAttribute('src', 'https://example.com/jon.png');
  });

  it('falls back to "Unnamed Character" as the icon alt text for a blank name', async () => {
    const character = await seedCharacter({ name: '', icon: 'https://example.com/jon.png' });
    render(<Wrapper initialCharacter={character} />);

    expect(screen.getByRole('img', { name: /unnamed character/i })).toBeInTheDocument();
  });
});
