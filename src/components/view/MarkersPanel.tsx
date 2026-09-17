import { Checkbox, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import type { StoryDocumentMarkerSet } from '../../lib/storyDocument';

interface MarkersPanelProps {
  markerSets: StoryDocumentMarkerSet[];
  /** Indices (into markerSets) of collections currently hidden; a collection not listed here is visible. */
  hiddenIndices: Set<number>;
  onHiddenIndicesChange: (next: Set<number>) => void;
}

/** A marker set paired with its own (real) index into the full markerSets array. */
interface IndexedMarkerSet {
  markerSet: StoryDocumentMarkerSet;
  index: number;
}

/**
 * The view screen's Markers section: one checkbox per marker collection —
 * unlike CharacterPathsPanel, there's no per-marker granularity, since a
 * collection is meant to be shown or hidden as a whole (e.g. all "Cities"
 * markers together). A noIcons collection is left out entirely: its markers
 * always render (as invisible-but-clickable hotspots, since the tiles
 * already show an icon for them), so there's nothing here for the toggle to
 * control.
 */
export function MarkersPanel({
  markerSets,
  hiddenIndices,
  onHiddenIndicesChange,
}: MarkersPanelProps) {
  const listable: IndexedMarkerSet[] = markerSets
    .map((markerSet, index) => ({ markerSet, index }))
    .filter(({ markerSet }) => !markerSet.noIcons);

  const allChecked =
    listable.length > 0 && listable.every(({ index }) => !hiddenIndices.has(index));
  const someChecked = listable.some(({ index }) => !hiddenIndices.has(index)) && !allChecked;

  function handleToggleAll() {
    if (allChecked) {
      const next = new Set(hiddenIndices);
      listable.forEach(({ index }) => next.add(index));
      onHiddenIndicesChange(next);
    } else {
      const next = new Set(hiddenIndices);
      listable.forEach(({ index }) => next.delete(index));
      onHiddenIndicesChange(next);
    }
  }

  function handleToggleOne(index: number) {
    const next = new Set(hiddenIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    onHiddenIndicesChange(next);
  }

  return (
    <>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
        <Checkbox
          checked={allChecked}
          indeterminate={someChecked}
          onChange={handleToggleAll}
          disabled={listable.length === 0}
          slotProps={{ input: { 'aria-label': 'Toggle all marker collections' } }}
          size="small"
        />
        {/* One level under the page's own (visually hidden) <h1>. */}
        <Typography variant="subtitle1" component="h2" sx={{ flex: 1, fontWeight: 600 }}>
          Markers
        </Typography>
      </Stack>

      {listable.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          This map has no markers yet.
        </Typography>
      ) : (
        <List dense disablePadding>
          {listable.map(({ markerSet, index }) => {
            const name = markerSet.name || 'Unnamed Collection';
            return (
              <ListItem key={index} disablePadding>
                <Checkbox
                  checked={!hiddenIndices.has(index)}
                  onChange={() => handleToggleOne(index)}
                  size="small"
                  slotProps={{ input: { 'aria-label': name } }}
                />
                <ListItemText primary={name} slotProps={{ primary: { noWrap: true } }} />
              </ListItem>
            );
          })}
        </List>
      )}
    </>
  );
}
