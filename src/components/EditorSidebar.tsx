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
import { useEffect, useRef, useState, type FormEvent } from 'react';
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

export function EditorSidebar({
  stories,
  selectedStoryId,
  onSelectStory,
  onSave,
  onCaptureMapPosition,
}: EditorSidebarProps) {
  const [name, setName] = useState('');
  const [tileUrlValue, setTileUrlValue] = useState('');
  const [initialCenter, setInitialCenter] = useState<LatLng>(DEFAULT_CENTER);
  const [initialZoom, setInitialZoom] = useState(DEFAULT_ZOOM);
  const [error, setError] = useState<string | null>(null);

  // Tracks the selectedStoryId last synced to the form, so the list simply
  // reloading (e.g. the initial fetch resolving) doesn't reset the form out
  // from under whatever the user is typing — only an actual change of
  // *which* story is selected does.
  const syncedStoryIdRef = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    if (syncedStoryIdRef.current === selectedStoryId) return;
    syncedStoryIdRef.current = selectedStoryId;

    const story = stories.find((candidate) => candidate.id === selectedStoryId) ?? null;
    setName(story?.name ?? '');
    setTileUrlValue(story?.tileUrlTemplate ?? '');
    setInitialCenter(story?.initialCenter ?? DEFAULT_CENTER);
    setInitialZoom(story?.initialZoom ?? DEFAULT_ZOOM);
    setError(null);
  }, [selectedStoryId, stories]);

  function handleCapturePosition() {
    const position = onCaptureMapPosition();
    if (!position) return;
    setInitialCenter(position.center);
    setInitialZoom(position.zoom);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Enter a name for this map.');
      return;
    }

    const resolved = resolveTileUrlTemplate(tileUrlValue);
    if (!resolved) {
      setError(
        'Enter a URL template with {x}, {y}, {z} (or {q}) placeholders, or a real tile URL to extract a {q} quadkey template from.',
      );
      return;
    }

    setError(null);
    onSave({
      name: trimmedName,
      tileUrlTemplate: resolved.template,
      initialCenter,
      initialZoom,
    });
  }

  return (
    <Paper
      component="aside"
      elevation={4}
      sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1000, width: 280, p: 2 }}
    >
      <StorySelector stories={stories} selectedStoryId={selectedStoryId} onSelect={onSelectStory} />

      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
        <Stack spacing={2}>
          <TextField
            id="map-name-input"
            label="Map Name"
            variant="outlined"
            size="small"
            fullWidth
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="My Story Map"
          />

          <TextField
            id="tile-url-input"
            label="Tile URL template"
            variant="outlined"
            size="small"
            fullWidth
            value={tileUrlValue}
            onChange={(event) => setTileUrlValue(event.target.value)}
            placeholder="https://tile.example.com/{z}/{x}/{y}.png"
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

          {error && <Alert severity="error">{error}</Alert>}

          <Button type="submit" variant="contained">
            Save
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}
