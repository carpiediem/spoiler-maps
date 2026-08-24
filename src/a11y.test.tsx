import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { createBook, createChapter, createStory } from './db';
import { resetDatabaseForTests } from './db/client';

// The set of elements axe's "region" rule accepts as a landmark. Anything
// rendered outside all of these is "page content not contained by a
// landmark" — see issue #31.
const LANDMARK_SELECTOR =
  'main, [role="main"], aside, [role="complementary"], nav, [role="navigation"], header, [role="banner"], footer, [role="contentinfo"], [role="region"][aria-label], [role="region"][aria-labelledby], section[aria-label], section[aria-labelledby], form[aria-label], form[aria-labelledby], [role="search"], [role="dialog"], [role="alertdialog"]';

/** Every element under <body>, outside all landmarks, that owns its own text (not just from descendants). */
function findOrphanedContent(): Element[] {
  const orphans: Element[] = [];
  function walk(node: Element) {
    if (node.matches(LANDMARK_SELECTOR)) return; // this element, and everything inside it, is contained
    const ownsText = Array.from(node.childNodes).some(
      (child) => child.nodeType === Node.TEXT_NODE && child.textContent?.trim(),
    );
    if (ownsText) orphans.push(node);
    Array.from(node.children).forEach(walk);
  }
  Array.from(document.body.children).forEach(walk);
  return orphans;
}

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
  localStorage.clear();
});

describe('accessibility: all content is contained by a landmark', () => {
  it('has no orphaned content on a fresh "New Map"', async () => {
    render(
      <MemoryRouter initialEntries={['/edit']}>
        <App />
      </MemoryRouter>,
    );
    await screen.findByRole('button', { name: /new map/i });

    expect(findOrphanedContent()).toEqual([]);
  });

  it('has no orphaned content with a saved story and an expanded book accordion', async () => {
    const story = await createStory({
      name: 'A Song of Ice and Fire',
      tileUrlTemplate: 'https://tile.example.com/{z}/{x}/{y}.png',
      tileLayerAuthor: null,
      tileLayerAttributionUrl: null,
      initialCenter: { lat: 39.8283, lng: -98.5795 },
      initialZoom: 4,
      minZoom: 0,
      maxZoom: 19,
      description: null,
      paletteKey: null,
    });
    const book = await createBook({
      storyId: story.id,
      name: 'A Game of Thrones',
      author: null,
      url: null,
      sortOrder: 0,
    });
    await createChapter({ bookId: book.id, name: 'Prologue', url: null, sortOrder: 0 });
    resetDatabaseForTests();
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={[`/edit/${story.id}`]}>
        <App />
      </MemoryRouter>,
    );
    await screen.findByDisplayValue('A Song of Ice and Fire');
    await user.click(screen.getByRole('heading', { level: 2, name: /books/i }));
    await screen.findByText('A Game of Thrones');

    expect(findOrphanedContent()).toEqual([]);
  });

  it('has no orphaned content on the view screen once loaded', async () => {
    const story = await createStory({
      name: 'A Song of Ice and Fire',
      tileUrlTemplate: null,
      tileLayerAuthor: null,
      tileLayerAttributionUrl: null,
      initialCenter: { lat: 5, lng: 5 },
      initialZoom: 4,
      minZoom: 0,
      maxZoom: 19,
      description: null,
      paletteKey: null,
    });
    resetDatabaseForTests();
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={[`/view/${story.id}`]}>
        <App />
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole('button', { name: /got it/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    expect(findOrphanedContent()).toEqual([]);
  });
});
