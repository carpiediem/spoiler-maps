import { Button, Dialog, DialogActions, DialogContentText, DialogTitle } from '@mui/material';
import { useMemo } from 'react';
import { renderMarkdownToHtml } from '../../lib/renderMarkdown';

interface DescriptionDialogProps {
  open: boolean;
  onClose: () => void;
  storyName: string;
  /** Markdown, as stored in the db/YAML — rendered to HTML here. */
  description: string;
}

/** Shown when a viewer first opens a shared map whose story has a description, in place of WelcomeDialog. */
export function DescriptionDialog({
  open,
  onClose,
  storyName,
  description,
}: DescriptionDialogProps) {
  const html = useMemo(() => renderMarkdownToHtml(description), [description]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{storyName}</DialogTitle>
      <DialogContentText
        component="div"
        sx={{
          px: 3,
          pb: 1,
          maxHeight: '60vh',
          overflowY: 'auto',
          '& > div > :first-child': { mt: 0 },
          '& > div > :last-child': { mb: 0 },
        }}
      >
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </DialogContentText>
      <DialogActions>
        <Button onClick={onClose} autoFocus>
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  );
}
