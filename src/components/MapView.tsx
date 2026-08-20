import type { Map as LeafletMap } from 'leaflet';
import type { RefObject } from 'react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLng } from '../db';
import { detectTileUrlTemplateKind } from '../lib/tileUrl';
import { QuadkeyTileLayer } from './QuadkeyTileLayer';

const DEFAULT_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const DEFAULT_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

interface MapViewProps {
  tileUrl: string | null;
  /** Overrides the default OpenStreetMap attribution, e.g. a story's own tile layer credit. */
  attribution?: string | null;
  center: LatLng;
  zoom: number;
  mapRef?: RefObject<LeafletMap | null>;
  /** Called whenever the user pans or zooms the map. */
  onPositionChange?: (position: { center: LatLng; zoom: number }) => void;
}

interface MapPositionTrackerProps {
  onPositionChange: (position: { center: LatLng; zoom: number }) => void;
}

function MapPositionTracker({ onPositionChange }: MapPositionTrackerProps) {
  const map = useMapEvents({
    moveend: () => {
      const mapCenter = map.getCenter();
      onPositionChange({ center: { lat: mapCenter.lat, lng: mapCenter.lng }, zoom: map.getZoom() });
    },
    zoomend: () => {
      const mapCenter = map.getCenter();
      onPositionChange({ center: { lat: mapCenter.lat, lng: mapCenter.lng }, zoom: map.getZoom() });
    },
  });
  return null;
}

export function MapView({
  tileUrl,
  attribution,
  center,
  zoom,
  mapRef,
  onPositionChange,
}: MapViewProps) {
  const activeTileUrl = tileUrl ?? DEFAULT_TILE_URL;
  const kind = tileUrl ? detectTileUrlTemplateKind(tileUrl) : 'xyz';
  const resolvedAttribution = attribution ?? (tileUrl ? undefined : DEFAULT_ATTRIBUTION);

  return (
    <MapContainer
      ref={mapRef}
      center={[center.lat, center.lng]}
      zoom={zoom}
      style={{ position: 'absolute', inset: 0 }}
    >
      {onPositionChange && <MapPositionTracker onPositionChange={onPositionChange} />}
      {kind === 'quadkey' ? (
        <QuadkeyTileLayer
          key={activeTileUrl}
          url={activeTileUrl}
          attribution={resolvedAttribution}
        />
      ) : (
        <TileLayer key={activeTileUrl} url={activeTileUrl} attribution={resolvedAttribution} />
      )}
    </MapContainer>
  );
}
