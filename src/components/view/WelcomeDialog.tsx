import { Button, Dialog, DialogActions, DialogContentText, DialogTitle } from '@mui/material';

interface WelcomeDialogProps {
  open: boolean;
  onClose: () => void;
}

/** A one-time explainer shown when a viewer first opens a shared map, describing how spoiler protection works here. */
export function WelcomeDialog({ open, onClose }: WelcomeDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Welcome!</DialogTitle>
      <DialogContentText component="div" sx={{ px: 3, pb: 1 }}>
        <p>
          Someone shared this map with you — it shows where characters from a book or show have
          been, without spoiling where they go next.
        </p>
        <p>
          Use the <strong>&ldquo;Show spoilers through&rdquo;</strong> slider in the upper left to
          set how far you&rsquo;ve read or watched. Positions past that point stay hidden.
        </p>
        <p>
          Check a character in the <strong>Character Paths</strong> list on the right to show their
          positions on the map, and use the toggle there to show either just their current location
          or their full path so far.
        </p>
      </DialogContentText>
      <DialogActions>
        <Button onClick={onClose} autoFocus>
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  );
}
