import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createBook, createStory, listBooksForStory } from '../../db';
import { resetDatabaseForTests } from '../../db/client';
import { BooksSection } from './BooksSection';

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

describe('BooksSection', () => {
  it('shows a loading state, then "No books yet." for a story with none', async () => {
    const storyId = await seedStoryId();
    render(<BooksSection storyId={storyId} />);

    expect(screen.getByText(/loading books/i)).toBeInTheDocument();
    expect(await screen.findByText(/no books yet/i)).toBeInTheDocument();
  });

  it('lists existing books with their chapter counts', async () => {
    const storyId = await seedStoryId();
    await createBook({ storyId, name: 'A Game of Thrones', author: null, url: null, sortOrder: 0 });
    render(<BooksSection storyId={storyId} />);

    expect(await screen.findByText('A Game of Thrones')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('adds a new book at the bottom of the list, expanded, and persists it', async () => {
    const storyId = await seedStoryId();
    await createBook({ storyId, name: 'A Game of Thrones', author: null, url: null, sortOrder: 0 });
    const user = userEvent.setup();
    render(<BooksSection storyId={storyId} />);

    await screen.findByText('A Game of Thrones');
    await user.click(screen.getByRole('button', { name: /add book/i }));

    await screen.findByText('Untitled Book');
    const [existingTitleField, newTitleField] = screen.getAllByLabelText(/^title$/i);
    await waitFor(() => expect(existingTitleField).not.toBeVisible());
    await waitFor(() => expect(newTitleField).toBeVisible());
    expect(await listBooksForStory(storyId)).toHaveLength(2);
  });

  it('auto-expands the book at the 1-based initialExpandedIndex', async () => {
    const storyId = await seedStoryId();
    await createBook({ storyId, name: 'A Game of Thrones', author: null, url: null, sortOrder: 0 });
    await createBook({ storyId, name: 'A Clash of Kings', author: null, url: null, sortOrder: 1 });
    render(<BooksSection storyId={storyId} initialExpandedIndex={2} />);

    await screen.findByText('A Game of Thrones');
    await waitFor(() => expect(screen.getByDisplayValue('A Clash of Kings')).toBeVisible());
    expect(screen.getByDisplayValue('A Game of Thrones')).not.toBeVisible();
  });

  it('reflects book edits and added chapters, and collapses when the accordion is closed again', async () => {
    const storyId = await seedStoryId();
    await createBook({ storyId, name: 'A Game of Thrones', author: null, url: null, sortOrder: 0 });
    const user = userEvent.setup();
    render(<BooksSection storyId={storyId} />);

    await user.click(await screen.findByText('A Game of Thrones'));

    const titleField = screen.getByLabelText(/^title$/i);
    await user.type(titleField, ' II');
    expect(screen.getByText('A Game of Thrones II')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /edit chapters/i }));
    await user.click(await screen.findByRole('button', { name: /add chapter/i }));
    expect(await screen.findByText('1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByText('A Game of Thrones II'));
    await waitFor(() => expect(titleField).not.toBeVisible());
  });

  it('editing one book does not affect a sibling book', async () => {
    const storyId = await seedStoryId();
    await createBook({ storyId, name: 'A Game of Thrones', author: null, url: null, sortOrder: 0 });
    await createBook({ storyId, name: 'A Clash of Kings', author: null, url: null, sortOrder: 1 });
    const user = userEvent.setup();
    render(<BooksSection storyId={storyId} />);

    await user.click(await screen.findByText('A Game of Thrones'));
    const visibleTitleField = screen
      .getAllByLabelText(/^title$/i)
      .find(
        (field) =>
          window.getComputedStyle(field.closest('.MuiCollapse-root')!).visibility !== 'hidden',
      )!;
    await user.type(visibleTitleField, ' II');

    expect(screen.getByText('A Game of Thrones II')).toBeInTheDocument();
    expect(screen.getByText('A Clash of Kings')).toBeInTheDocument();
  });

  it('deletes a book from the database and the list, collapsing back to nothing expanded', async () => {
    const storyId = await seedStoryId();
    await createBook({ storyId, name: 'A Game of Thrones', author: null, url: null, sortOrder: 0 });
    await createBook({ storyId, name: 'A Clash of Kings', author: null, url: null, sortOrder: 1 });
    const user = userEvent.setup();
    render(<BooksSection storyId={storyId} />);

    await user.click(await screen.findByText('A Game of Thrones'));
    await user.click(screen.getByRole('button', { name: /delete book/i }));
    await user.click(await screen.findByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(screen.queryByText('A Game of Thrones')).not.toBeInTheDocument());
    expect(screen.getByText('A Clash of Kings')).toBeInTheDocument();
    expect(await listBooksForStory(storyId)).toHaveLength(1);
  });

  it('does not update state after unmounting while books are still loading', async () => {
    const storyId = await seedStoryId();
    await createBook({ storyId, name: 'A Game of Thrones', author: null, url: null, sortOrder: 0 });
    const { unmount } = render(<BooksSection storyId={storyId} />);

    unmount();

    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  it('ignores an out-of-range initialExpandedIndex', async () => {
    const storyId = await seedStoryId();
    await createBook({ storyId, name: 'A Game of Thrones', author: null, url: null, sortOrder: 0 });
    render(<BooksSection storyId={storyId} initialExpandedIndex={5} />);

    await screen.findByText('A Game of Thrones');
    expect(screen.getByDisplayValue('A Game of Thrones')).not.toBeVisible();
  });
});
