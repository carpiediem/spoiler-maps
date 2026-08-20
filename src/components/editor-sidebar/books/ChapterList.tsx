import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { Button, IconButton, Stack, TextField, Typography } from '@mui/material';
import { createChapter, deleteChapter, updateChapter, type Chapter } from '../../../db';
import { sortOrderAfter } from '../../../db/ordering';

interface ChapterListProps {
  bookId: number;
  chapters: Chapter[];
  onChaptersChange: (chapters: Chapter[]) => void;
}

export function ChapterList({ bookId, chapters, onChaptersChange }: ChapterListProps) {
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
      <Typography variant="caption" color="text.secondary">
        Chapters
      </Typography>

      {chapters.map((chapter) => (
        <Stack
          key={chapter.id}
          spacing={0.5}
          sx={{ pb: 1, borderBottom: 1, borderColor: 'divider' }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Chapter name"
              value={chapter.name}
              onChange={(event) => handleFieldChange(chapter.id, 'name', event.target.value)}
              onBlur={() => handleBlur(chapter)}
            />
            <IconButton
              size="small"
              aria-label="Delete chapter"
              onClick={() => handleDelete(chapter.id)}
            >
              <DeleteOutlineOutlinedIcon fontSize="small" />
            </IconButton>
          </Stack>
          <TextField
            size="small"
            fullWidth
            placeholder="Chapter Wiki URL"
            value={chapter.url ?? ''}
            onChange={(event) => handleFieldChange(chapter.id, 'url', event.target.value)}
            onBlur={() => handleBlur(chapter)}
          />
        </Stack>
      ))}

      <Button size="small" startIcon={<AddIcon fontSize="small" />} onClick={handleAddChapter}>
        Add Chapter
      </Button>
    </Stack>
  );
}
