import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { SyntheticEvent } from 'react';
import { updateMarker, type Marker } from '../../../db';

interface MarkerItemProps {
  marker: Marker;
  expanded: boolean;
  onToggle: (event: SyntheticEvent, isExpanded: boolean) => void;
  onMarkerChange: (marker: Marker) => void;
  onDelete: () => void;
}

export function MarkerItem({ marker, expanded, onToggle, onMarkerChange, onDelete }: MarkerItemProps) {
  function handleFieldChange(field: 'label' | 'icon' | 'url', value: string) {
    onMarkerChange({ ...marker, [field]: field === 'label' ? value : value || null });
  }

  async function handleBlur() {
    await updateMarker(marker.id, {
      markerSetId: marker.markerSetId,
      label: marker.label,
      icon: marker.icon,
      url: marker.url,
      color: marker.color,
      position: marker.position,
      polygon: marker.polygon,
      chapterRange: marker.chapterRange,
      episodeRange: marker.episodeRange,
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
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.05),
          px: 1,
          minHeight: 36,
        }}
      >
        <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
          {marker.label || 'Unnamed Marker'}
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 1 }}>
        <Stack spacing={1.5}>
          <TextField
            label="Name"
            size="small"
            fullWidth
            value={marker.label}
            onChange={(event) => handleFieldChange('label', event.target.value)}
            onBlur={handleBlur}
          />
          <TextField
            label="Icon URL"
            size="small"
            fullWidth
            value={marker.icon ?? ''}
            onChange={(event) => handleFieldChange('icon', event.target.value)}
            onBlur={handleBlur}
            sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
            slotProps={{
              input: {
                endAdornment: marker.icon && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      aria-label="Open Icon URL"
                      href={marker.icon}
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
          <TextField
            label="Wiki URL"
            size="small"
            fullWidth
            value={marker.url ?? ''}
            onChange={(event) => handleFieldChange('url', event.target.value)}
            onBlur={handleBlur}
            sx={{ '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
            slotProps={{
              input: {
                endAdornment: marker.url && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      aria-label="Open Wiki URL"
                      href={marker.url}
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
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary">
              {marker.position.lat.toFixed(4)}, {marker.position.lng.toFixed(4)} — drag the pin on the
              map to move it.
            </Typography>
            <IconButton size="small" aria-label="Delete marker" onClick={onDelete}>
              <DeleteOutlineOutlinedIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
