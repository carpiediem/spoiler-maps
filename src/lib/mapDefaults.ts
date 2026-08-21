import type { LatLng } from '../db';

// Centered on the contiguous US, zoomed out enough to see the whole country
// — a reasonable starting point for a new, not-yet-customized story.
export const DEFAULT_CENTER: LatLng = { lat: 39.8283, lng: -98.5795 };
export const DEFAULT_ZOOM = 4;
// The usable zoom range of Leaflet's own default (OpenStreetMap) tileset.
export const DEFAULT_MIN_ZOOM = 0;
export const DEFAULT_MAX_ZOOM = 19;
