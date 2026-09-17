import { divIcon, type Map as LeafletMap, type Marker as LeafletMarker } from 'leaflet';
import type { RefObject } from 'react';
import { useEffect } from 'react';
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLng, Marker as MarkerRecord } from '../db';
import { DEFAULT_CHARACTER_COLOR } from '../lib/characterColor';
import type { CharacterPositionPin, CharacterTailOverlay } from '../lib/characterPositionPins';
import { DEFAULT_MARKER_COLOR } from '../lib/markerColor';
import type { MarkerMapPin } from '../lib/markerPins';
import { buildMarkerIcon, buildPinIcon, buildSkullIcon } from '../lib/pinIcon';
import { attachTailFlowClass } from '../lib/tailFlowClass';
import { detectTileUrlTemplateKind } from '../lib/tileUrl';
import { QuadkeyTileLayer } from './QuadkeyTileLayer';
import './MapView.css';

const DEFAULT_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const DEFAULT_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function isFiniteLatLng(point: LatLng): boolean {
  return Number.isFinite(point.lat) && Number.isFinite(point.lng);
}

// Diagnostic helper (see MapView's own render body below) — warns about a
// marker whose position/polygon can't be rendered, naming the marker so
// it's easy to track down in the editor.
function describeMarkerProblems(marker: MarkerRecord): void {
  if (!isFiniteLatLng(marker.position)) {
    // eslint-disable-next-line no-console
    console.warn('[MapView] marker has a non-finite position:', marker.id, marker.label, marker);
  }
  if (marker.polygon) {
    if (marker.polygon.length < 3) {
      // eslint-disable-next-line no-console
      console.warn(
        '[MapView] marker area has fewer than 3 points, which Leaflet may render oddly or not at all:',
        marker.id,
        marker.label,
        marker.polygon,
      );
    }
    if (marker.polygon.some((point) => !isFiniteLatLng(point))) {
      // eslint-disable-next-line no-console
      console.warn(
        '[MapView] marker area has a non-finite point:',
        marker.id,
        marker.label,
        marker.polygon,
      );
    }
  }
}

// Shared so a 'dot'-style position marker's diameter (2 * radius) works out
// to exactly double a tail polyline's width, as they're drawn together for
// a visible-but-collapsed character.
const CHARACTER_TAIL_WEIGHT = 5;

// A plain CSS pin instead of react-leaflet's default marker icon, which
// needs its image assets specially reconfigured to resolve under a
// bundler — not worth it for a single draggable draft-position pin. Also
// used for the currently selected marker below, so dragging always shows
// the same simple pushpin regardless of that marker's own icon/size.
const DRAFT_POSITION_ICON = divIcon({
  className: '',
  html: '<div style="width: 20px; height: 20px; border-radius: 50% 50% 50% 0; background: #d32f2f; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5); transform: rotate(-45deg);"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 20],
});

// For a marker whose set has noIcons set — the tiles already show an icon
// at this spot, so this stays invisible, but keeps real (clickable)
// dimensions rather than a zero-size icon, and is anchored at its own
// center rather than a pin's point, since there's no visual tip to line up.
const INVISIBLE_MARKER_ICON = divIcon({
  className: '',
  html: '<div style="width: 28px; height: 28px;"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// A small draggable dot for each vertex of a marker area being drawn/edited
// — deliberately plain (no color), so it reads as a control handle rather
// than part of the shape itself.
const AREA_VERTEX_ICON = divIcon({
  className: '',
  html: '<div style="width: 12px; height: 12px; border-radius: 50%; background: #ffffff; border: 2px solid #333333; box-shadow: 0 0 3px rgba(0,0,0,0.6);"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

// A polygon area is shown at 50% opacity so the underlying map tiles stay
// legible beneath it.
const AREA_FILL_OPACITY = 0.5;
// The live in-progress draft is shown a bit lighter, with a dashed outline,
// so it reads as unsaved/still-editable rather than the final result.
const AREA_DRAFT_FILL_OPACITY = 0.35;

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
  /** Static (non-draggable) pins for every marker toggled visible on the map, excluding whichever one is currently selected (see activeMarkerPin). */
  markerPins?: MarkerMapPin[] | null;
  /** The marker currently selected in the sidebar, rendered as a draggable pin regardless of its set's noIcons/visibility. */
  activeMarkerPin?: MarkerMapPin | null;
  /** Called with the new lat/lng once the active marker pin is dropped. */
  onActiveMarkerDragEnd?: (position: LatLng) => void;
  /** Points of the marker area currently being drawn/edited, in order; null when not in that mode. Suppresses the active marker's own saved area, shown live here instead. */
  areaDraftPoints?: LatLng[] | null;
  /** Called with the full updated point list after a vertex is dragged, added (via map click), or removed (via clicking it). */
  onAreaDraftPointsChange?: (points: LatLng[]) => void;
  /** The color to draw the in-progress area draft with; falls back to the default marker color. */
  areaDraftColor?: string | null;
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

interface MapClickCatcherProps {
  onPointClick: (point: LatLng) => void;
}

// A map-wide click listener, mounted only while drawing a tail or a
// marker's area: each click on the map (not already consumed by a marker's
// own click handler) appends a point to whichever is currently in progress.
function MapClickCatcher({ onPointClick }: MapClickCatcherProps) {
  useMapEvents({
    click: (event) => {
      onPointClick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

interface InitialPositionSyncProps {
  center: LatLng;
  zoom: number;
}

// Same story as ZoomLimits below: MapContainer's center/zoom props only
// set up the Leaflet map when it's first created, not on later prop
// changes — so loading straight into a specific story (e.g. /edit/<id>
// directly) mounts the map at DEFAULT_CENTER first (selectedStory is still
// null while the story list is loading) and then never recenters once that
// story's own initialCenter/initialZoom actually arrive, since MapView
// itself doesn't remount for that. Switching stories works fine already —
// EditScreen keys MapView by selectedStoryId, forcing a real remount.
function InitialPositionSync({ center, zoom }: InitialPositionSyncProps) {
  const map = useMap();

  // Only ever meant to correct that one late-arriving-data case, not to
  // fight the user's own subsequent panning/zooming — center/zoom here are
  // a story's saved initialCenter/initialZoom, which in practice only
  // change on that initial load or when switching stories (already
  // remounting), not from live map interaction.
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom);
  }, [map, center.lat, center.lng, zoom]);

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
  markerPins,
  activeMarkerPin,
  onActiveMarkerDragEnd,
  areaDraftPoints,
  onAreaDraftPointsChange,
  areaDraftColor,
}: MapViewProps) {
  const activeTileUrl = tileUrl ?? DEFAULT_TILE_URL;
  const kind = tileUrl ? detectTileUrlTemplateKind(tileUrl) : 'xyz';
  const resolvedAttribution = attribution ?? (tileUrl ? undefined : DEFAULT_ATTRIBUTION);

  // Diagnostic only (no effect on rendering): a malformed tile URL template
  // or a marker/character position with non-finite coordinates or a
  // degenerate polygon is the most common cause of a map that renders blank
  // and stops responding to pan/zoom — this surfaces exactly which one, and
  // for which entity, instead of leaving it a silent mystery. Run directly
  // in the render body (not a useEffect) so it's logged even when Leaflet
  // itself throws synchronously while rendering a child (e.g. a NaN
  // position) — a useEffect here would never get a chance to run first.
  if (tileUrl && kind === null) {
    // eslint-disable-next-line no-console
    console.warn(
      '[MapView] tileUrlTemplate matches neither the {x}/{y}/{z} nor {q} scheme — tiles will fail to load:',
      tileUrl,
    );
  }
  if (!Number.isFinite(center.lat) || !Number.isFinite(center.lng) || !Number.isFinite(zoom)) {
    // eslint-disable-next-line no-console
    console.warn('[MapView] non-finite center/zoom:', { center, zoom });
  }
  characterPositionPins?.forEach((pin) => {
    if (!isFiniteLatLng(pin.characterPosition.position)) {
      // eslint-disable-next-line no-console
      console.warn(
        '[MapView] character position has a non-finite lat/lng:',
        pin.characterId,
        pin.characterPosition,
      );
    }
  });
  markerPins?.forEach((pin) => describeMarkerProblems(pin.marker));
  if (activeMarkerPin) describeMarkerProblems(activeMarkerPin.marker);

  return (
    <MapContainer
      ref={mapRef}
      center={[center.lat, center.lng]}
      zoom={zoom}
      minZoom={minZoom}
      maxZoom={maxZoom}
      style={{ position: 'absolute', inset: 0 }}
    >
      <InitialPositionSync center={center} zoom={zoom} />
      <ZoomLimits minZoom={minZoom} maxZoom={maxZoom} />
      {onPositionChange && <MapPositionTracker onPositionChange={onPositionChange} />}
      {tailDraftPoints && onTailPointClick && <MapClickCatcher onPointClick={onTailPointClick} />}
      {areaDraftPoints && onAreaDraftPointsChange && (
        <MapClickCatcher
          onPointClick={(point) => onAreaDraftPointsChange([...areaDraftPoints, point])}
        />
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
          ref={attachTailFlowClass}
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
            >
              {/* Never falls back to showing the lat/lng — no note means no tooltip at all. */}
              {pin.characterPosition.note && <Tooltip>{pin.characterPosition.note}</Tooltip>}
            </CircleMarker>
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
          >
            {pin.characterPosition.note && <Tooltip>{pin.characterPosition.note}</Tooltip>}
          </Marker>
        );
      })}
      {markerPins?.map((pin) =>
        pin.marker.polygon ? (
          <Polygon
            key={`area-${pin.marker.id}`}
            positions={pin.marker.polygon.map((point) => [point.lat, point.lng])}
            pathOptions={{
              color: pin.marker.color ?? DEFAULT_MARKER_COLOR,
              fillColor: pin.marker.color ?? DEFAULT_MARKER_COLOR,
              fillOpacity: AREA_FILL_OPACITY,
            }}
          />
        ) : null,
      )}
      {markerPins?.map((pin) => {
        // Clicking any marker with a wiki URL opens it in a new tab — for a
        // "no icons" marker especially, since its own icon is invisible and
        // this is otherwise the only way to identify it.
        const eventHandlers = pin.marker.url
          ? {
              click: () => window.open(pin.marker.url!, '_blank', 'noopener,noreferrer'),
            }
          : undefined;

        return pin.noIcons ? (
          // The tiles already show an icon here — this stays invisible, but
          // keeps real (clickable) dimensions.
          <Marker
            key={pin.marker.id}
            position={[pin.marker.position.lat, pin.marker.position.lng]}
            icon={INVISIBLE_MARKER_ICON}
            eventHandlers={eventHandlers}
          />
        ) : (
          <Marker
            key={pin.marker.id}
            position={[pin.marker.position.lat, pin.marker.position.lng]}
            icon={buildMarkerIcon(pin.marker)}
            eventHandlers={eventHandlers}
          />
        );
      })}
      {/* The active marker's saved area is hidden while its draft is being drawn/edited — the draft below stands in for it instead. */}
      {activeMarkerPin?.marker.polygon && !areaDraftPoints && (
        <Polygon
          positions={activeMarkerPin.marker.polygon.map((point) => [point.lat, point.lng])}
          pathOptions={{
            color: activeMarkerPin.marker.color ?? DEFAULT_MARKER_COLOR,
            fillColor: activeMarkerPin.marker.color ?? DEFAULT_MARKER_COLOR,
            fillOpacity: AREA_FILL_OPACITY,
          }}
        />
      )}
      {activeMarkerPin && onActiveMarkerDragEnd && (
        <Marker
          key={`active-${activeMarkerPin.marker.id}`}
          position={[activeMarkerPin.marker.position.lat, activeMarkerPin.marker.position.lng]}
          icon={DRAFT_POSITION_ICON}
          draggable
          eventHandlers={{
            dragend: (event) => {
              const latLng = (event.target as LeafletMarker).getLatLng();
              onActiveMarkerDragEnd({ lat: latLng.lat, lng: latLng.lng });
            },
          }}
        />
      )}
      {areaDraftPoints && areaDraftPoints.length >= 3 && (
        <Polygon
          positions={areaDraftPoints.map((point) => [point.lat, point.lng])}
          pathOptions={{
            color: areaDraftColor ?? DEFAULT_MARKER_COLOR,
            fillColor: areaDraftColor ?? DEFAULT_MARKER_COLOR,
            fillOpacity: AREA_DRAFT_FILL_OPACITY,
            dashArray: '4',
          }}
        />
      )}
      {areaDraftPoints && areaDraftPoints.length === 2 && (
        <Polyline
          positions={areaDraftPoints.map((point) => [point.lat, point.lng])}
          pathOptions={{ color: areaDraftColor ?? DEFAULT_MARKER_COLOR, dashArray: '4' }}
        />
      )}
      {areaDraftPoints?.map((point, index) => (
        <Marker
          key={index}
          position={[point.lat, point.lng]}
          icon={AREA_VERTEX_ICON}
          draggable
          eventHandlers={{
            dragend: (event) => {
              const latLng = (event.target as LeafletMarker).getLatLng();
              onAreaDraftPointsChange?.(
                areaDraftPoints.map((existing, existingIndex) =>
                  existingIndex === index ? { lat: latLng.lat, lng: latLng.lng } : existing,
                ),
              );
            },
            // Leaflet suppresses the click that would otherwise follow an
            // actual drag, so this only fires on a genuine (non-drag) click.
            click: () => {
              if (areaDraftPoints.length <= 3) return;
              onAreaDraftPointsChange?.(
                areaDraftPoints.filter((_, existingIndex) => existingIndex !== index),
              );
            },
          }}
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
