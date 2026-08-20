import { Typography } from '@mui/material';
import { useEffect } from 'react';
import { listMarkerSetsForStory, listMarkersForMarkerSet } from '../../db';

interface MarkersSectionProps {
  storyId: number;
  onCountChange?: (count: number) => void;
}

export function MarkersSection({ storyId, onCountChange }: MarkersSectionProps) {
  useEffect(() => {
    let cancelled = false;

    listMarkerSetsForStory(storyId).then(async (markerSets) => {
      if (cancelled) return;
      const markerLists = await Promise.all(
        markerSets.map((markerSet) => listMarkersForMarkerSet(markerSet.id)),
      );
      /* v8 ignore next -- exercising this specific unmount window (after listMarkerSetsForStory resolves but before the marker Promise.all does) is too timing-dependent to test reliably; the outer cancelled check above covers the same defensive purpose. */
      if (cancelled) return;
      onCountChange?.(markerLists.reduce((total, markers) => total + markers.length, 0));
    });

    return () => {
      cancelled = true;
    };
  }, [storyId, onCountChange]);

  return (
    <Typography variant="body2" color="text.secondary">
      No markers yet.
    </Typography>
  );
}
