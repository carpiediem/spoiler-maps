import HelpOutlineIcon from '@mui/icons-material/HelpOutlined';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import {
  Alert,
  Button,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import {
  Controller,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormSetValue,
} from 'react-hook-form';
import type { LatLng } from '../../db';
import { resolveTileUrlTemplate } from '../../lib/tileUrl';
import { TileUrlHelpDialog } from './TileUrlHelpDialog';
import type { FormValues } from './formValues';

interface MapSectionProps {
  control: Control<FormValues>;
  setValue: UseFormSetValue<FormValues>;
  errors: FieldErrors<FormValues>;
  isDirty: boolean;
  mapPosition: { center: LatLng; zoom: number } | null;
  onCaptureMapPosition: () => { center: LatLng; zoom: number } | null;
}

export function MapSection({
  control,
  setValue,
  errors,
  isDirty,
  mapPosition,
  onCaptureMapPosition,
}: MapSectionProps) {
  const initialCenter = useWatch({ control, name: 'initialCenter' });
  const initialZoom = useWatch({ control, name: 'initialZoom' });
  const tileUrlValue = useWatch({ control, name: 'tileUrlValue' });
  const hasValidTileUrl = !!resolveTileUrlTemplate(tileUrlValue);
  const hasMapMoved =
    mapPosition !== null &&
    (mapPosition.center.lat !== initialCenter.lat ||
      mapPosition.center.lng !== initialCenter.lng ||
      mapPosition.zoom !== initialZoom);

  const [isTileUrlHelpOpen, setIsTileUrlHelpOpen] = useState(false);

  function handleCapturePosition() {
    const position = onCaptureMapPosition();
    if (!position) return;
    setValue('initialCenter', position.center, { shouldDirty: true });
    setValue('initialZoom', position.zoom, { shouldDirty: true });
  }

  const errorMessage = errors.name?.message ?? errors.tileUrlValue?.message;

  return (
    <Stack spacing={2}>
      <Controller
        name="name"
        control={control}
        rules={{
          validate: (value) => value.trim().length > 0 || 'Enter a name for this map.',
        }}
        render={({ field }) => (
          <TextField
            {...field}
            id="map-name-input"
            label="Map Name"
            variant="outlined"
            size="small"
            fullWidth
            placeholder="My Story Map"
          />
        )}
      />

      <Controller
        name="tileUrlValue"
        control={control}
        rules={{
          validate: (value) =>
            !!resolveTileUrlTemplate(value) ||
            'Enter a URL template with {x}, {y}, {z} (or {q}) placeholders, or a real tile URL to extract a {q} quadkey template from.',
        }}
        render={({ field }) => (
          <TextField
            {...field}
            id="tile-url-input"
            label="Tile Layer URL Template"
            variant="outlined"
            size="small"
            fullWidth
            placeholder="https://tile.example.com/{z}/{x}/{y}.png"
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="How this field works" arrow>
                      <IconButton
                        size="small"
                        aria-label="Explain how to fill in this field"
                        onClick={() => setIsTileUrlHelpOpen(true)}
                        edge="end"
                      >
                        <HelpOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              },
            }}
          />
        )}
      />

      {hasValidTileUrl && (
        <Stack spacing={2} sx={{ pl: 2 }}>
          <Controller
            name="tileLayerAuthor"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                id="tile-layer-author-input"
                label="Tile Layer Author"
                variant="outlined"
                size="small"
                fullWidth
                placeholder="Jane Cartographer"
              />
            )}
          />

          <Controller
            name="tileLayerAttributionUrl"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                id="tile-layer-attribution-url-input"
                label="Tile Layer Attribution URL"
                variant="outlined"
                size="small"
                fullWidth
                placeholder="https://example.com"
              />
            )}
          />
        </Stack>
      )}

      <FormControl fullWidth variant="outlined" size="small">
        <InputLabel
          shrink
          htmlFor="initial-position-value"
          sx={{ position: 'static', transform: 'none', ml: '14px', fontSize: '0.75rem' }}
        >
          Initial Position
        </InputLabel>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography id="initial-position-value" variant="body2" sx={{ ml: '14px' }}>
            {initialCenter.lat.toFixed(4)}, {initialCenter.lng.toFixed(4)} · Zoom {initialZoom}
          </Typography>
          <Tooltip title="Use current map position" arrow>
            <IconButton
              size="small"
              aria-label="Use current map position"
              onClick={handleCapturePosition}
              sx={{ visibility: hasMapMoved ? 'visible' : 'hidden' }}
            >
              <PushPinOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </FormControl>

      {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

      <Button type="submit" variant="contained" disabled={!isDirty} fullWidth>
        Save
      </Button>

      <TileUrlHelpDialog open={isTileUrlHelpOpen} onClose={() => setIsTileUrlHelpOpen(false)} />
    </Stack>
  );
}
