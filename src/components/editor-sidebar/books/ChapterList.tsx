import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useRef, type KeyboardEvent } from 'react';
import { createChapter, deleteChapter, updateChapter, type Chapter } from '../../../db';
import { sortOrderAfter } from '../../../db/ordering';

interface ChapterListProps {
  bookId: number;
  chapters: Chapter[];
  onChaptersChange: (chapters: Chapter[]) => void;
}

export function ChapterList({ bookId, chapters, onChaptersChange }: ChapterListProps) {
  const nameInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const urlInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  function handleVerticalNav(
    event: KeyboardEvent<HTMLDivElement>,
    index: number,
    column: 'name' | 'url',
  ) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    const targetIndex = event.key === 'ArrowUp' ? index - 1 : index + 1;
    const targetChapter = chapters[targetIndex];
    if (!targetChapter) return;

    event.preventDefault();
    const refs = column === 'name' ? nameInputRefs : urlInputRefs;
    refs.current[targetChapter.id]?.focus();
  }

  function handleFieldChange(chapterId: number, field: 'name' | 'url', value: string) {
    onChaptersChange(
      chapters.map((chapter) =>
        chapter.id === chapterId
          ? { ...chapter, [field]: field === 'name' ? value : value || null }
          : chapter,
      ),
    );
  }

  async function handleBlur(chapter: Chapter) {
    await updateChapter(chapter.id, {
      bookId: chapter.bookId,
      name: chapter.name,
      url: chapter.url,
      sortOrder: chapter.sortOrder,
    });
  }

  async function handleDelete(chapterId: number) {
    await deleteChapter(chapterId);
    onChaptersChange(chapters.filter((chapter) => chapter.id !== chapterId));
  }

  async function handleAddChapter() {
    const sortOrder = sortOrderAfter(chapters.map((chapter) => chapter.sortOrder));
    const chapter = await createChapter({ bookId, name: '', url: null, sortOrder });
    onChaptersChange([...chapters, chapter]);
  }

  return (
    <Stack spacing={1}>
      {chapters.length > 0 && (
        <Stack direction="row" spacing={1}>
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
            Title
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ flex: 2 }}>
            Wiki URL
          </Typography>
          <Box sx={{ width: 34 }} />
        </Stack>
      )}

      {chapters.map((chapter, index) => (
        <Stack key={chapter.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Chapter name"
            value={chapter.name}
            onChange={(event) => handleFieldChange(chapter.id, 'name', event.target.value)}
            onBlur={() => handleBlur(chapter)}
            onKeyDown={(event) => handleVerticalNav(event, index, 'name')}
            inputRef={(el: HTMLInputElement | null) => {
              nameInputRefs.current[chapter.id] = el;
            }}
            sx={{ flex: 1 }}
          />
          <TextField
            size="small"
            placeholder="Chapter Wiki URL"
            value={chapter.url ?? ''}
            onChange={(event) => handleFieldChange(chapter.id, 'url', event.target.value)}
            onBlur={() => handleBlur(chapter)}
            onKeyDown={(event) => handleVerticalNav(event, index, 'url')}
            inputRef={(el: HTMLInputElement | null) => {
              urlInputRefs.current[chapter.id] = el;
            }}
            sx={{ flex: 2, '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
            slotProps={{
              input: {
                endAdornment: chapter.url && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      aria-label="Open chapter Wiki URL"
                      href={chapter.url}
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
          <IconButton
            size="small"
            aria-label="Delete chapter"
            onClick={() => handleDelete(chapter.id)}
          >
            <DeleteOutlineOutlinedIcon fontSize="small" />
          </IconButton>
        </Stack>
      ))}

      <Button size="small" startIcon={<AddIcon fontSize="small" />} onClick={handleAddChapter}>
        Add Chapter
      </Button>
    </Stack>
  );
}
