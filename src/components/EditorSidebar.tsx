import HelpOutlineIcon from '@mui/icons-material/HelpOutlined';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import {
  Alert,
  Box,
  Button,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { LatLng, Story } from '../db';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../lib/mapDefaults';
import { resolveTileUrlTemplate } from '../lib/tileUrl';
import { StorySelector } from './StorySelector';
import { TileUrlHelpDialog } from './TileUrlHelpDialog';

interface EditorSidebarProps {
  stories: Story[];
  selectedStoryId: number | null;
  onSelectStory: (storyId: number | null) => void;
  onSave: (input: {
    name: string;
    tileUrlTemplate: string;
    tileLayerAuthor: string | null;
    tileLayerAttributionUrl: string | null;
    initialCenter: LatLng;
    initialZoom: number;
  }) => void;
  onCaptureMapPosition: () => { center: LatLng; zoom: number } | null;
  /** The map's current live position, to tell whether it has moved from what's stored in the form. */
  mapPosition: { center: LatLng; zoom: number } | null;
}

interface FormValues {
  name: string;
  tileUrlValue: string;
  tileLayerAuthor: string;
  tileLayerAttributionUrl: string;
  initialCenter: LatLng;
  initialZoom: number;
}

function storyToFormValues(story: Story | null): FormValues {
  return {
    name: story?.name ?? '',
    tileUrlValue: story?.tileUrlTemplate ?? '',
    tileLayerAuthor: story?.tileLayerAuthor ?? '',
    tileLayerAttributionUrl: story?.tileLayerAttributionUrl ?? '',
    initialCenter: story?.initialCenter ?? DEFAULT_CENTER,
    initialZoom: story?.initialZoom ?? DEFAULT_ZOOM,
  };
}

export function EditorSidebar({
  stories,
  selectedStoryId,
  onSelectStory,
  onSave,
  onCaptureMapPosition,
  mapPosition,
}: EditorSidebarProps) {
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ defaultValues: storyToFormValues(null) });

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

  // Tracks the selectedStoryId last synced to the form, so the list simply
  // reloading (e.g. the initial fetch resolving) doesn't reset the form out
  // from under whatever the user is typing — only an actual change of
  // *which* story is selected does.
  const syncedStoryIdRef = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    if (syncedStoryIdRef.current === selectedStoryId) return;
    syncedStoryIdRef.current = selectedStoryId;

    const story = stories.find((candidate) => candidate.id === selectedStoryId) ?? null;
    reset(storyToFormValues(story));
  }, [selectedStoryId, stories, reset]);

  function handleCapturePosition() {
    const position = onCaptureMapPosition();
    if (!position) return;
    setValue('initialCenter', position.center, { shouldDirty: true });
    setValue('initialZoom', position.zoom, { shouldDirty: true });
  }

  function onValid(data: FormValues) {
    const resolved = resolveTileUrlTemplate(data.tileUrlValue)!;
    onSave({
      name: data.name.trim(),
      tileUrlTemplate: resolved.template,
      tileLayerAuthor: data.tileLayerAuthor.trim() || null,
      tileLayerAttributionUrl: data.tileLayerAttributionUrl.trim() || null,
      initialCenter: data.initialCenter,
      initialZoom: data.initialZoom,
    });
    // Marks these values (with tileUrlValue normalized to the resolved
    // template, in case a real tile URL was extrapolated) as the new clean
    // baseline, so Save — disabled while the form isn't dirty — goes back
    // to disabled until the next actual change, instead of staying enabled
    // right after saving.
    reset({ ...data, tileUrlValue: resolved.template });
  }

  const errorMessage = errors.name?.message ?? errors.tileUrlValue?.message;

  return (
    <Paper
      component="aside"
      elevation={4}
      sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1000, width: 280, p: 2 }}
    >
      <StorySelector stories={stories} selectedStoryId={selectedStoryId} onSelect={onSelectStory} />

      <Box component="form" onSubmit={handleSubmit(onValid)} sx={{ mt: 2 }}>
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

          <Button type="submit" variant="contained" disabled={!isDirty}>
            Save
          </Button>
        </Stack>
      </Box>

      <TileUrlHelpDialog open={isTileUrlHelpOpen} onClose={() => setIsTileUrlHelpOpen(false)} />
    </Paper>
  );
}
