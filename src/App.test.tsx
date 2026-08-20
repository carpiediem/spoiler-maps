import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { resetDatabaseForTests } from './db/client';
import { createStory } from './db';

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
    fireEvent.change(screen.getByLabelText(/tile url template/i), {
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
      initialCenter: { lat: 39.8283, lng: -98.5795 },
      initialZoom: 4,
    });
    await createStory({
      name: 'The Wheel of Time',
      tileUrlTemplate: 'https://tile.example.com/wot/{z}/{x}/{y}.png',
      initialCenter: { lat: 39.8283, lng: -98.5795 },
      initialZoom: 4,
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

  it('does not update state after unmounting while stories are still loading', async () => {
    const { unmount } = render(<App />);
    unmount();

    // The initial listStories() fetch is still in flight; letting it
    // resolve after unmount should not throw or warn about updating an
    // unmounted component.
    await new Promise((resolve) => setTimeout(resolve, 50));
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
