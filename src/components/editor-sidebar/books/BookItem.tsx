import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState, type SyntheticEvent } from 'react';
import {
  createChapter,
  deleteChapter,
  updateBook,
  updateChapter,
  type Book,
  type Chapter,
} from '../../../db';
import { DeleteConfirmDialog } from '../DeleteConfirmDialog';
import { EntryEditorDialog } from '../EntryEditorDialog';
import { EntryList } from '../EntryList';

interface BookItemProps {
  book: Book;
  chapters: Chapter[];
  expanded: boolean;
  onToggle: (event: SyntheticEvent, isExpanded: boolean) => void;
  onBookChange: (book: Book) => void;
  onChaptersChange: (chapters: Chapter[]) => void;
  onDelete: () => void;
}

export function BookItem({
  book,
  chapters,
  expanded,
  onToggle,
  onBookChange,
  onChaptersChange,
  onDelete,
}: BookItemProps) {
  const [isChaptersDialogOpen, setIsChaptersDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  function handleFieldChange(field: 'name' | 'author' | 'url', value: string) {
    onBookChange({ ...book, [field]: field === 'name' ? value : value || null });
  }

  async function handleBlur() {
    await updateBook(book.id, {
      storyId: book.storyId,
      name: book.name,
      author: book.author,
      url: book.url,
      sortOrder: book.sortOrder,
    });
  }

  return (
    <Accordion
      expanded={expanded}
      onChange={onToggle}
      disableGutters
      elevation={0}
      square
      sx={{
        boxShadow: 'none',
        '&::before': { display: 'none' },
        borderRadius: 1,
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{ backgroundColor: 'rgba(0, 0, 0, .03)', px: 1, minHeight: 40 }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {book.name || 'Untitled Book'}
          </Typography>
          <Tooltip
            title={`${chapters.length} ${chapters.length === 1 ? 'chapter' : 'chapters'}`}
            arrow
          >
            <Chip label={chapters.length} size="small" variant="outlined" />
          </Tooltip>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 1, backgroundColor: 'rgba(0, 0, 0, .015)' }}>
        <Stack spacing={1.5}>
          <TextField
            label="Title"
            size="small"
            fullWidth
            value={book.name}
            onChange={(event) => handleFieldChange('name', event.target.value)}
            onBlur={handleBlur}
          />
          <TextField
            label="Author"
            size="small"
            fullWidth
            value={book.author ?? ''}
            onChange={(event) => handleFieldChange('author', event.target.value)}
            onBlur={handleBlur}
          />
          <TextField
            label="URL"
            size="small"
            fullWidth
            value={book.url ?? ''}
            onChange={(event) => handleFieldChange('url', event.target.value)}
            onBlur={handleBlur}
            sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
            slotProps={{
              input: {
                endAdornment: book.url && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      aria-label="Open URL"
                      href={book.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      edge="end"
                    >
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          <Button size="small" onClick={() => setIsChaptersDialogOpen(true)} fullWidth>
            Edit Chapters
          </Button>
          <Button size="small" color="error" onClick={() => setIsDeleteConfirmOpen(true)} fullWidth>
            Delete Book
          </Button>
        </Stack>
      </AccordionDetails>

      <EntryEditorDialog
        open={isChaptersDialogOpen}
        onClose={() => setIsChaptersDialogOpen(false)}
        title={`${book.name || 'Untitled Book'} — Chapters`}
      >
        <EntryList
          items={chapters}
          onItemsChange={onChaptersChange}
          onCreate={(sortOrder) =>
            createChapter({ bookId: book.id, name: '', url: null, sortOrder })
          }
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
      </EntryEditorDialog>

      <DeleteConfirmDialog
        open={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => {
          setIsDeleteConfirmOpen(false);
          onDelete();
        }}
        title={`Delete “${book.name || 'Untitled Book'}”?`}
        description={
          chapters.length === 0
            ? 'This will permanently delete the book. This can’t be undone.'
            : `This will permanently delete the book and all ${chapters.length} of its ${chapters.length === 1 ? 'chapter' : 'chapters'}. This can’t be undone.`
        }
      />
    </Accordion>
  );
}
