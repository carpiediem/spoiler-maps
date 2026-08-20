import CloseIcon from '@mui/icons-material/Close';
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import type { Chapter } from '../../../db';
import { ChapterList } from './ChapterList';

interface ChapterEditorDialogProps {
  open: boolean;
  onClose: () => void;
  bookName: string;
  bookId: number;
  chapters: Chapter[];
  onChaptersChange: (chapters: Chapter[]) => void;
}

export function ChapterEditorDialog({
  open,
  onClose,
  bookName,
  bookId,
  chapters,
  onChaptersChange,
}: ChapterEditorDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        {bookName || 'Untitled Book'} — Chapters
        <IconButton
          aria-label="Close"
          onClick={onClose}
          sx={{ position: 'absolute', top: 8, right: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <ChapterList bookId={bookId} chapters={chapters} onChaptersChange={onChaptersChange} />
      </DialogContent>
    </Dialog>
  );
}
