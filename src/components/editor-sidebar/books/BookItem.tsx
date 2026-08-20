import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Chip,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { SyntheticEvent } from 'react';
import { updateBook, type Book, type Chapter } from '../../../db';
import { ChapterList } from './ChapterList';

interface BookItemProps {
  book: Book;
  chapters: Chapter[];
  expanded: boolean;
  onToggle: (event: SyntheticEvent, isExpanded: boolean) => void;
  onBookChange: (book: Book) => void;
  onChaptersChange: (chapters: Chapter[]) => void;
}

export function BookItem({
  book,
  chapters,
  expanded,
  onToggle,
  onBookChange,
  onChaptersChange,
}: BookItemProps) {
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
        border: 1,
        borderColor: 'divider',
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
      <AccordionDetails sx={{ px: 1 }}>
        <Stack spacing={1.5}>
          <TextField
            label="Name"
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
            label="Wiki URL"
            size="small"
            fullWidth
            value={book.url ?? ''}
            onChange={(event) => handleFieldChange('url', event.target.value)}
            onBlur={handleBlur}
          />
          <ChapterList bookId={book.id} chapters={chapters} onChaptersChange={onChaptersChange} />
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
