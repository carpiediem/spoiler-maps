import EditIcon from '@mui/icons-material/Edit';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';
import { DescriptionEditorDialog } from './DescriptionEditorDialog';

interface DescriptionPanelProps {
  description: string | null;
  onSave: (description: string) => Promise<void>;
}

/** Read-only preview of a story's description, with an inline edit button that opens a rich-text modal. */
export function DescriptionPanel({ description, onSave }: DescriptionPanelProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', mt: 2 }}>
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
        <Typography variant="body2" color={description ? 'text.primary' : 'text.secondary'}>
          {description || 'No description yet.'}
        </Typography>
      </Box>
      <Tooltip title="Edit description" arrow>
        <IconButton size="small" aria-label="Edit description" onClick={() => setIsEditing(true)}>
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <DescriptionEditorDialog
        open={isEditing}
        onClose={() => setIsEditing(false)}
        description={description}
        onSave={onSave}
      />
    </Stack>
  );
}
