import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useState, type SyntheticEvent } from 'react';
import { updateMarkerSet, type Marker, type MarkerSet } from '../../../db';
import { DeleteConfirmDialog } from '../DeleteConfirmDialog';
import { SIDEBAR_SECTION_HEADER_HEIGHT, SIDEBAR_SECTION_HEADER_Z_INDEX } from '../SidebarSection';
import { MarkerItem } from './MarkerItem';

interface MarkerSetItemProps {
  markerSet: MarkerSet;
  markers: Marker[];
  expanded: boolean;
  onToggle: (event: SyntheticEvent, isExpanded: boolean) => void;
  /** Whether this set's markers should show on the map even while collapsed. */
  visible: boolean;
  onToggleVisible: () => void;
  onMarkerSetChange: (markerSet: MarkerSet) => void;
  onDelete: () => void;
  /** The id of the marker currently expanded within this set, if any. */
  expandedMarkerId: number | null;
  onMarkerToggle: (
    markerId: number,
  ) => (event: SyntheticEvent, isExpanded: boolean) => void;
  onMarkerChange: (marker: Marker) => void;
  onAddMarker: () => void;
  onDeleteMarker: (markerId: number) => void;
}

export function MarkerSetItem({
  markerSet,
  markers,
  expanded,
  onToggle,
  visible,
  onToggleVisible,
  onMarkerSetChange,
  onDelete,
  expandedMarkerId,
  onMarkerToggle,
  onMarkerChange,
  onAddMarker,
  onDeleteMarker,
}: MarkerSetItemProps) {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  function handleNameChange(value: string) {
    onMarkerSetChange({ ...markerSet, name: value });
  }

  async function handleNameBlur() {
    await updateMarkerSet(markerSet.id, {
      storyId: markerSet.storyId,
      name: markerSet.name,
      noIcons: markerSet.noIcons,
    });
  }

  async function handleNoIconsChange(checked: boolean) {
    const updated = { ...markerSet, noIcons: checked };
    onMarkerSetChange(updated);
    await updateMarkerSet(markerSet.id, {
      storyId: updated.storyId,
      name: updated.name,
      noIcons: updated.noIcons,
    });
  }

  return (
    <Accordion
      expanded={expanded}
      onChange={onToggle}
      disableGutters
      elevation={0}
      square
      sx={{ boxShadow: 'none', '&::before': { display: 'none' }, borderRadius: 1 }}
    >
      <Box
        sx={{
          position: 'sticky',
          top: SIDEBAR_SECTION_HEADER_HEIGHT,
          zIndex: SIDEBAR_SECTION_HEADER_Z_INDEX - 1,
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            backgroundColor: 'background.paper',
            backgroundImage: (theme) =>
              `linear-gradient(${alpha(theme.palette.primary.main, 0.06)}, ${alpha(theme.palette.primary.main, 0.06)})`,
            px: 1,
            minHeight: 40,
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', flexGrow: 1, minWidth: 0, pr: 6 }}
          >
            <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
              {markerSet.name || 'Unnamed Collection'}
            </Typography>
          </Stack>
        </AccordionSummary>
        <Tooltip title={visible ? 'Hide on map' : 'Show on map'} arrow>
          <IconButton
            size="small"
            aria-label={visible ? 'Hide on map' : 'Show on map'}
            onClick={onToggleVisible}
            sx={{ position: 'absolute', right: 36, top: '50%', transform: 'translateY(-50%)' }}
          >
            {visible ? (
              <VisibilityOutlinedIcon fontSize="small" />
            ) : (
              <VisibilityOffOutlinedIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      </Box>
      <AccordionDetails
        sx={{ px: 1, backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.03) }}
      >
        <Stack spacing={1.5}>
          <TextField
            label="Name"
            size="small"
            fullWidth
            value={markerSet.name}
            onChange={(event) => handleNameChange(event.target.value)}
            onBlur={handleNameBlur}
          />
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={markerSet.noIcons}
                  onChange={(event) => handleNoIconsChange(event.target.checked)}
                />
              }
              label="No icons"
            />
            <Tooltip
              title="Check this if the map tiles already show an icon for each marker in this collection, so the map doesn't draw a duplicate."
              arrow
            >
              <InfoOutlinedIcon fontSize="small" color="action" />
            </Tooltip>
          </Stack>

          <Stack spacing={1}>
            {markers.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No markers yet.
              </Typography>
            )}
            {markers.map((marker) => (
              <MarkerItem
                key={marker.id}
                marker={marker}
                expanded={expandedMarkerId === marker.id}
                onToggle={onMarkerToggle(marker.id)}
                onMarkerChange={onMarkerChange}
                onDelete={() => onDeleteMarker(marker.id)}
              />
            ))}
          </Stack>

          <Button size="small" startIcon={<AddIcon fontSize="small" />} onClick={onAddMarker}>
            Add Marker
          </Button>
          <Button size="small" color="error" onClick={() => setIsDeleteConfirmOpen(true)} fullWidth>
            Delete Collection
          </Button>
        </Stack>
      </AccordionDetails>

      <DeleteConfirmDialog
        open={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => {
          setIsDeleteConfirmOpen(false);
          onDelete();
        }}
        title={`Delete “${markerSet.name || 'Unnamed Collection'}”?`}
        description={
          markers.length === 0
            ? 'This will permanently delete the collection. This can’t be undone.'
            : `This will permanently delete the collection and all ${markers.length} of its ${markers.length === 1 ? 'marker' : 'markers'}. This can’t be undone.`
        }
      />
    </Accordion>
  );
}
