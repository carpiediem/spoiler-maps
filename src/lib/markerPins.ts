import type { LatLng, Marker } from '../db';

/** A single map pin for a marker, shown while its marker set is toggled visible. */
export interface MarkerMapPin {
  marker: Marker;
  /** From the marker's own marker set — true skips rendering an icon (the tiles already show one), leaving just a draggable handle while selected. */
  noIcons: boolean;
}

/** The marker currently selected in the sidebar, plus handlers for persisting a drag on its map pin or an edit to its area. */
export interface ActiveMarker {
  marker: Marker;
  noIcons: boolean;
  onDrag: (position: LatLng) => void;
  /** Saves the marker's area (null clears it). Fewer than 3 points is treated as no area at all. */
  onAreaSave: (polygon: LatLng[] | null) => void;
}
