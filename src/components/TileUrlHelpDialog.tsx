import CloseIcon from '@mui/icons-material/Close';
import { Dialog, DialogContent, DialogContentText, DialogTitle, IconButton } from '@mui/material';

interface TileUrlHelpDialogProps {
  open: boolean;
  onClose: () => void;
}

export function TileUrlHelpDialog({ open, onClose }: TileUrlHelpDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        Tile URL template
        <IconButton
          aria-label="Close"
          onClick={onClose}
          sx={{ position: 'absolute', top: 8, right: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <DialogContentText component="div" sx={{ overflowWrap: 'anywhere' }}>
          <p>
            Enter the URL your map tiles are served from, with placeholders for the parts that
            change per tile:
          </p>
          <ul>
            <li>
              <code>{'{x}'}</code>, <code>{'{y}'}</code>, <code>{'{z}'}</code> — the standard scheme
              most tile servers use (column, row, zoom level). Example:{' '}
              <code>
                http://services.arcgisonline.com/arcgis/rest/services/World_Physical_Map/MapServer/tile/
                {'{z}'}/{'{y}'}/{'{x}'}
              </code>
            </li>
            <li>
              <code>{'{q}'}</code> — a single placeholder for a "keyhole" quadkey string, used by
              some custom tile sets. Example:{' '}
              <code>https://carpiediem.github.io/game-of-thrones-map/fsm/{'{q}'}.jpg</code>
            </li>
          </ul>
          <p>
            If you paste a real, working tile URL instead of a template — e.g. one copied while a
            map is open — a <code>{'{q}'}</code> template will be extracted from it automatically
            when possible.
          </p>
        </DialogContentText>
      </DialogContent>
    </Dialog>
  );
}
