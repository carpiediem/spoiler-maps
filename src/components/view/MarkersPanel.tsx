import { Checkbox, List, ListItem, ListItemText, Typography } from '@mui/material';
import type { StoryDocumentMarkerSet } from '../../lib/storyDocument';

interface MarkersPanelProps {
  markerSets: StoryDocumentMarkerSet[];
  /** Indices (into markerSets) of collections currently hidden; a collection not listed here is visible. */
  hiddenIndices: Set<number>;
  onHiddenIndicesChange: (next: Set<number>) => void;
}

/**
 * The view screen's Markers section: one checkbox per marker collection —
 * unlike CharacterPathsPanel, there's no per-marker granularity, since a
 * collection is meant to be shown or hidden as a whole (e.g. all "Cities"
 * markers together).
 */
export function MarkersPanel({
  markerSets,
  hiddenIndices,
  onHiddenIndicesChange,
}: MarkersPanelProps) {
  function handleToggle(index: number) {
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
      {/* One level under the page's own (visually hidden) <h1>. */}
      <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600, mb: 1 }}>
        Markers
      </Typography>

      {markerSets.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          This map has no markers yet.
        </Typography>
      ) : (
        <List dense disablePadding>
          {markerSets.map((markerSet, index) => {
            const name = markerSet.name || 'Unnamed Collection';
            return (
              <ListItem key={index} disablePadding>
                <Checkbox
                  checked={!hiddenIndices.has(index)}
                  onChange={() => handleToggle(index)}
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
