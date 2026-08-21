import { divIcon, type Map as LeafletMap, type Marker as LeafletMarker } from 'leaflet';
import type { RefObject } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLng } from '../db';
import { DEFAULT_CHARACTER_COLOR } from '../lib/characterColor';
import type { CharacterPositionPin } from '../lib/characterPositionPins';
import { buildPinIcon } from '../lib/pinIcon';
import { detectTileUrlTemplateKind } from '../lib/tileUrl';
import { QuadkeyTileLayer } from './QuadkeyTileLayer';

const DEFAULT_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const DEFAULT_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// A plain CSS pin instead of react-leaflet's default marker icon, which
// needs its image assets specially reconfigured to resolve under a
// bundler — not worth it for a single draggable draft-position pin.
const DRAFT_POSITION_ICON = divIcon({
  className: '',
  html: '<div style="width: 20px; height: 20px; border-radius: 50% 50% 50% 0; background: #d32f2f; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5); transform: rotate(-45deg);"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 20],
});

interface MapViewProps {
  tileUrl: string | null;
  /** Overrides the default OpenStreetMap attribution, e.g. a story's own tile layer credit. */
  attribution?: string | null;
  center: LatLng;
  zoom: number;
  mapRef?: RefObject<LeafletMap | null>;
  /** Called whenever the user pans or zooms the map. */
  onPositionChange?: (position: { center: LatLng; zoom: number }) => void;
  /** A draggable pin shown while editing a character position's lat/lng. */
  draftPosition?: LatLng | null;
  onDraftPositionChange?: (position: LatLng) => void;
  /** Numbered pins for the currently expanded character's saved positions. */
  characterPositionPins?: CharacterPositionPin[] | null;
}

interface DraftPositionMarkerProps {
  position: LatLng;
  onChange: (position: LatLng) => void;
}

function DraftPositionMarker({ position, onChange }: DraftPositionMarkerProps) {
  return (
    <Marker
      position={[position.lat, position.lng]}
      icon={DRAFT_POSITION_ICON}
      draggable
      eventHandlers={{
        dragend: (event) => {
          const latLng = (event.target as LeafletMarker).getLatLng();
          onChange({ lat: latLng.lat, lng: latLng.lng });
        },
      }}
    />
  );
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
  draftPosition,
  onDraftPositionChange,
  characterPositionPins,
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
      {draftPosition && onDraftPositionChange && (
        <DraftPositionMarker position={draftPosition} onChange={onDraftPositionChange} />
      )}
      {characterPositionPins?.map((pin) => (
        <Marker
          key={pin.id}
          position={[pin.position.lat, pin.position.lng]}
          icon={buildPinIcon(pin.label, pin.color ?? DEFAULT_CHARACTER_COLOR)}
        />
      ))}
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
