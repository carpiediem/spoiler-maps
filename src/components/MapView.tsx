import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { detectTileUrlTemplateKind } from '../lib/tileUrl';
import { QuadkeyTileLayer } from './QuadkeyTileLayer';

const DEFAULT_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const DEFAULT_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

interface MapViewProps {
  tileUrl: string | null;
}

export function MapView({ tileUrl }: MapViewProps) {
  const activeTileUrl = tileUrl ?? DEFAULT_TILE_URL;
  const kind = tileUrl ? detectTileUrlTemplateKind(tileUrl) : 'xyz';

  return (
    <MapContainer center={[39.8283, -98.5795]} zoom={4} style={{ position: 'absolute', inset: 0 }}>
      {kind === 'quadkey' ? (
        <QuadkeyTileLayer key={activeTileUrl} url={activeTileUrl} />
      ) : (
        <TileLayer
          key={activeTileUrl}
          url={activeTileUrl}
          attribution={tileUrl ? undefined : DEFAULT_ATTRIBUTION}
        />
      )}
    </MapContainer>
  );
}
