import HelpOutlineIcon from '@mui/icons-material/HelpOutlined';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import {
  Alert,
  Box,
  Button,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputBase,
  InputLabel,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import {
  Controller,
  useFormState,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormSetValue,
} from 'react-hook-form';
import type { LatLng } from '../../db';
import { resolveTileUrlTemplate } from '../../lib/tileUrl';
import { detectMaxZoom } from '../../lib/zoomLimitDetection';
import { TileUrlHelpDialog } from './TileUrlHelpDialog';
import type { FormValues } from './formValues';

// How long to wait, after the tile URL field stops changing, before probing
// it for zoom limits — avoids firing off a probe per keystroke.
const ZOOM_DETECTION_DEBOUNCE_MS = 600;

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
  const minZoom = useWatch({ control, name: 'minZoom' });
  const hasValidTileUrl = !!resolveTileUrlTemplate(tileUrlValue);
  const hasMapMoved =
    mapPosition !== null &&
    (mapPosition.center.lat !== initialCenter.lat ||
      mapPosition.center.lng !== initialCenter.lng ||
      mapPosition.zoom !== initialZoom);

  const [isTileUrlHelpOpen, setIsTileUrlHelpOpen] = useState(false);
  const [isDetectingZoom, setIsDetectingZoom] = useState(false);

  // Only a user actually editing the URL (not a story load/reset, which
  // also changes tileUrlValue) should trigger a network probe.
  const { dirtyFields } = useFormState({ control, name: 'tileUrlValue' });
  const isTileUrlDirty = !!dirtyFields.tileUrlValue;

  useEffect(() => {
    const resolved = isTileUrlDirty ? resolveTileUrlTemplate(tileUrlValue) : null;
    if (!resolved) return;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      setIsDetectingZoom(true);
      detectMaxZoom(resolved, initialCenter, minZoom, undefined, controller.signal)
        .then((detected) => {
          if (detected !== null) {
            setValue('maxZoom', detected, { shouldDirty: true });
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsDetectingZoom(false);
        });
    }, ZOOM_DETECTION_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
    // Only re-probe when the URL itself changes — initialCenter/minZoom are
    // read at probe time, not re-triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tileUrlValue, isTileUrlDirty]);

  function handleCapturePosition() {
    const position = onCaptureMapPosition();
    if (!position) return;
    setValue('initialCenter', position.center, { shouldDirty: true });
    setValue('initialZoom', position.zoom, { shouldDirty: true });
  }

  const errorMessage =
    errors.name?.message ?? errors.tileUrlValue?.message ?? errors.maxZoom?.message;

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
          <Box sx={{ position: 'relative', border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <InputLabel
              shrink
              sx={{
                position: 'absolute',
                top: 0,
                left: 8,
                transform: 'translateY(-50%)',
                px: 0.5,
                fontSize: '0.75rem',
                backgroundColor: 'background.paper',
                width: 'fit-content',
              }}
            >
              Zoom Range
            </InputLabel>
            {isDetectingZoom && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  position: 'absolute',
                  top: 0,
                  right: 8,
                  transform: 'translateY(-50%)',
                  px: 0.5,
                  backgroundColor: 'background.paper',
                }}
              >
                Detecting…
              </Typography>
            )}
            <Stack direction="row" sx={{ alignItems: 'center', px: '14px', py: '4.5px' }}>
              <Controller
                name="minZoom"
                control={control}
                render={({ field }) => (
                  <InputBase
                    {...field}
                    type="number"
                    inputProps={{ 'aria-label': 'Minimum zoom' }}
                    onChange={(event) =>
                      field.onChange((event.target as HTMLInputElement).valueAsNumber)
                    }
                    sx={{ flex: 1, fontSize: '0.875rem' }}
                  />
                )}
              />
              <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
              <Controller
                name="maxZoom"
                control={control}
                rules={{
                  validate: (value, formValues) =>
                    value >= formValues.minZoom ||
                    'The zoom range maximum must not be less than the minimum.',
                }}
                render={({ field }) => (
                  <InputBase
                    {...field}
                    type="number"
                    inputProps={{ 'aria-label': 'Maximum zoom' }}
                    onChange={(event) =>
                      field.onChange((event.target as HTMLInputElement).valueAsNumber)
                    }
                    sx={{ flex: 1, fontSize: '0.875rem' }}
                  />
                )}
              />
            </Stack>
          </Box>

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
