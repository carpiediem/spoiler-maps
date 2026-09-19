import EditIcon from '@mui/icons-material/Edit';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { lazy, Suspense, useState } from 'react';
import { StaticField } from './StaticField';

// The rich-text editor (Tiptap + ProseMirror) is a large dependency that's
// only needed once someone actually opens the dialog, so it loads on demand.
const DescriptionEditorDialog = lazy(() =>
  import('./DescriptionEditorDialog').then((m) => ({ default: m.DescriptionEditorDialog })),
);

interface DescriptionPanelProps {
  description: string | null;
  onSave: (description: string) => Promise<void>;
}

/** Read-only preview of a story's description, with an inline edit button that opens a rich-text modal. */
export function DescriptionPanel({ description, onSave }: DescriptionPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  // Stays true after the first open so closing still plays the dialog's exit transition.
  const [hasOpened, setHasOpened] = useState(false);

  return (
    <StaticField label="Description" htmlFor="description-value">
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          <Typography
            id="description-value"
            variant="body2"
            color={description ? 'text.primary' : 'text.secondary'}
            sx={{ ml: '14px' }}
          >
            {description || 'No description yet.'}
          </Typography>
        </Box>
        <Tooltip title="Edit description" arrow>
          <IconButton
            size="small"
            aria-label="Edit description"
            onClick={() => {
              setHasOpened(true);
              setIsEditing(true);
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      {hasOpened && (
        <Suspense fallback={null}>
          <DescriptionEditorDialog
            open={isEditing}
            onClose={() => setIsEditing(false)}
            description={description}
            onSave={onSave}
          />
        </Suspense>
      )}
    </StaticField>
  );
}
