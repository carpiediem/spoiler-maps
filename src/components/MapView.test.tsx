import type { Map as LeafletMap } from 'leaflet';
import { act, render } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
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

  it('calls onPositionChange when the map is panned or zoomed', () => {
    const mapRef = createRef<LeafletMap | null>();
    const onPositionChange = vi.fn();
    render(
      <MapView
        tileUrl={null}
        center={center}
        zoom={5}
        mapRef={mapRef}
        onPositionChange={onPositionChange}
      />,
    );

    act(() => {
      mapRef.current!.setView([41, -101], 7, { animate: false });
    });

    expect(onPositionChange).toHaveBeenCalled();
    const lastCall = onPositionChange.mock.calls.at(-1)!;
    const [position] = lastCall as [{ center: { lat: number; lng: number }; zoom: number }];
    expect(position.zoom).toBe(7);
    expect(position.center.lat).toBeCloseTo(41);
    expect(position.center.lng).toBeCloseTo(-101);
  });
});
