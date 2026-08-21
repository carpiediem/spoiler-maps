import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { resetDatabaseForTests } from './db/client';
import {
  createBook,
  createChapter,
  createCharacter,
  createCharacterPosition,
  createStory,
} from './db';

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

describe('App', () => {
  it('starts on a fresh "New Map" and saves it as a new story', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    expect(container.querySelector('.leaflet-container')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new map/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/map name/i), 'A Song of Ice and Fire');
    fireEvent.change(screen.getByLabelText(/tile layer url template/i), {
      target: { value: 'https://tile.example.com/{z}/{x}/{y}.png' },
    });
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(
      await screen.findByRole('button', { name: /a song of ice and fire/i }),
    ).toBeInTheDocument();
    expect(container.querySelector('.leaflet-container')).toBeInTheDocument();
  });

  it('loads existing stories, switches between them, and updates the selected one', async () => {
    const user = userEvent.setup();
    await createStory({
      name: 'A Song of Ice and Fire',
      tileUrlTemplate: 'https://tile.example.com/asoiaf/{z}/{x}/{y}.png',
      tileLayerAuthor: null,
      tileLayerAttributionUrl: null,
      initialCenter: { lat: 39.8283, lng: -98.5795 },
      initialZoom: 4,
      minZoom: 0,
      maxZoom: 19,
    });
    await createStory({
      name: 'The Wheel of Time',
      tileUrlTemplate: 'https://tile.example.com/wot/{z}/{x}/{y}.png',
      tileLayerAuthor: null,
      tileLayerAttributionUrl: null,
      initialCenter: { lat: 39.8283, lng: -98.5795 },
      initialZoom: 4,
      minZoom: 0,
      maxZoom: 19,
    });
    resetDatabaseForTests();

    render(<App />);

    expect(
      await screen.findByRole('button', { name: /a song of ice and fire/i }),
    ).toBeInTheDocument();
    expect(await screen.findByDisplayValue('A Song of Ice and Fire')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /a song of ice and fire/i }));
    await user.click(screen.getByRole('option', { name: /the wheel of time/i }));

    expect(screen.getByLabelText(/map name/i)).toHaveValue('The Wheel of Time');

    await user.click(screen.getByRole('button', { name: /the wheel of time/i }));
    await user.click(screen.getByRole('option', { name: /new map/i }));

    expect(screen.getByLabelText(/map name/i)).toHaveValue('');

    await user.click(screen.getByRole('button', { name: /new map/i }));
    await user.click(screen.getByRole('option', { name: /a song of ice and fire/i }));

    const nameInput = screen.getByLabelText(/map name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Renamed Story');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('button', { name: /^renamed story$/i })).toBeInTheDocument();
  });

  it('shows the pushpin only once the map has moved, and captures its live position', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    // The map hasn't moved from the story's stored position yet.
    expect(
      screen.queryByRole('button', { name: /use current map position/i }),
    ).not.toBeInTheDocument();

    await user.click(container.querySelector('.leaflet-control-zoom-in')!);

    await user.click(await screen.findByRole('button', { name: /use current map position/i }));

    expect(screen.getByText(/39\.8283, -98\.5795 · Zoom 5/)).toBeInTheDocument();
  });

  it('shows a draggable map marker while editing a character position, and hides it again on back', async () => {
    await createStory({
      name: 'A Song of Ice and Fire',
      tileUrlTemplate: 'https://tile.example.com/{z}/{x}/{y}.png',
      tileLayerAuthor: null,
      tileLayerAttributionUrl: null,
      initialCenter: { lat: 39.8283, lng: -98.5795 },
      initialZoom: 4,
      minZoom: 0,
      maxZoom: 19,
    });
    resetDatabaseForTests();

    const user = userEvent.setup();
    const { container } = render(<App />);

    await screen.findByRole('button', { name: /a song of ice and fire/i });
    await user.click(screen.getByRole('button', { name: /^characters$/i }));
    await user.click(screen.getByRole('button', { name: /add character/i }));
    await screen.findByLabelText(/^name$/i);

    expect(container.querySelectorAll('.leaflet-marker-icon')).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: /^position$/i }));

    expect(await screen.findByText('Position 1')).toBeInTheDocument();
    expect(container.querySelectorAll('.leaflet-marker-icon')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: /back to sidebar/i }));

    expect(screen.queryByText('Position 1')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.leaflet-marker-icon')).toHaveLength(0);
  });

  it('opens the Position panel, prefilled, when a map pin is clicked', async () => {
    const story = await createStory({
      name: 'A Song of Ice and Fire',
      tileUrlTemplate: 'https://tile.example.com/{z}/{x}/{y}.png',
      tileLayerAuthor: null,
      tileLayerAttributionUrl: null,
      initialCenter: { lat: 39.8283, lng: -98.5795 },
      initialZoom: 4,
      minZoom: 0,
      maxZoom: 19,
    });
    const character = await createCharacter({
      storyId: story.id,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: null,
      sortOrder: 0,
    });
    await createCharacterPosition({
      characterId: character.id,
      position: { lat: 51.5, lng: -0.1278 },
      dead: true,
      note: null,
      tail: null,
      chapterRange: null,
      episodeRange: null,
    });
    resetDatabaseForTests();

    const user = userEvent.setup();
    const { container } = render(<App />);

    await screen.findByRole('button', { name: /a song of ice and fire/i });
    await user.click(screen.getByRole('button', { name: /^characters/i }));
    await user.click(await screen.findByText('Jon Snow'));

    let marker: Element | null = null;
    await vi.waitFor(() => {
      marker = container.querySelector('.leaflet-marker-icon');
      expect(marker).not.toBeNull();
    });
    fireEvent.click(marker!);

    expect(await screen.findByText('Position 1')).toBeInTheDocument();
    // Matches both the panel's own lat/lng caption and the (now offscreen)
    // list item's primary text for the same position.
    expect(screen.getAllByText('51.5000, -0.1278')).toHaveLength(2);
    expect(screen.getByRole('checkbox', { name: /dead/i })).toBeChecked();

    // The position (London) is far outside the story's initial view (the
    // continental US at zoom 4), so opening it recentered the map — shown
    // by the pushpin button, which only appears once the map has moved
    // from the story's saved position.
    expect(
      await screen.findByRole('button', { name: /use current map position/i }),
    ).toBeInTheDocument();

    // Only the pin being edited is draggable; clicking Back removes it
    // entirely along with the rest of the map markers.
    expect(container.querySelectorAll('.leaflet-marker-icon')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: /back to sidebar/i }));

    expect(container.querySelectorAll('.leaflet-marker-icon')).toHaveLength(1);
  });

  it('does not move the map when the position being edited is already in view', async () => {
    const story = await createStory({
      name: 'A Song of Ice and Fire',
      tileUrlTemplate: 'https://tile.example.com/{z}/{x}/{y}.png',
      tileLayerAuthor: null,
      tileLayerAttributionUrl: null,
      initialCenter: { lat: 39.8283, lng: -98.5795 },
      initialZoom: 4,
      minZoom: 0,
      maxZoom: 19,
    });
    const character = await createCharacter({
      storyId: story.id,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: null,
      sortOrder: 1,
    });
    // The story's own initial center is, by definition, within its initial
    // view.
    await createCharacterPosition({
      characterId: character.id,
      position: story.initialCenter,
      dead: false,
      note: null,
      tail: null,
      chapterRange: null,
      episodeRange: null,
    });
    resetDatabaseForTests();

    const user = userEvent.setup();
    const { container } = render(<App />);

    await screen.findByRole('button', { name: /a song of ice and fire/i });
    await user.click(screen.getByRole('button', { name: /^characters/i }));
    await user.click(await screen.findByText('Jon Snow'));

    let marker: Element | null = null;
    await vi.waitFor(() => {
      marker = container.querySelector('.leaflet-marker-icon');
      expect(marker).not.toBeNull();
    });
    fireEvent.click(marker!);

    expect(await screen.findByText('Position 1')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /use current map position/i }),
    ).not.toBeInTheDocument();
  });

  // Runs several real user interactions and a waitFor in sequence; slower CI
  // runners can exceed the default 5000ms test timeout.
  it('draws a tail by clicking the map, then saves it onto the position', async () => {
    await createStory({
      name: 'A Song of Ice and Fire',
      tileUrlTemplate: 'https://tile.example.com/{z}/{x}/{y}.png',
      tileLayerAuthor: null,
      tileLayerAttributionUrl: null,
      initialCenter: { lat: 39.8283, lng: -98.5795 },
      initialZoom: 4,
      minZoom: 0,
      maxZoom: 19,
    });
    resetDatabaseForTests();

    const user = userEvent.setup();
    const { container } = render(<App />);

    await screen.findByRole('button', { name: /a song of ice and fire/i });
    await user.click(screen.getByRole('button', { name: /^characters$/i }));
    await user.click(screen.getByRole('button', { name: /add character/i }));
    await screen.findByLabelText(/^name$/i);
    await user.click(screen.getByRole('button', { name: /^position$/i }));

    await screen.findByText('Position 1');
    const tailButton = screen.getByRole('button', { name: /add a tail/i });
    expect(tailButton).toBeEnabled();
    await user.click(tailButton);

    // While drawing, the tail button is replaced by Save/Cancel, and
    // clicking the map appends a point instead of doing nothing.
    expect(screen.queryByRole('button', { name: /add a tail/i })).not.toBeInTheDocument();
    const mapContainer = container.querySelector('.leaflet-container')!;
    fireEvent.click(mapContainer, { clientX: 120, clientY: 80 });
    fireEvent.click(mapContainer, { clientX: 160, clientY: 100 });

    await waitFor(() => {
      expect(container.querySelectorAll('.leaflet-interactive')).not.toHaveLength(0);
    });

    await user.click(screen.getByRole('button', { name: /^save$/i }));

    // Drawing mode ends and the tail button reappears.
    expect(await screen.findByRole('button', { name: /add a tail/i })).toBeInTheDocument();
  }, 10000);

  it('does not update state after unmounting while stories are still loading', async () => {
    const { unmount } = render(<App />);
    unmount();

    // The initial listStories() fetch is still in flight; letting it
    // resolve after unmount should not throw or warn about updating an
    // unmounted component.
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  it('shows the map timeline control for a story with books, and reports the initial scrub position', async () => {
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
    const book = await createBook({
      storyId: story.id,
      name: 'A Game of Thrones',
      author: null,
      url: null,
      sortOrder: 0,
    });
    await createChapter({ bookId: book.id, name: 'Prologue', url: null, sortOrder: 0 });

    render(<App />);

    expect(await screen.findByText('AGOT: Prologue')).toBeInTheDocument();
  });

  it('contains all content within landmark regions', () => {
    render(<App />);

    // Regression test for https://github.com/carpiediem/spoiler-maps/issues/1:
    // the map and its Leaflet controls must live inside a landmark, or
    // accessibility scanners flag them as unowned page content.
    expect(screen.getByRole('main')).toContainElement(document.querySelector('.leaflet-container'));
    expect(screen.getByRole('complementary')).toContainElement(
      screen.getByRole('button', { name: /new map/i }),
    );
  });
});
