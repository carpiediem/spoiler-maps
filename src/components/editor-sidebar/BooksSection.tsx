import AddIcon from '@mui/icons-material/Add';
import { Button, Stack, Typography } from '@mui/material';
import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import {
  createBook,
  listBooksForStory,
  listChaptersForBook,
  type Book,
  type Chapter,
} from '../../db';
import { sortOrderAfter } from '../../db/ordering';
import { BookItem } from './books/BookItem';

interface BooksSectionProps {
  storyId: number;
  /** 1-based index of the book to auto-expand, e.g. from a #books-1 URL hash. */
  initialExpandedIndex?: number | null;
}

export function BooksSection({ storyId, initialExpandedIndex }: BooksSectionProps) {
  const [books, setBooks] = useState<Book[] | null>(null);
  const [chaptersByBookId, setChaptersByBookId] = useState<Record<number, Chapter[]>>({});
  const [expandedBookId, setExpandedBookId] = useState<number | null>(null);
  const appliedInitialIndexRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    function resetForNewStory() {
      setBooks(null);
      setExpandedBookId(null);
      appliedInitialIndexRef.current = false;
    }
    resetForNewStory();

    listBooksForStory(storyId).then(async (loadedBooks) => {
      if (cancelled) return;
      const chapterLists = await Promise.all(
        loadedBooks.map((book) => listChaptersForBook(book.id)),
      );
      /* v8 ignore next -- exercising this specific unmount window (after listBooksForStory resolves but before the chapter Promise.all does) is too timing-dependent to test reliably; the outer cancelled check above covers the same defensive purpose. */
      if (cancelled) return;

      setBooks(loadedBooks);
      const chapterMap: Record<number, Chapter[]> = {};
      loadedBooks.forEach((book, index) => {
        chapterMap[book.id] = chapterLists[index];
      });
      setChaptersByBookId(chapterMap);
    });

    return () => {
      cancelled = true;
    };
  }, [storyId]);

  useEffect(() => {
    function applyInitialExpandedIndex() {
      if (books === null || appliedInitialIndexRef.current) return;
      appliedInitialIndexRef.current = true;
      const targetBook = initialExpandedIndex ? books[initialExpandedIndex - 1] : undefined;
      if (targetBook) setExpandedBookId(targetBook.id);
    }
    applyInitialExpandedIndex();
  }, [books, initialExpandedIndex]);

  // Only reachable once books have loaded: the Loading/Add Book UI below
  // only renders handleAddBook's/handleBookChange's callers (the Add Book
  // button, BookItem) after the `books === null` early return.
  async function handleAddBook() {
    const sortOrder = sortOrderAfter(books!.map((book) => book.sortOrder));
    const book = await createBook({ storyId, name: '', author: null, url: null, sortOrder });
    setBooks((previous) => [...previous!, book]);
    setChaptersByBookId((previous) => ({ ...previous, [book.id]: [] }));
    setExpandedBookId(book.id);
  }

  function handleBookChange(updated: Book) {
    setBooks((previous) => previous!.map((book) => (book.id === updated.id ? updated : book)));
  }

  function handleChaptersChange(bookId: number, chapters: Chapter[]) {
    setChaptersByBookId((previous) => ({ ...previous, [bookId]: chapters }));
  }

  function handleToggle(bookId: number) {
    return (_event: SyntheticEvent, isExpanded: boolean) => {
      setExpandedBookId(isExpanded ? bookId : null);
    };
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
          onToggle={handleToggle(book.id)}
          onBookChange={handleBookChange}
          onChaptersChange={(chapters) => handleChaptersChange(book.id, chapters)}
        />
      ))}

      <Button size="small" startIcon={<AddIcon fontSize="small" />} onClick={handleAddBook}>
        Add Book
      </Button>
    </Stack>
  );
}
