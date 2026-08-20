import type { Map as LeafletMap } from 'leaflet';
import { render } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { MapView } from './MapView';

const center = { lat: 40, lng: -100 };

describe('MapView', () => {
  it('renders the default xyz tile layer when no tileUrl is set', () => {
    const { container } = render(<MapView tileUrl={null} center={center} zoom={5} />);
    expect(container.querySelector('.leaflet-container')).toBeInTheDocument();
  });

  it('renders an xyz tile layer for a custom {x}/{y}/{z} template', () => {
    const { container } = render(
      <MapView tileUrl="https://tile.example.com/{z}/{x}/{y}.png" center={center} zoom={5} />,
    );
    expect(container.querySelector('.leaflet-container')).toBeInTheDocument();
  });

  it('renders the quadkey tile layer for a {q} template', () => {
    const { container } = render(
      <MapView tileUrl="https://tile.example.com/{q}.jpg" center={center} zoom={5} />,
    );
    expect(container.querySelector('.leaflet-container')).toBeInTheDocument();
  });

  it('renders at the given center and zoom, and exposes the map instance via mapRef', () => {
    const mapRef = createRef<LeafletMap | null>();
    render(<MapView tileUrl={null} center={center} zoom={6} mapRef={mapRef} />);

    expect(mapRef.current).not.toBeNull();
    expect(mapRef.current!.getZoom()).toBe(6);
    expect(mapRef.current!.getCenter().lat).toBeCloseTo(center.lat);
    expect(mapRef.current!.getCenter().lng).toBeCloseTo(center.lng);
  });
});
