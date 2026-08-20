import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCharacter, createStory } from '../../db';
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
  it('renders the placeholder text', async () => {
    const storyId = await seedStoryId();
    render(<CharactersSection storyId={storyId} />);

    expect(await screen.findByText(/no characters yet/i)).toBeInTheDocument();
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
    render(<CharactersSection storyId={storyId} onCountChange={onCountChange} />);

    await vi.waitFor(() => expect(onCountChange).toHaveBeenCalledWith(2));
  });

  it('reports zero for a story with no characters', async () => {
    const storyId = await seedStoryId();
    const onCountChange = vi.fn();
    render(<CharactersSection storyId={storyId} onCountChange={onCountChange} />);

    await vi.waitFor(() => expect(onCountChange).toHaveBeenCalledWith(0));
  });
});
