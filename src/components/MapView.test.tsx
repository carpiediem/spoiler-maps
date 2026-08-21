import { Marker as LeafletMarker, type Map as LeafletMap } from 'leaflet';
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

  it('does not render a draft position marker when draftPosition is not set', () => {
    const mapRef = createRef<LeafletMap | null>();
    render(<MapView tileUrl={null} center={center} zoom={5} mapRef={mapRef} />);

    let markerCount = 0;
    mapRef.current!.eachLayer((layer) => {
      if (layer instanceof LeafletMarker) markerCount += 1;
    });
    expect(markerCount).toBe(0);
  });

  it('renders a draggable draft position marker and reports its new lat/lng on drag end', () => {
    const mapRef = createRef<LeafletMap | null>();
    const onDraftPositionChange = vi.fn();
    render(
      <MapView
        tileUrl={null}
        center={center}
        zoom={5}
        mapRef={mapRef}
        draftPosition={{ lat: 41, lng: -101 }}
        onDraftPositionChange={onDraftPositionChange}
      />,
    );

    let marker: LeafletMarker | undefined;
    mapRef.current!.eachLayer((layer) => {
      if (layer instanceof LeafletMarker) marker = layer;
    });
    expect(marker).toBeDefined();
    expect(marker!.getLatLng().lat).toBeCloseTo(41);
    expect(marker!.getLatLng().lng).toBeCloseTo(-101);

    act(() => {
      marker!.setLatLng([42, -102]);
      marker!.fire('dragend', { target: marker });
    });

    expect(onDraftPositionChange).toHaveBeenCalledTimes(1);
    const [reported] = onDraftPositionChange.mock.calls[0] as [{ lat: number; lng: number }];
    expect(reported.lat).toBeCloseTo(42);
    expect(reported.lng).toBeCloseTo(-102);
  });

  it('does not render character position pins when none are given', () => {
    const mapRef = createRef<LeafletMap | null>();
    render(<MapView tileUrl={null} center={center} zoom={5} mapRef={mapRef} />);

    let markerCount = 0;
    mapRef.current!.eachLayer((layer) => {
      if (layer instanceof LeafletMarker) markerCount += 1;
    });
    expect(markerCount).toBe(0);
  });

  it('renders a non-draggable, numbered pin for each character position', () => {
    const mapRef = createRef<LeafletMap | null>();
    render(
      <MapView
        tileUrl={null}
        center={center}
        zoom={5}
        mapRef={mapRef}
        characterPositionPins={[
          { id: 1, position: { lat: 41, lng: -101 }, label: '1', color: '#ff0000' },
          { id: 2, position: { lat: 42, lng: -102 }, label: '2', color: null },
        ]}
      />,
    );

    const markers: LeafletMarker[] = [];
    mapRef.current!.eachLayer((layer) => {
      if (layer instanceof LeafletMarker) markers.push(layer);
    });
    expect(markers).toHaveLength(2);
    for (const marker of markers) {
      expect(marker.options.draggable).not.toBe(true);
    }
    expect(markers[0].getLatLng().lat).toBeCloseTo(41);
    expect(markers[1].getLatLng().lat).toBeCloseTo(42);
  });
});
