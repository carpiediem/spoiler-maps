import L from 'leaflet';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { toKeyholeQuadkey } from '../lib/quadkey';

class KeyholeTileLayer extends L.TileLayer {
  private readonly template: string;

  constructor(template: string) {
    super(template);
    this.template = template;
  }

  override getTileUrl(coords: L.Coords): string {
    const quadkey = toKeyholeQuadkey(coords.x, coords.y, coords.z);
    return this.template.replace(/\{q\}/g, quadkey);
  }
}

interface QuadkeyTileLayerProps {
  url: string;
}

// react-leaflet's TileLayer only understands {x}/{y}/{z}/{s} placeholders, so
// a {q} (keyhole quadtree) template needs its own imperative Leaflet layer.
export function QuadkeyTileLayer({ url }: QuadkeyTileLayerProps) {
  const map = useMap();

  useEffect(() => {
    const layer = new KeyholeTileLayer(url).addTo(map);
    return () => {
      layer.remove();
    };
  }, [map, url]);

  return null;
}
