import {
  CircleMarker as LeafletCircleMarker,
  Marker as LeafletMarker,
  Polyline as LeafletPolyline,
  type Map as LeafletMap,
} from 'leaflet';
import { act, render } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CHARACTER_COLOR } from '../lib/characterColor';
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

  function makePin(
    id: number,
    position: { lat: number; lng: number },
    label: string,
    dead = false,
  ) {
    return {
      characterId: 1,
      characterPosition: {
        id,
        characterId: 1,
        position,
        dead,
        note: null,
        tail: null,
        chapterRange: null,
        episodeRange: null,
      },
      label,
      positionIndex: id,
      color: id === 1 ? '#ff0000' : null,
    };
  }

  it('renders a non-draggable, numbered pin for each character position', () => {
    const mapRef = createRef<LeafletMap | null>();
    render(
      <MapView
        tileUrl={null}
        center={center}
        zoom={5}
        mapRef={mapRef}
        characterPositionPins={[
          makePin(1, { lat: 41, lng: -101 }, '1'),
          makePin(2, { lat: 42, lng: -102 }, '2'),
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

  it('renders a skull marker, not a numbered pin, for a dead position', () => {
    const mapRef = createRef<LeafletMap | null>();
    const { container } = render(
      <MapView
        tileUrl={null}
        center={center}
        zoom={5}
        mapRef={mapRef}
        characterPositionPins={[
          makePin(1, { lat: 41, lng: -101 }, '1'),
          makePin(2, { lat: 42, lng: -102 }, '2', true),
        ]}
      />,
    );

    const markers: LeafletMarker[] = [];
    mapRef.current!.eachLayer((layer) => {
      if (layer instanceof LeafletMarker) markers.push(layer);
    });
    expect(markers).toHaveLength(2);

    const icons = container.querySelectorAll('.leaflet-marker-icon');
    const iconUrls = Array.from(icons).map((el) =>
      decodeURIComponent(el.getAttribute('src') ?? ''),
    );
    expect(iconUrls.some((url) => url.includes('<circle'))).toBe(true);
    expect(iconUrls.some((url) => url.includes('>1<'))).toBe(true);
  });

  it('calls onCharacterPositionPinClick when a static pin is clicked', () => {
    const mapRef = createRef<LeafletMap | null>();
    const onCharacterPositionPinClick = vi.fn();
    const pin = makePin(1, { lat: 41, lng: -101 }, '1');
    render(
      <MapView
        tileUrl={null}
        center={center}
        zoom={5}
        mapRef={mapRef}
        characterPositionPins={[pin]}
        onCharacterPositionPinClick={onCharacterPositionPinClick}
      />,
    );

    let marker: LeafletMarker | undefined;
    mapRef.current!.eachLayer((layer) => {
      if (layer instanceof LeafletMarker) marker = layer;
    });
    act(() => {
      marker!.fire('click');
    });

    expect(onCharacterPositionPinClick).toHaveBeenCalledWith(pin);
  });

  it('renders a solid colored dot, not a labeled pin, for a "dot"-style position', () => {
    const mapRef = createRef<LeafletMap | null>();
    const onCharacterPositionPinClick = vi.fn();
    const dotPin = { ...makePin(1, { lat: 41, lng: -101 }, ''), style: 'dot' as const };
    render(
      <MapView
        tileUrl={null}
        center={center}
        zoom={5}
        mapRef={mapRef}
        characterPositionPins={[dotPin]}
        onCharacterPositionPinClick={onCharacterPositionPinClick}
      />,
    );

    let markerCount = 0;
    let circle: LeafletCircleMarker | undefined;
    mapRef.current!.eachLayer((layer) => {
      if (layer instanceof LeafletMarker) markerCount += 1;
      if (layer instanceof LeafletCircleMarker) circle = layer;
    });
    expect(markerCount).toBe(0);
    expect(circle).toBeDefined();
    expect((circle!.options as { fillColor?: string }).fillColor).toBe('#ff0000');
    expect((circle!.options as { fillOpacity?: number }).fillOpacity).toBe(1);

    act(() => {
      circle!.fire('click');
    });
    expect(onCharacterPositionPinClick).toHaveBeenCalledWith(dotPin);
  });

  it('renders a "dot"-style position under active editing as the usual draggable pin instead', () => {
    const mapRef = createRef<LeafletMap | null>();
    const dotPin = { ...makePin(1, { lat: 41, lng: -101 }, ''), style: 'dot' as const };
    render(
      <MapView
        tileUrl={null}
        center={center}
        zoom={5}
        mapRef={mapRef}
        characterPositionPins={[dotPin]}
        editingPositionId={1}
        draftPosition={{ lat: 41, lng: -101 }}
        onDraftPositionChange={vi.fn()}
      />,
    );

    let markerCount = 0;
    let circleCount = 0;
    mapRef.current!.eachLayer((layer) => {
      if (layer instanceof LeafletMarker) markerCount += 1;
      if (layer instanceof LeafletCircleMarker) circleCount += 1;
    });
    expect(markerCount).toBe(1);
    expect(circleCount).toBe(0);
  });

  it('renders the pin matching editingPositionId as draggable, tracking draftPosition', () => {
    const mapRef = createRef<LeafletMap | null>();
    const onDraftPositionChange = vi.fn();
    render(
      <MapView
        tileUrl={null}
        center={center}
        zoom={5}
        mapRef={mapRef}
        characterPositionPins={[
          makePin(1, { lat: 41, lng: -101 }, '1'),
          makePin(2, { lat: 42, lng: -102 }, '2'),
        ]}
        editingPositionId={2}
        draftPosition={{ lat: 45, lng: -105 }}
        onDraftPositionChange={onDraftPositionChange}
      />,
    );

    const markers: LeafletMarker[] = [];
    mapRef.current!.eachLayer((layer) => {
      if (layer instanceof LeafletMarker) markers.push(layer);
    });
    // Only the editing pin is draggable; no separate generic draft marker
    // is rendered alongside it, and the non-editing pin stays static.
    expect(markers).toHaveLength(2);
    const draggableMarkers = markers.filter((marker) => marker.options.draggable);
    expect(draggableMarkers).toHaveLength(1);
    expect(draggableMarkers[0]!.getLatLng().lat).toBeCloseTo(45);

    act(() => {
      draggableMarkers[0]!.setLatLng([46, -106]);
      draggableMarkers[0]!.fire('dragend', { target: draggableMarkers[0] });
    });

    expect(onDraftPositionChange).toHaveBeenCalledTimes(1);
    const [reported] = onDraftPositionChange.mock.calls[0] as [{ lat: number; lng: number }];
    expect(reported.lat).toBeCloseTo(46);
    expect(reported.lng).toBeCloseTo(-106);
  });

  it('does not render the generic draft marker while an existing pin is being edited', () => {
    const mapRef = createRef<LeafletMap | null>();
    render(
      <MapView
        tileUrl={null}
        center={center}
        zoom={5}
        mapRef={mapRef}
        characterPositionPins={[makePin(1, { lat: 41, lng: -101 }, '1')]}
        editingPositionId={1}
        draftPosition={{ lat: 41, lng: -101 }}
        onDraftPositionChange={vi.fn()}
      />,
    );

    // Only the one numbered, editing pin — not a second, unlabeled marker.
    let markerCount = 0;
    mapRef.current!.eachLayer((layer) => {
      if (layer instanceof LeafletMarker) markerCount += 1;
    });
    expect(markerCount).toBe(1);
  });

  it('calls onTailPointClick with the clicked lat/lng while drawing a tail', () => {
    const mapRef = createRef<LeafletMap | null>();
    const onTailPointClick = vi.fn();
    render(
      <MapView
        tileUrl={null}
        center={center}
        zoom={5}
        mapRef={mapRef}
        tailDraftPoints={[]}
        onTailPointClick={onTailPointClick}
      />,
    );

    act(() => {
      mapRef.current!.fire('click', { latlng: { lat: 41, lng: -101 } });
    });

    expect(onTailPointClick).toHaveBeenCalledWith({ lat: 41, lng: -101 });
  });

  it('does not listen for map clicks when not drawing a tail', () => {
    const mapRef = createRef<LeafletMap | null>();
    const onTailPointClick = vi.fn();
    render(
      <MapView
        tileUrl={null}
        center={center}
        zoom={5}
        mapRef={mapRef}
        tailDraftPoints={null}
        onTailPointClick={onTailPointClick}
      />,
    );

    act(() => {
      mapRef.current!.fire('click', { latlng: { lat: 41, lng: -101 } });
    });

    expect(onTailPointClick).not.toHaveBeenCalled();
  });

  it('renders the in-progress tail as a colored polyline with a dot per point', () => {
    const mapRef = createRef<LeafletMap | null>();
    render(
      <MapView
        tileUrl={null}
        center={center}
        zoom={5}
        mapRef={mapRef}
        draftPosition={{ lat: 40, lng: -100 }}
        tailDraftPoints={[
          { lat: 41, lng: -101 },
          { lat: 42, lng: -102 },
        ]}
        tailColor="#00ff00"
      />,
    );

    let polyline: LeafletPolyline | undefined;
    const circleMarkers: LeafletCircleMarker[] = [];
    mapRef.current!.eachLayer((layer) => {
      if (layer instanceof LeafletPolyline) polyline = layer;
      if (layer instanceof LeafletCircleMarker) circleMarkers.push(layer);
    });

    expect(polyline).toBeDefined();
    expect((polyline!.options as { color?: string }).color).toBe('#00ff00');
    expect(polyline!.getLatLngs()).toHaveLength(3);
    expect(circleMarkers).toHaveLength(2);
    expect((circleMarkers[0]!.options as { color?: string }).color).toBe('#00ff00');
  });

  it('does not render a tail when there is no draft position yet', () => {
    const mapRef = createRef<LeafletMap | null>();
    render(
      <MapView
        tileUrl={null}
        center={center}
        zoom={5}
        mapRef={mapRef}
        tailDraftPoints={[{ lat: 41, lng: -101 }]}
      />,
    );

    let polylineCount = 0;
    mapRef.current!.eachLayer((layer) => {
      if (layer instanceof LeafletPolyline) polylineCount += 1;
    });
    expect(polylineCount).toBe(0);
  });

  it('renders a polyline for each character tail overlay', () => {
    const mapRef = createRef<LeafletMap | null>();
    render(
      <MapView
        tileUrl={null}
        center={center}
        zoom={5}
        mapRef={mapRef}
        characterTails={[
          {
            characterId: 1,
            points: [
              { lat: 41, lng: -101 },
              { lat: 42, lng: -102 },
            ],
            color: '#00ff00',
          },
          {
            characterId: 1,
            points: [{ lat: 43, lng: -103 }],
            color: null,
          },
        ]}
      />,
    );

    const polylines: LeafletPolyline[] = [];
    mapRef.current!.eachLayer((layer) => {
      if (layer instanceof LeafletPolyline) polylines.push(layer);
    });

    expect(polylines).toHaveLength(2);
    expect((polylines[0].options as { color?: string }).color).toBe('#00ff00');
    expect((polylines[1].options as { color?: string }).color).toBe(DEFAULT_CHARACTER_COLOR);
  });

  it('applies the initial zoom limits to the underlying Leaflet map', () => {
    const mapRef = createRef<LeafletMap | null>();
    render(
      <MapView tileUrl={null} center={center} zoom={5} minZoom={2} maxZoom={10} mapRef={mapRef} />,
    );

    expect(mapRef.current!.getMinZoom()).toBe(2);
    expect(mapRef.current!.getMaxZoom()).toBe(10);
  });

  it('keeps the live map in sync when zoom limits change without remounting', () => {
    const mapRef = createRef<LeafletMap | null>();
    const { rerender } = render(
      <MapView tileUrl={null} center={center} zoom={5} minZoom={0} maxZoom={19} mapRef={mapRef} />,
    );

    expect(mapRef.current!.getMinZoom()).toBe(0);
    expect(mapRef.current!.getMaxZoom()).toBe(19);

    act(() => {
      rerender(
        <MapView tileUrl={null} center={center} zoom={5} minZoom={3} maxZoom={8} mapRef={mapRef} />,
      );
    });

    expect(mapRef.current!.getMinZoom()).toBe(3);
    expect(mapRef.current!.getMaxZoom()).toBe(8);
  });
});
