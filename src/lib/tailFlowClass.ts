import type { Polyline as LeafletPolyline } from 'leaflet';

/**
 * react-leaflet applies `pathOptions` via a deferred `layer.setStyle(...)`
 * effect that runs after the underlying Leaflet path element is already
 * created — but Leaflet only ever adds `options.className` to that element
 * at creation time, so a className set via `pathOptions` silently never
 * lands on the DOM (confirmed: works by chance under React StrictMode's
 * double-mount in dev, but not in a production build).
 *
 * Adding it directly via this ref sidesteps that, but the ref itself fires
 * before the element exists too: react-leaflet attaches the layer to the
 * map (creating its DOM element) in a passive useEffect, while React runs
 * this ref's underlying useImperativeHandle as a synchronous
 * useLayoutEffect — earlier in the same commit. So this waits for
 * Leaflet's own 'add' event, which fires once attachment actually
 * completes, falling back to applying immediately on the off chance the
 * element already exists by the time the ref runs.
 */
export function attachTailFlowClass(instance: LeafletPolyline | null) {
  if (!instance) return;

  function applyClass() {
    instance!.getElement()?.classList.add('character-tail-flow');
  }

  applyClass();
  // Not once(): Leaflet's Path.onAdd recreates the underlying <path> element
  // from scratch on every add, not just the first — and react-leaflet's own
  // layer-attachment effect can re-run (remove then re-add the same Leaflet
  // instance to the map) without this ref firing again, since the instance
  // itself doesn't change identity. A persistent listener re-applies the
  // class on each such recreation instead of only the first.
  instance.on('add', applyClass);
}
