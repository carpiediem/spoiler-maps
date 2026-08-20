import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createBook,
  createStory,
  getStory,
  listBooksForStory,
  type Book,
  type Chapter,
} from '../../../db';
import { resetDatabaseForTests } from '../../../db/client';
import { BookItem } from './BookItem';

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

async function seedBook(overrides: Partial<Parameters<typeof createBook>[0]> = {}): Promise<Book> {
  const story = await createStory({
    name: 'A Song of Ice and Fire',
    tileUrlTemplate: null,
    tileLayerAuthor: null,
    tileLayerAttributionUrl: null,
    initialCenter: { lat: 0, lng: 0 },
    initialZoom: 4,
  });
  return createBook({
    storyId: story.id,
    name: 'A Game of Thrones',
    author: null,
    url: null,
    sortOrder: 0,
    ...overrides,
  });
}

function Wrapper({ initialBook, chapters }: { initialBook: Book; chapters: Chapter[] }) {
  const [book, setBook] = useState(initialBook);
  const [expanded, setExpanded] = useState(true);
  return (
    <BookItem
      book={book}
      chapters={chapters}
      expanded={expanded}
      onToggle={(_event, isExpanded) => setExpanded(isExpanded)}
      onBookChange={setBook}
      onChaptersChange={vi.fn()}
    />
  );
}

describe('BookItem', () => {
  it('shows the book name and chapter count in the summary, with a tooltip spelling out the count', async () => {
    const book: Book = {
      id: 1,
      storyId: 1,
      name: 'A Game of Thrones',
      author: null,
      url: null,
      sortOrder: 0,
    };
    const user = userEvent.setup();
    render(
      <BookItem
        book={book}
        chapters={[
          { id: 1, bookId: 1, name: 'Prologue', url: null, sortOrder: 0 },
          { id: 2, bookId: 1, name: 'Bran', url: null, sortOrder: 1 },
        ]}
        expanded={false}
        onToggle={vi.fn()}
        onBookChange={vi.fn()}
        onChaptersChange={vi.fn()}
      />,
    );

    expect(screen.getByText('A Game of Thrones')).toBeInTheDocument();
    const count = screen.getByText('2');
    expect(count).toBeInTheDocument();

    await user.hover(count);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('2 chapters');
  });

  it('falls back to "Untitled Book" and singular "chapter" in the tooltip', async () => {
    const book: Book = { id: 1, storyId: 1, name: '', author: null, url: null, sortOrder: 0 };
    const user = userEvent.setup();
    render(
      <BookItem
        book={book}
        chapters={[{ id: 1, bookId: 1, name: 'Prologue', url: null, sortOrder: 0 }]}
        expanded={false}
        onToggle={vi.fn()}
        onBookChange={vi.fn()}
        onChaptersChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Untitled Book')).toBeInTheDocument();
    const count = screen.getByText('1');
    await user.hover(count);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('1 chapter');
  });

  it('edits and persists the name, author, and Wiki URL fields on blur', async () => {
    const book = await seedBook();
    const user = userEvent.setup();
    render(<Wrapper initialBook={book} chapters={[]} />);

    await user.clear(screen.getByLabelText(/^name$/i));
    await user.type(screen.getByLabelText(/^name$/i), 'A Clash of Kings');
    await user.type(screen.getByLabelText(/^author$/i), 'George R. R. Martin');
    await user.type(
      screen.getByLabelText(/wiki url/i),
      'https://awoiaf.westeros.org/index.php/A_Clash_of_Kings',
    );
    await user.tab();

    const [persisted] = await listBooksForStory(book.storyId);
    expect(persisted).toMatchObject({
      name: 'A Clash of Kings',
      author: 'George R. R. Martin',
      url: 'https://awoiaf.westeros.org/index.php/A_Clash_of_Kings',
    });
  });

  it('stores blank author/url as null', async () => {
    const book = await seedBook({ author: 'Someone', url: 'https://example.com' });
    const user = userEvent.setup();
    render(<Wrapper initialBook={book} chapters={[]} />);

    await user.clear(screen.getByLabelText(/^author$/i));
    await user.tab();
    await user.clear(screen.getByLabelText(/wiki url/i));
    await user.tab();

    const [persisted] = await listBooksForStory(book.storyId);
    expect(persisted.author).toBeNull();
    expect(persisted.url).toBeNull();
  });

  it('does not touch the story when persisting a book edit', async () => {
    const book = await seedBook();
    const before = await getStory(book.storyId);
    const user = userEvent.setup();
    render(<Wrapper initialBook={book} chapters={[]} />);

    await user.type(screen.getByLabelText(/^author$/i), 'GRRM');
    await user.tab();

    expect(await getStory(book.storyId)).toEqual(before);
  });
});
