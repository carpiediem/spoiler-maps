import { divIcon, type Map as LeafletMap, type Marker as LeafletMarker } from 'leaflet';
import type { RefObject } from 'react';
import { useEffect } from 'react';
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLng } from '../db';
import { DEFAULT_CHARACTER_COLOR } from '../lib/characterColor';
import type { CharacterPositionPin, CharacterTailOverlay } from '../lib/characterPositionPins';
import { buildPinIcon, buildSkullIcon } from '../lib/pinIcon';
import { detectTileUrlTemplateKind } from '../lib/tileUrl';
import { QuadkeyTileLayer } from './QuadkeyTileLayer';

const DEFAULT_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const DEFAULT_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Shared so a 'dot'-style position marker's diameter (2 * radius) works out
// to exactly double a tail polyline's width, as they're drawn together for
// a visible-but-collapsed character.
const CHARACTER_TAIL_WEIGHT = 5;

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
  minZoom?: number;
  maxZoom?: number;
  mapRef?: RefObject<LeafletMap | null>;
  /** Called whenever the user pans or zooms the map. */
  onPositionChange?: (position: { center: LatLng; zoom: number }) => void;
  /** A draggable pin shown while editing a character position's lat/lng. */
  draftPosition?: LatLng | null;
  onDraftPositionChange?: (position: LatLng) => void;
  /** Numbered pins for the currently expanded character's saved positions. */
  characterPositionPins?: CharacterPositionPin[] | null;
  /** Saved tails to draw for every character toggled visible on the map, independent of characterPositionPins. */
  characterTails?: CharacterTailOverlay[] | null;
  /** The id of the existing CharacterPosition currently open in the editor, if any. */
  editingPositionId?: number | null;
  /** Called when a non-editing character position pin is clicked, to open it for editing. */
  onCharacterPositionPinClick?: (pin: CharacterPositionPin) => void;
  /** Points clicked so far while drawing a tail; null when not in drawing mode. */
  tailDraftPoints?: LatLng[] | null;
  /** Called with the clicked lat/lng while drawing a tail. */
  onTailPointClick?: (point: LatLng) => void;
  /** The color of the character whose tail is being drawn. */
  tailColor?: string | null;
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

interface TailDrawingCatcherProps {
  onPointClick: (point: LatLng) => void;
}

// A map-wide click listener, mounted only while drawing a tail: each click
// on the map (not already consumed by a marker's own click handler) appends
// a point to the in-progress tail.
function TailDrawingCatcher({ onPointClick }: TailDrawingCatcherProps) {
  useMapEvents({
    click: (event) => {
      onPointClick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

interface ZoomLimitsProps {
  minZoom?: number;
  maxZoom?: number;
}

// MapContainer only applies minZoom/maxZoom when the map is first created,
// not on later prop changes — so editing a story's zoom range and saving
// (without remounting MapView) would otherwise leave the live map's zoom
// control out of sync until the page reloads.
function ZoomLimits({ minZoom, maxZoom }: ZoomLimitsProps) {
  const map = useMap();

  useEffect(() => {
    if (minZoom !== undefined) map.setMinZoom(minZoom);
  }, [map, minZoom]);

  useEffect(() => {
    if (maxZoom !== undefined) map.setMaxZoom(maxZoom);
  }, [map, maxZoom]);

  return null;
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
  minZoom,
  maxZoom,
  mapRef,
  onPositionChange,
  draftPosition,
  onDraftPositionChange,
  characterPositionPins,
  characterTails,
  editingPositionId,
  onCharacterPositionPinClick,
  tailDraftPoints,
  onTailPointClick,
  tailColor,
}: MapViewProps) {
  const activeTileUrl = tileUrl ?? DEFAULT_TILE_URL;
  const kind = tileUrl ? detectTileUrlTemplateKind(tileUrl) : 'xyz';
  const resolvedAttribution = attribution ?? (tileUrl ? undefined : DEFAULT_ATTRIBUTION);

  return (
    <MapContainer
      ref={mapRef}
      center={[center.lat, center.lng]}
      zoom={zoom}
      minZoom={minZoom}
      maxZoom={maxZoom}
      style={{ position: 'absolute', inset: 0 }}
    >
      <ZoomLimits minZoom={minZoom} maxZoom={maxZoom} />
      {onPositionChange && <MapPositionTracker onPositionChange={onPositionChange} />}
      {tailDraftPoints && onTailPointClick && (
        <TailDrawingCatcher onPointClick={onTailPointClick} />
      )}
      {draftPosition && onDraftPositionChange && editingPositionId == null && (
        <DraftPositionMarker position={draftPosition} onChange={onDraftPositionChange} />
      )}
      {tailDraftPoints && draftPosition && (
        <>
          <Polyline
            positions={[draftPosition, ...tailDraftPoints].map((point) => [point.lat, point.lng])}
            pathOptions={{
              color: tailColor ?? DEFAULT_CHARACTER_COLOR,
              weight: CHARACTER_TAIL_WEIGHT,
            }}
          />
          {tailDraftPoints.map((point, index) => (
            <CircleMarker
              key={index}
              center={[point.lat, point.lng]}
              radius={4}
              pathOptions={{
                color: tailColor ?? DEFAULT_CHARACTER_COLOR,
                fillColor: tailColor ?? DEFAULT_CHARACTER_COLOR,
                fillOpacity: 1,
              }}
            />
          ))}
        </>
      )}
      {characterTails?.map((tail, tailIndex) => (
        <Polyline
          key={`${tail.characterId}-${tailIndex}`}
          positions={tail.points.map((point) => [point.lat, point.lng])}
          pathOptions={{
            color: tail.color ?? DEFAULT_CHARACTER_COLOR,
            weight: CHARACTER_TAIL_WEIGHT,
            opacity: tail.opacity,
          }}
        />
      ))}
      {characterPositionPins?.map((pin) => {
        const color = pin.color ?? DEFAULT_CHARACTER_COLOR;
        const isEditingThisPin =
          pin.characterPosition.id === editingPositionId && draftPosition && onDraftPositionChange;

        // A visible-but-collapsed character's non-last positions render as
        // plain colored dots rather than labeled pins — unless this is the
        // one currently open for editing, which always gets the full
        // draggable pin below so it's clearly the one being moved.
        if (!isEditingThisPin && pin.style === 'dot') {
          return (
            <CircleMarker
              key={pin.characterPosition.id}
              center={[pin.characterPosition.position.lat, pin.characterPosition.position.lng]}
              radius={CHARACTER_TAIL_WEIGHT}
              pathOptions={{ color, fillColor: color, fillOpacity: 1 }}
              eventHandlers={{
                click: () => onCharacterPositionPinClick?.(pin),
              }}
            />
          );
        }

        const icon = pin.characterPosition.dead ? buildSkullIcon() : buildPinIcon(pin.label, color);

        return isEditingThisPin ? (
          <Marker
            key={pin.characterPosition.id}
            position={[draftPosition.lat, draftPosition.lng]}
            icon={icon}
            draggable
            eventHandlers={{
              dragend: (event) => {
                const latLng = (event.target as LeafletMarker).getLatLng();
                onDraftPositionChange({ lat: latLng.lat, lng: latLng.lng });
              },
            }}
          />
        ) : (
          <Marker
            key={pin.characterPosition.id}
            position={[pin.characterPosition.position.lat, pin.characterPosition.position.lng]}
            icon={icon}
            eventHandlers={{
              click: () => onCharacterPositionPinClick?.(pin),
            }}
          />
        );
      })}
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
