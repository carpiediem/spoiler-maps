import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMarker, createMarkerSet, createStory } from '../../db';
import { resetDatabaseForTests } from '../../db/client';
import { MarkersSection } from './MarkersSection';

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

describe('MarkersSection', () => {
  it('renders the placeholder text', async () => {
    const storyId = await seedStoryId();
    render(<MarkersSection storyId={storyId} />);

    expect(await screen.findByText(/no markers yet/i)).toBeInTheDocument();
  });

  it('reports the total marker count across all marker sets for the story', async () => {
    const storyId = await seedStoryId();
    const setA = await createMarkerSet({ storyId, name: 'Landmarks' });
    const setB = await createMarkerSet({ storyId, name: 'Battles' });
    await createMarker({
      markerSetId: setA.id,
      label: 'Winterfell',
      icon: null,
      color: null,
      position: { lat: 1, lng: 1 },
      polygon: null,
      chapterRange: null,
      episodeRange: null,
    });
    await createMarker({
      markerSetId: setA.id,
      label: "King's Landing",
      icon: null,
      color: null,
      position: { lat: 2, lng: 2 },
      polygon: null,
      chapterRange: null,
      episodeRange: null,
    });
    await createMarker({
      markerSetId: setB.id,
      label: 'Battle of the Blackwater',
      icon: null,
      color: null,
      position: { lat: 3, lng: 3 },
      polygon: null,
      chapterRange: null,
      episodeRange: null,
    });
    const onCountChange = vi.fn();
    render(<MarkersSection storyId={storyId} onCountChange={onCountChange} />);

    await vi.waitFor(() => expect(onCountChange).toHaveBeenCalledWith(3));
  });

  it('reports zero for a story with no marker sets', async () => {
    const storyId = await seedStoryId();
    const onCountChange = vi.fn();
    render(<MarkersSection storyId={storyId} onCountChange={onCountChange} />);

    await vi.waitFor(() => expect(onCountChange).toHaveBeenCalledWith(0));
  });

  it('does not update state after unmounting while marker sets are still loading', async () => {
    const storyId = await seedStoryId();
    await createMarkerSet({ storyId, name: 'Landmarks' });
    const { unmount } = render(<MarkersSection storyId={storyId} />);

    unmount();

    await new Promise((resolve) => setTimeout(resolve, 50));
  });
});
