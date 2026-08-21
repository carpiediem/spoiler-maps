import AddIcon from '@mui/icons-material/Add';
import { Button, Stack, Typography } from '@mui/material';
import { useCallback, useState } from 'react';
import {
  createBook,
  deleteBook,
  listBooksForStory,
  listChaptersForBook,
  type Book,
  type Chapter,
} from '../../db';
import { sortOrderAfter } from '../../db/ordering';
import { BookItem } from './books/BookItem';
import { useExpandableEntityList } from './useExpandableEntityList';

interface BooksSectionProps {
  storyId: number;
  /** 1-based index of the book to auto-expand, e.g. from a #books-1 URL hash. */
  initialExpandedIndex?: number | null;
  onCountChange?: (count: number) => void;
}

export function BooksSection({ storyId, initialExpandedIndex, onCountChange }: BooksSectionProps) {
  const [chaptersByBookId, setChaptersByBookId] = useState<Record<number, Chapter[]>>({});

  const load = useCallback(async (storyId: number, isCancelled: () => boolean) => {
    const loadedBooks = await listBooksForStory(storyId);
    if (isCancelled()) return loadedBooks;
    const chapterLists = await Promise.all(loadedBooks.map((book) => listChaptersForBook(book.id)));
    /* v8 ignore next -- exercising this specific unmount window (after listBooksForStory resolves but before the chapter Promise.all does) is too timing-dependent to test reliably; the outer isCancelled() check above covers the same defensive purpose. */
    if (isCancelled()) return loadedBooks;

    const chapterMap: Record<number, Chapter[]> = {};
    loadedBooks.forEach((book, index) => {
      chapterMap[book.id] = chapterLists[index];
    });
    setChaptersByBookId(chapterMap);
    return loadedBooks;
  }, []);

  const onReset = useCallback(() => setChaptersByBookId({}), []);

  const {
    entities: books,
    expandedId: expandedBookId,
    toggle,
    addEntity,
    updateEntity,
    removeEntity,
  } = useExpandableEntityList<Book>({
    storyId,
    initialExpandedIndex,
    onCountChange,
    load,
    onReset,
  });

  // Only reachable once books have loaded: the Loading/Add Book UI below
  // only renders handleAddBook's/handleBookChange's callers (the Add Book
  // button, BookItem) after the `books === null` early return.
  async function handleAddBook() {
    const sortOrder = sortOrderAfter(books!.map((book) => book.sortOrder));
    const book = await createBook({ storyId, name: '', author: null, url: null, sortOrder });
    addEntity(book);
    setChaptersByBookId((previous) => ({ ...previous, [book.id]: [] }));
  }

  function handleChaptersChange(bookId: number, chapters: Chapter[]) {
    setChaptersByBookId((previous) => ({ ...previous, [bookId]: chapters }));
  }

  // Only reachable while bookId is the expanded book: the Delete Book
  // button that triggers this only renders inside that book's own
  // AccordionDetails.
  async function handleDeleteBook(bookId: number) {
    await deleteBook(bookId);
    removeEntity(bookId);
    setChaptersByBookId((previous) => {
      const next = { ...previous };
      delete next[bookId];
      return next;
    });
  }

  if (books === null) {
    return (
      <Typography variant="body2" color="text.secondary">
        Loading books…
      </Typography>
    );
  }

  return (
    <Stack spacing={1}>
      {books.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No books yet.
        </Typography>
      )}

      {books.map((book) => (
        <BookItem
          key={book.id}
          book={book}
          chapters={chaptersByBookId[book.id]}
          expanded={expandedBookId === book.id}
          onToggle={toggle(book.id)}
          onBookChange={updateEntity}
          onChaptersChange={(chapters) => handleChaptersChange(book.id, chapters)}
          onDelete={() => handleDeleteBook(book.id)}
        />
      ))}

      <Button size="small" startIcon={<AddIcon fontSize="small" />} onClick={handleAddBook}>
        Add Book
      </Button>
    </Stack>
  );
}
