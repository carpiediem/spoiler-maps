import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createBook,
  createChapter,
  createEpisode,
  createMarker,
  createMarkerSet,
  createStory,
  createTvSeason,
  listMarkersForMarkerSet,
} from '../../db';
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
    description: null,
    paletteKey: null,
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
    const setA = await createMarkerSet({ storyId, name: 'Landmarks', noIcons: false });
    const setB = await createMarkerSet({ storyId, name: 'Battles', noIcons: false });
    await createMarker({
      markerSetId: setA.id,
      label: 'Winterfell',
      icon: null,
      url: null,
      color: null,
      large: false,
      position: { lat: 1, lng: 1 },
      polygon: null,
      chapterRange: null,
      episodeRange: null,
    });
    await createMarker({
      markerSetId: setA.id,
      label: "King's Landing",
      icon: null,
      url: null,
      color: null,
      large: false,
      position: { lat: 2, lng: 2 },
      polygon: null,
      chapterRange: null,
      episodeRange: null,
    });
    await createMarker({
      markerSetId: setB.id,
      label: 'Battle of the Blackwater',
      icon: null,
      url: null,
      color: null,
      large: false,
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
    await createMarkerSet({ storyId, name: 'Landmarks', noIcons: false });
    const { unmount } = render(<MarkersSection storyId={storyId} />);

    unmount();

    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  it('adds a marker collection and expands it', async () => {
    const storyId = await seedStoryId();
    render(<MarkersSection storyId={storyId} />);
    await screen.findByText(/no markers yet/i);

    fireEvent.click(screen.getByRole('button', { name: /add collection/i }));

    expect(await screen.findByText('Unnamed Collection')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });

  it('renames a collection and persists it', async () => {
    const storyId = await seedStoryId();
    await createMarkerSet({ storyId, name: 'Landmarks', noIcons: false });
    render(<MarkersSection storyId={storyId} />);

    fireEvent.click(await screen.findByText('Landmarks'));
    const nameField = screen.getByLabelText('Name');
    fireEvent.change(nameField, { target: { value: 'Cities' } });
    fireEvent.blur(nameField);

    await vi.waitFor(async () => {
      expect(screen.getByText('Cities')).toBeInTheDocument();
    });
  });

  it('toggles the No icons checkbox and persists it', async () => {
    const storyId = await seedStoryId();
    await createMarkerSet({ storyId, name: 'Landmarks', noIcons: false });
    render(<MarkersSection storyId={storyId} />);

    fireEvent.click(await screen.findByText('Landmarks'));
    const checkbox = screen.getByRole('checkbox', { name: /no icons/i });
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);

    await vi.waitFor(() => expect(checkbox).toBeChecked());
  });

  it('adds a marker to a collection at the current map center, and expands it', async () => {
    const storyId = await seedStoryId();
    await createMarkerSet({ storyId, name: 'Landmarks', noIcons: false });
    render(<MarkersSection storyId={storyId} mapCenter={{ lat: 12, lng: 34 }} />);

    fireEvent.click(await screen.findByText('Landmarks'));
    fireEvent.click(screen.getByRole('button', { name: /add marker/i }));

    expect(await screen.findByText('Unnamed Marker')).toBeInTheDocument();
    expect(screen.getByText(/12\.0000, 34\.0000/)).toBeInTheDocument();
  });

  it('edits a marker’s name, icon URL, and wiki URL, and persists them', async () => {
    const storyId = await seedStoryId();
    const markerSet = await createMarkerSet({ storyId, name: 'Landmarks', noIcons: false });
    const marker = await createMarker({
      markerSetId: markerSet.id,
      label: 'Winterfell',
      icon: null,
      url: null,
      color: null,
      large: false,
      position: { lat: 1, lng: 1 },
      polygon: null,
      chapterRange: null,
      episodeRange: null,
    });
    render(<MarkersSection storyId={storyId} />);

    fireEvent.click(await screen.findByText('Landmarks'));
    fireEvent.click(await screen.findByText('Winterfell'));

    const iconField = screen.getByLabelText('Icon URL');
    fireEvent.change(iconField, { target: { value: 'https://example.com/icon.png' } });
    fireEvent.blur(iconField);
    const urlField = screen.getByLabelText('Wiki URL');
    fireEvent.change(urlField, { target: { value: 'https://wiki.example.com/winterfell' } });
    fireEvent.blur(urlField);
    const colorField = screen.getByLabelText('Color');
    fireEvent.change(colorField, { target: { value: '#00ff00' } });
    fireEvent.blur(colorField);

    await vi.waitFor(async () => {
      const [updated] = await listMarkersForMarkerSet(markerSet.id);
      expect(updated.icon).toBe('https://example.com/icon.png');
      expect(updated.url).toBe('https://wiki.example.com/winterfell');
      expect(updated.color).toBe('#00ff00');
    });
    expect(marker.id).toBeGreaterThan(0);
  });

  it('deletes a marker from within its collection', async () => {
    const storyId = await seedStoryId();
    const markerSet = await createMarkerSet({ storyId, name: 'Landmarks', noIcons: false });
    await createMarker({
      markerSetId: markerSet.id,
      label: 'Winterfell',
      icon: null,
      url: null,
      color: null,
      large: false,
      position: { lat: 1, lng: 1 },
      polygon: null,
      chapterRange: null,
      episodeRange: null,
    });
    render(<MarkersSection storyId={storyId} />);

    fireEvent.click(await screen.findByText('Landmarks'));
    fireEvent.click(await screen.findByText('Winterfell'));
    fireEvent.click(screen.getByRole('button', { name: /delete marker/i }));

    await vi.waitFor(() => expect(screen.queryByText('Winterfell')).not.toBeInTheDocument());
  });

  it('deletes a collection after confirming', async () => {
    const storyId = await seedStoryId();
    await createMarkerSet({ storyId, name: 'Landmarks', noIcons: false });
    render(<MarkersSection storyId={storyId} />);

    fireEvent.click(await screen.findByText('Landmarks'));
    fireEvent.click(screen.getByRole('button', { name: /delete collection/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /delete/i }));

    await vi.waitFor(() => expect(screen.queryByText('Landmarks')).not.toBeInTheDocument());
    expect(await screen.findByText(/no markers yet/i)).toBeInTheDocument();
  });

  it('reports visible markers only for a collection toggled "Show on map"', async () => {
    const storyId = await seedStoryId();
    const markerSet = await createMarkerSet({ storyId, name: 'Landmarks', noIcons: true });
    await createMarker({
      markerSetId: markerSet.id,
      label: 'Winterfell',
      icon: null,
      url: null,
      color: null,
      large: false,
      position: { lat: 1, lng: 1 },
      polygon: null,
      chapterRange: null,
      episodeRange: null,
    });
    const onVisibleMarkersChange = vi.fn();
    render(<MarkersSection storyId={storyId} onVisibleMarkersChange={onVisibleMarkersChange} />);
    await screen.findByText('Landmarks');

    await vi.waitFor(() => expect(onVisibleMarkersChange).toHaveBeenCalledWith(null));
    onVisibleMarkersChange.mockClear();

    fireEvent.click(screen.getByRole('button', { name: /show on map/i }));

    await vi.waitFor(() =>
      expect(onVisibleMarkersChange).toHaveBeenCalledWith([
        expect.objectContaining({
          noIcons: true,
          marker: expect.objectContaining({ label: 'Winterfell' }),
        }),
      ]),
    );
  });

  it('reports the expanded marker as the active marker, excluded from visible pins', async () => {
    const storyId = await seedStoryId();
    const markerSet = await createMarkerSet({ storyId, name: 'Landmarks', noIcons: false });
    await createMarker({
      markerSetId: markerSet.id,
      label: 'Winterfell',
      icon: null,
      url: null,
      color: null,
      large: false,
      position: { lat: 1, lng: 1 },
      polygon: null,
      chapterRange: null,
      episodeRange: null,
    });
    const onVisibleMarkersChange = vi.fn();
    const onActiveMarkerChange = vi.fn();
    render(
      <MarkersSection
        storyId={storyId}
        onVisibleMarkersChange={onVisibleMarkersChange}
        onActiveMarkerChange={onActiveMarkerChange}
      />,
    );
    await screen.findByText('Landmarks');

    fireEvent.click(screen.getByRole('button', { name: /show on map/i }));
    await vi.waitFor(() =>
      expect(onVisibleMarkersChange).toHaveBeenCalledWith([expect.anything()]),
    );

    fireEvent.click(await screen.findByText('Landmarks'));
    fireEvent.click(await screen.findByText('Winterfell'));

    await vi.waitFor(() =>
      expect(onActiveMarkerChange).toHaveBeenCalledWith(
        expect.objectContaining({ marker: expect.objectContaining({ label: 'Winterfell' }) }),
      ),
    );
    expect(onVisibleMarkersChange).toHaveBeenLastCalledWith(null);
  });

  it('collapses the selected marker when the collection is collapsed', async () => {
    const storyId = await seedStoryId();
    const markerSet = await createMarkerSet({ storyId, name: 'Landmarks', noIcons: false });
    await createMarker({
      markerSetId: markerSet.id,
      label: 'Winterfell',
      icon: null,
      url: null,
      color: null,
      large: false,
      position: { lat: 1, lng: 1 },
      polygon: null,
      chapterRange: null,
      episodeRange: null,
    });
    const onActiveMarkerChange = vi.fn();
    render(<MarkersSection storyId={storyId} onActiveMarkerChange={onActiveMarkerChange} />);

    const header = await screen.findByText('Landmarks');
    fireEvent.click(header);
    fireEvent.click(await screen.findByText('Winterfell'));
    await vi.waitFor(() =>
      expect(onActiveMarkerChange).toHaveBeenLastCalledWith(expect.anything()),
    );

    fireEvent.click(header);

    await vi.waitFor(() => expect(onActiveMarkerChange).toHaveBeenLastCalledWith(null));
  });

  it('collapses the selected marker set/marker when the Markers section itself collapses', async () => {
    const storyId = await seedStoryId();
    const markerSet = await createMarkerSet({ storyId, name: 'Landmarks', noIcons: false });
    await createMarker({
      markerSetId: markerSet.id,
      label: 'Winterfell',
      icon: null,
      url: null,
      color: null,
      large: false,
      position: { lat: 1, lng: 1 },
      polygon: null,
      chapterRange: null,
      episodeRange: null,
    });
    const { rerender } = render(<MarkersSection storyId={storyId} sectionExpanded />);

    fireEvent.click(await screen.findByText('Landmarks'));
    await screen.findByText('Winterfell');

    rerender(<MarkersSection storyId={storyId} sectionExpanded={false} />);

    await vi.waitFor(() => expect(screen.getByText('Winterfell')).not.toBeVisible());
  });

  it('shows the marker’s icon in its header when one is set', async () => {
    const storyId = await seedStoryId();
    const markerSet = await createMarkerSet({ storyId, name: 'Landmarks', noIcons: false });
    await createMarker({
      markerSetId: markerSet.id,
      label: 'Winterfell',
      icon: 'https://example.com/winterfell.png',
      url: null,
      color: null,
      large: false,
      position: { lat: 1, lng: 1 },
      polygon: null,
      chapterRange: null,
      episodeRange: null,
    });
    render(<MarkersSection storyId={storyId} />);

    fireEvent.click(await screen.findByText('Landmarks'));
    const image = await screen.findByRole('img', { name: 'Winterfell' });

    expect(image).toHaveAttribute('src', 'https://example.com/winterfell.png');
  });

  it('toggles a marker’s Large checkbox and persists it', async () => {
    const storyId = await seedStoryId();
    const markerSet = await createMarkerSet({ storyId, name: 'Landmarks', noIcons: false });
    await createMarker({
      markerSetId: markerSet.id,
      label: 'Winterfell',
      icon: null,
      url: null,
      color: null,
      large: false,
      position: { lat: 1, lng: 1 },
      polygon: null,
      chapterRange: null,
      episodeRange: null,
    });
    render(<MarkersSection storyId={storyId} />);

    fireEvent.click(await screen.findByText('Landmarks'));
    fireEvent.click(await screen.findByText('Winterfell'));
    const checkbox = screen.getByRole('checkbox', { name: /large marker/i });
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);

    await vi.waitFor(async () => {
      expect(checkbox).toBeChecked();
      const [updated] = await listMarkersForMarkerSet(markerSet.id);
      expect(updated.large).toBe(true);
    });
  });

  it('edits a marker’s chapter range and persists it', async () => {
    const storyId = await seedStoryId();
    const book = await createBook({
      storyId,
      name: 'A Game of Thrones',
      author: null,
      url: null,
      sortOrder: 0,
    });
    const chapter = await createChapter({ bookId: book.id, name: 'Bran', url: null, sortOrder: 0 });
    const markerSet = await createMarkerSet({ storyId, name: 'Landmarks', noIcons: false });
    await createMarker({
      markerSetId: markerSet.id,
      label: 'Winterfell',
      icon: null,
      url: null,
      color: null,
      large: false,
      position: { lat: 1, lng: 1 },
      polygon: null,
      chapterRange: null,
      episodeRange: null,
    });
    render(<MarkersSection storyId={storyId} />);

    fireEvent.click(await screen.findByText('Landmarks'));
    fireEvent.click(await screen.findByText('Winterfell'));

    fireEvent.mouseDown(await screen.findByLabelText('Start Chapter'));
    fireEvent.click(await screen.findByRole('option', { name: /bran/i }));

    await vi.waitFor(async () => {
      const [updated] = await listMarkersForMarkerSet(markerSet.id);
      expect(updated.chapterRange).toEqual({ startChapterId: chapter.id, endChapterId: null });
    });
  });

  it('edits a marker’s episode range and persists it', async () => {
    const storyId = await seedStoryId();
    const season = await createTvSeason({ storyId, url: null, sortOrder: 0 });
    const episode = await createEpisode({
      seasonId: season.id,
      name: 'Winter Is Coming',
      url: null,
      sortOrder: 0,
    });
    const markerSet = await createMarkerSet({ storyId, name: 'Landmarks', noIcons: false });
    await createMarker({
      markerSetId: markerSet.id,
      label: 'Winterfell',
      icon: null,
      url: null,
      color: null,
      large: false,
      position: { lat: 1, lng: 1 },
      polygon: null,
      chapterRange: null,
      episodeRange: null,
    });
    render(<MarkersSection storyId={storyId} />);

    fireEvent.click(await screen.findByText('Landmarks'));
    fireEvent.click(await screen.findByText('Winterfell'));

    fireEvent.mouseDown(await screen.findByLabelText('Start Episode'));
    fireEvent.click(await screen.findByRole('option', { name: /winter is coming/i }));

    await vi.waitFor(async () => {
      const [updated] = await listMarkersForMarkerSet(markerSet.id);
      expect(updated.episodeRange).toEqual({ startEpisodeId: episode.id, endEpisodeId: null });
    });
  });

  it('exposes an onAreaSave handler on the active marker that persists a polygon', async () => {
    const storyId = await seedStoryId();
    const markerSet = await createMarkerSet({ storyId, name: 'Landmarks', noIcons: false });
    await createMarker({
      markerSetId: markerSet.id,
      label: 'Winterfell',
      icon: null,
      url: null,
      color: null,
      large: false,
      position: { lat: 1, lng: 1 },
      polygon: null,
      chapterRange: null,
      episodeRange: null,
    });
    const onActiveMarkerChange = vi.fn();
    render(<MarkersSection storyId={storyId} onActiveMarkerChange={onActiveMarkerChange} />);

    fireEvent.click(await screen.findByText('Landmarks'));
    fireEvent.click(await screen.findByText('Winterfell'));

    await vi.waitFor(() => expect(onActiveMarkerChange).toHaveBeenCalled());
    const active = onActiveMarkerChange.mock.calls.at(-1)![0];
    const polygon = [
      { lat: 1, lng: 1 },
      { lat: 2, lng: 2 },
      { lat: 3, lng: 3 },
    ];

    active.onAreaSave(polygon);

    await vi.waitFor(async () => {
      const [updated] = await listMarkersForMarkerSet(markerSet.id);
      expect(updated.polygon).toEqual(polygon);
    });
  });

  it('treats fewer than 3 saved area points as no area at all', async () => {
    const storyId = await seedStoryId();
    const markerSet = await createMarkerSet({ storyId, name: 'Landmarks', noIcons: false });
    await createMarker({
      markerSetId: markerSet.id,
      label: 'Winterfell',
      icon: null,
      url: null,
      color: null,
      large: false,
      position: { lat: 1, lng: 1 },
      polygon: null,
      chapterRange: null,
      episodeRange: null,
    });
    const onActiveMarkerChange = vi.fn();
    render(<MarkersSection storyId={storyId} onActiveMarkerChange={onActiveMarkerChange} />);

    fireEvent.click(await screen.findByText('Landmarks'));
    fireEvent.click(await screen.findByText('Winterfell'));

    await vi.waitFor(() => expect(onActiveMarkerChange).toHaveBeenCalled());
    const active = onActiveMarkerChange.mock.calls.at(-1)![0];

    active.onAreaSave([
      { lat: 1, lng: 1 },
      { lat: 2, lng: 2 },
    ]);

    await vi.waitFor(async () => {
      const [updated] = await listMarkersForMarkerSet(markerSet.id);
      expect(updated.polygon).toBeNull();
    });
  });

  it('clears a marker’s area via onAreaSave(null)', async () => {
    const storyId = await seedStoryId();
    const markerSet = await createMarkerSet({ storyId, name: 'Landmarks', noIcons: false });
    await createMarker({
      markerSetId: markerSet.id,
      label: 'Winterfell',
      icon: null,
      url: null,
      color: null,
      large: false,
      position: { lat: 1, lng: 1 },
      polygon: [
        { lat: 1, lng: 1 },
        { lat: 2, lng: 2 },
        { lat: 3, lng: 3 },
      ],
      chapterRange: null,
      episodeRange: null,
    });
    const onActiveMarkerChange = vi.fn();
    render(<MarkersSection storyId={storyId} onActiveMarkerChange={onActiveMarkerChange} />);

    fireEvent.click(await screen.findByText('Landmarks'));
    fireEvent.click(await screen.findByText('Winterfell'));

    await vi.waitFor(() => expect(onActiveMarkerChange).toHaveBeenCalled());
    const active = onActiveMarkerChange.mock.calls.at(-1)![0];

    active.onAreaSave(null);

    await vi.waitFor(async () => {
      const [updated] = await listMarkersForMarkerSet(markerSet.id);
      expect(updated.polygon).toBeNull();
    });
  });
});
