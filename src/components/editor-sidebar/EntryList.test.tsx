import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createBook,
  createChapter,
  createStory,
  deleteChapter,
  listChaptersForBook,
  updateChapter,
  type Chapter,
} from '../../db';
import { resetDatabaseForTests } from '../../db/client';
import { EntryList } from './EntryList';

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

// EntryList is generic — these tests exercise it via chapters, since that's
// one of its two real call sites (the other being episodes) and the two
// are structurally identical from EntryList's point of view.
function ChaptersEntryList({
  bookId,
  chapters,
  onChaptersChange,
}: {
  bookId: number;
  chapters: Chapter[];
  onChaptersChange: (chapters: Chapter[]) => void;
}) {
  return (
    <EntryList
      items={chapters}
      onItemsChange={onChaptersChange}
      onCreate={(sortOrder) => createChapter({ bookId, name: '', url: null, sortOrder })}
      onUpdate={(chapter) =>
        updateChapter(chapter.id, {
          bookId: chapter.bookId,
          name: chapter.name,
          url: chapter.url,
          sortOrder: chapter.sortOrder,
        })
      }
      onDelete={deleteChapter}
      nameColumnLabel="Title"
      namePlaceholder="Chapter name"
      urlPlaceholder="Chapter Wiki URL"
      addLabel="Add Chapter"
      deleteLabel="Delete chapter"
    />
  );
}

describe('EntryList', () => {
  it('renders no rows or column headers when there are no items', () => {
    render(<ChaptersEntryList bookId={1} chapters={[]} onChaptersChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: /add chapter/i })).toBeInTheDocument();
    expect(screen.queryByText(/^title$/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/chapter name/i)).not.toBeInTheDocument();
  });

  it('creates an item via onCreate and reports it to the parent', async () => {
    const bookId = await seedBookId();
    const onChaptersChange = vi.fn();
    const user = userEvent.setup();
    render(<ChaptersEntryList bookId={bookId} chapters={[]} onChaptersChange={onChaptersChange} />);

    await user.click(screen.getByRole('button', { name: /add chapter/i }));

    expect(onChaptersChange).toHaveBeenCalledTimes(1);
    const [created] = onChaptersChange.mock.calls[0][0] as Chapter[];
    expect(created).toMatchObject({ bookId, name: '', sortOrder: 0 });
    expect(await listChaptersForBook(bookId)).toHaveLength(1);
  });

  it('appends a new item after existing ones', async () => {
    const bookId = await seedBookId();
    const chapter = await createChapter({ bookId, name: 'Prologue', url: null, sortOrder: 0 });
    const onChaptersChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ChaptersEntryList
        bookId={bookId}
        chapters={[chapter]}
        onChaptersChange={onChaptersChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: /add chapter/i }));

    const reported = onChaptersChange.mock.calls[0][0] as Chapter[];
    expect(reported.at(-1)).toMatchObject({ bookId, name: '', sortOrder: 1 });
  });

  it('renames an item on blur and persists it via onUpdate', async () => {
    const bookId = await seedBookId();
    const chapter = await createChapter({ bookId, name: 'Prologue', url: null, sortOrder: 0 });
    const user = userEvent.setup();

    function Wrapper() {
      const [chapters, setChapters] = useState<Chapter[]>([chapter]);
      return (
        <ChaptersEntryList bookId={bookId} chapters={chapters} onChaptersChange={setChapters} />
      );
    }
    render(<Wrapper />);

    const input = screen.getByDisplayValue('Prologue');
    await user.clear(input);
    await user.type(input, 'Chapter 1');
    await user.tab();

    const [persisted] = await listChaptersForBook(bookId);
    expect(persisted.name).toBe('Chapter 1');
  });

  it('edits an item URL on blur and persists it, storing a blank value as null', async () => {
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
      return (
        <ChaptersEntryList bookId={bookId} chapters={chapters} onChaptersChange={setChapters} />
      );
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

  it('renaming one item does not affect a sibling item', async () => {
    const bookId = await seedBookId();
    const chapter1 = await createChapter({ bookId, name: 'Prologue', url: null, sortOrder: 0 });
    const chapter2 = await createChapter({ bookId, name: 'Bran', url: null, sortOrder: 1 });
    const user = userEvent.setup();

    function Wrapper() {
      const [chapters, setChapters] = useState<Chapter[]>([chapter1, chapter2]);
      return (
        <ChaptersEntryList bookId={bookId} chapters={chapters} onChaptersChange={setChapters} />
      );
    }
    render(<Wrapper />);

    await user.type(screen.getByDisplayValue('Prologue'), ' I');

    expect(screen.getByDisplayValue('Prologue I')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Bran')).toBeInTheDocument();
  });

  it('moves focus between name fields with the arrow keys', async () => {
    const bookId = await seedBookId();
    const chapter1 = await createChapter({ bookId, name: 'Prologue', url: null, sortOrder: 0 });
    const chapter2 = await createChapter({ bookId, name: 'Bran', url: null, sortOrder: 1 });
    const user = userEvent.setup();
    render(
      <ChaptersEntryList
        bookId={bookId}
        chapters={[chapter1, chapter2]}
        onChaptersChange={vi.fn()}
      />,
    );

    const prologueField = screen.getByDisplayValue('Prologue');
    const branField = screen.getByDisplayValue('Bran');

    prologueField.focus();
    await user.keyboard('{ArrowDown}');
    expect(branField).toHaveFocus();

    await user.keyboard('{ArrowUp}');
    expect(prologueField).toHaveFocus();
  });

  it('moves focus between URL fields with the arrow keys, independently of the name column', async () => {
    const bookId = await seedBookId();
    const chapter1 = await createChapter({
      bookId,
      name: 'Prologue',
      url: 'https://example.com/1',
      sortOrder: 0,
    });
    const chapter2 = await createChapter({
      bookId,
      name: 'Bran',
      url: 'https://example.com/2',
      sortOrder: 1,
    });
    const user = userEvent.setup();
    render(
      <ChaptersEntryList
        bookId={bookId}
        chapters={[chapter1, chapter2]}
        onChaptersChange={vi.fn()}
      />,
    );

    const firstUrlField = screen.getByDisplayValue('https://example.com/1');
    const secondUrlField = screen.getByDisplayValue('https://example.com/2');

    firstUrlField.focus();
    await user.keyboard('{ArrowDown}');
    expect(secondUrlField).toHaveFocus();
  });

  it('does nothing when the arrow keys would move focus past the first or last item', async () => {
    const bookId = await seedBookId();
    const chapter = await createChapter({ bookId, name: 'Prologue', url: null, sortOrder: 0 });
    const user = userEvent.setup();
    render(<ChaptersEntryList bookId={bookId} chapters={[chapter]} onChaptersChange={vi.fn()} />);

    const nameField = screen.getByDisplayValue('Prologue');
    nameField.focus();

    await user.keyboard('{ArrowUp}');
    expect(nameField).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(nameField).toHaveFocus();
  });

  it('leaves other keys alone', async () => {
    const bookId = await seedBookId();
    const chapter = await createChapter({ bookId, name: 'Prologue', url: null, sortOrder: 0 });
    const user = userEvent.setup();
    render(<ChaptersEntryList bookId={bookId} chapters={[chapter]} onChaptersChange={vi.fn()} />);

    const nameField = screen.getByDisplayValue('Prologue');
    nameField.focus();
    await user.keyboard('{ArrowLeft}');

    expect(nameField).toHaveFocus();
  });

  it('deletes an item via onDelete and removes it from the list', async () => {
    const bookId = await seedBookId();
    const chapter = await createChapter({ bookId, name: 'Prologue', url: null, sortOrder: 0 });
    const onChaptersChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ChaptersEntryList
        bookId={bookId}
        chapters={[chapter]}
        onChaptersChange={onChaptersChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: /delete chapter/i }));

    expect(onChaptersChange).toHaveBeenCalledWith([]);
    expect(await listChaptersForBook(bookId)).toEqual([]);
  });
});
