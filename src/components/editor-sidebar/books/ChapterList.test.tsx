import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createBook,
  createChapter,
  createStory,
  listChaptersForBook,
  type Chapter,
} from '../../../db';
import { resetDatabaseForTests } from '../../../db/client';
import { ChapterList } from './ChapterList';

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

async function seedBookId(): Promise<number> {
  const story = await createStory({
    name: 'A Song of Ice and Fire',
    tileUrlTemplate: null,
    tileLayerAuthor: null,
    tileLayerAttributionUrl: null,
    initialCenter: { lat: 0, lng: 0 },
    initialZoom: 4,
  });
  const book = await createBook({
    storyId: story.id,
    name: 'A Game of Thrones',
    author: null,
    url: null,
    sortOrder: 0,
  });
  return book.id;
}

describe('ChapterList', () => {
  it('renders no rows when there are no chapters', () => {
    render(<ChapterList bookId={1} chapters={[]} onChaptersChange={vi.fn()} />);

    expect(screen.getByText(/chapters/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/chapter name/i)).not.toBeInTheDocument();
  });

  it('creates a chapter in the database and reports it to the parent', async () => {
    const bookId = await seedBookId();
    const onChaptersChange = vi.fn();
    const user = userEvent.setup();
    render(<ChapterList bookId={bookId} chapters={[]} onChaptersChange={onChaptersChange} />);

    await user.click(screen.getByRole('button', { name: /add chapter/i }));

    expect(onChaptersChange).toHaveBeenCalledTimes(1);
    const [created] = onChaptersChange.mock.calls[0][0] as Chapter[];
    expect(created).toMatchObject({ bookId, name: '', sortOrder: 0 });
    expect(await listChaptersForBook(bookId)).toHaveLength(1);
  });

  it('appends a new chapter after existing ones', async () => {
    const bookId = await seedBookId();
    const chapter = await createChapter({ bookId, name: 'Prologue', url: null, sortOrder: 0 });
    const onChaptersChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ChapterList bookId={bookId} chapters={[chapter]} onChaptersChange={onChaptersChange} />,
    );

    await user.click(screen.getByRole('button', { name: /add chapter/i }));

    const reported = onChaptersChange.mock.calls[0][0] as Chapter[];
    expect(reported.at(-1)).toMatchObject({ bookId, name: '', sortOrder: 1 });
  });

  it('renames a chapter on blur and persists it', async () => {
    const bookId = await seedBookId();
    const chapter = await createChapter({ bookId, name: 'Prologue', url: null, sortOrder: 0 });
    const user = userEvent.setup();

    function Wrapper() {
      const [chapters, setChapters] = useState<Chapter[]>([chapter]);
      return <ChapterList bookId={bookId} chapters={chapters} onChaptersChange={setChapters} />;
    }
    render(<Wrapper />);

    const input = screen.getByDisplayValue('Prologue');
    await user.clear(input);
    await user.type(input, 'Chapter 1');
    await user.tab();

    const [persisted] = await listChaptersForBook(bookId);
    expect(persisted.name).toBe('Chapter 1');
  });

  it('edits a chapter Wiki URL on blur and persists it, storing a blank value as null', async () => {
    const bookId = await seedBookId();
    const chapter = await createChapter({
      bookId,
      name: 'Prologue',
      url: 'https://awoiaf.westeros.org/index.php/Prologue',
      sortOrder: 0,
    });
    const user = userEvent.setup();

    function Wrapper() {
      const [chapters, setChapters] = useState<Chapter[]>([chapter]);
      return <ChapterList bookId={bookId} chapters={chapters} onChaptersChange={setChapters} />;
    }
    render(<Wrapper />);

    const urlInput = screen.getByDisplayValue('https://awoiaf.westeros.org/index.php/Prologue');
    await user.clear(urlInput);
    await user.type(urlInput, 'https://example.com/prologue');
    await user.tab();

    let [persisted] = await listChaptersForBook(bookId);
    expect(persisted.url).toBe('https://example.com/prologue');

    await user.clear(screen.getByDisplayValue('https://example.com/prologue'));
    await user.tab();

    [persisted] = await listChaptersForBook(bookId);
    expect(persisted.url).toBeNull();
  });

  it('renaming one chapter does not affect a sibling chapter', async () => {
    const bookId = await seedBookId();
    const chapter1 = await createChapter({ bookId, name: 'Prologue', url: null, sortOrder: 0 });
    const chapter2 = await createChapter({ bookId, name: 'Bran', url: null, sortOrder: 1 });
    const user = userEvent.setup();

    function Wrapper() {
      const [chapters, setChapters] = useState<Chapter[]>([chapter1, chapter2]);
      return <ChapterList bookId={bookId} chapters={chapters} onChaptersChange={setChapters} />;
    }
    render(<Wrapper />);

    await user.type(screen.getByDisplayValue('Prologue'), ' I');

    expect(screen.getByDisplayValue('Prologue I')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Bran')).toBeInTheDocument();
  });

  it('deletes a chapter from the database and removes it from the list', async () => {
    const bookId = await seedBookId();
    const chapter = await createChapter({ bookId, name: 'Prologue', url: null, sortOrder: 0 });
    const onChaptersChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ChapterList bookId={bookId} chapters={[chapter]} onChaptersChange={onChaptersChange} />,
    );

    await user.click(screen.getByRole('button', { name: /delete chapter/i }));

    expect(onChaptersChange).toHaveBeenCalledWith([]);
    expect(await listChaptersForBook(bookId)).toEqual([]);
  });
});
