import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import {
  Alert,
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useRef } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { LatLng, Story } from '../db';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../lib/mapDefaults';
import { resolveTileUrlTemplate } from '../lib/tileUrl';
import { StorySelector } from './StorySelector';

interface EditorSidebarProps {
  stories: Story[];
  selectedStoryId: number | null;
  onSelectStory: (storyId: number | null) => void;
  onSave: (input: {
    name: string;
    tileUrlTemplate: string;
    initialCenter: LatLng;
    initialZoom: number;
  }) => void;
  onCaptureMapPosition: () => { center: LatLng; zoom: number } | null;
}

interface FormValues {
  name: string;
  tileUrlValue: string;
  initialCenter: LatLng;
  initialZoom: number;
}

function storyToFormValues(story: Story | null): FormValues {
  return {
    name: story?.name ?? '',
    tileUrlValue: story?.tileUrlTemplate ?? '',
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
}: EditorSidebarProps) {
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: storyToFormValues(null) });

  const initialCenter = useWatch({ control, name: 'initialCenter' });
  const initialZoom = useWatch({ control, name: 'initialZoom' });

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
    setValue('initialCenter', position.center);
    setValue('initialZoom', position.zoom);
  }

  function onValid(data: FormValues) {
    const resolved = resolveTileUrlTemplate(data.tileUrlValue)!;
    onSave({
      name: data.name.trim(),
      tileUrlTemplate: resolved.template,
      initialCenter: data.initialCenter,
      initialZoom: data.initialZoom,
    });
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
                label="Tile URL template"
                variant="outlined"
                size="small"
                fullWidth
                placeholder="https://tile.example.com/{z}/{x}/{y}.png"
              />
            )}
          />

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
              <Tooltip title="Use current map position">
                <IconButton
                  size="small"
                  aria-label="Use current map position"
                  onClick={handleCapturePosition}
                >
                  <PushPinOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </FormControl>

          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

          <Button type="submit" variant="contained">
            Save
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}
