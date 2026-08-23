import { Button, Dialog, DialogActions, DialogContentText, DialogTitle } from '@mui/material';

interface DescriptionDialogProps {
  open: boolean;
  onClose: () => void;
  storyName: string;
  description: string;
}

/** Shown when a viewer first opens a shared map whose story has a description, in place of WelcomeDialog. */
export function DescriptionDialog({
  open,
  onClose,
  storyName,
  description,
}: DescriptionDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{storyName}</DialogTitle>
      <DialogContentText sx={{ px: 3, pb: 1, whiteSpace: 'pre-wrap' }}>
        {description}
      </DialogContentText>
      <DialogActions>
        <Button onClick={onClose} autoFocus>
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  );
}
