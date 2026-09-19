import type { Marker } from '../db';
import type { TimelineMode } from '../components/MapTimelineControl';
import type { MarkerMapPin } from './markerPins';
import type { StoryDocument, StoryDocumentMarker } from './storyDocument';
import { isPositionVisible } from './viewTimeline';

/** Adapts a StoryDocumentMarker into the shape MapView's pins expect, with a synthetic id (the document has none). */
function toMapMarker(marker: StoryDocumentMarker, syntheticId: number): Marker {
  return {
    id: syntheticId,
    markerSetId: syntheticId,
    label: marker.label,
    icon: marker.icon ?? null,
    url: marker.url ?? null,
    color: marker.color ?? null,
    large: marker.large ?? false,
    position: { lat: marker.lat, lng: marker.lng },
    polygon: marker.polygon ?? null,
    chapterRange: null,
    episodeRange: null,
  };
}

/**
 * The view-screen equivalent of CharactersSection's/buildViewPinsAndTails's
 * pin computation, but for markers: every marker whose chapter/episode
 * range (for the active medium) contains the timeline's current scrub
 * position is shown, honoring its own set's noIcons flag — unless its
 * whole marker set is hidden via the sidebar's per-collection checkbox.
 */
export function buildViewMarkerPins(
  document: StoryDocument,
  mode: TimelineMode,
  currentIndex: number,
  hiddenMarkerSetIndices: Set<number>,
): MarkerMapPin[] {
  const pins: MarkerMapPin[] = [];

  document.markerSets.forEach((markerSet, markerSetIndex) => {
    if (hiddenMarkerSetIndices.has(markerSetIndex)) return;
    markerSet.markers.forEach((marker, markerIndex) => {
      if (!isPositionVisible(marker, mode, currentIndex)) return;
      const syntheticId = markerSetIndex * 100_000 + markerIndex;
      pins.push({
        marker: toMapMarker(marker, syntheticId),
        noIcons: markerSet.noIcons ?? false,
      });
    });
  });

  return pins;
}
