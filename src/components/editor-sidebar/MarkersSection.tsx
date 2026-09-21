import AddIcon from '@mui/icons-material/Add';
import { Button, Stack, Typography } from '@mui/material';
import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from 'react';
import {
  createMarker,
  createMarkerSet,
  deleteMarker,
  deleteMarkerSet,
  listMarkerSetsForStory,
  listMarkersForMarkerSet,
  updateMarker,
  type LatLng,
  type Marker,
  type MarkerSet,
} from '../../db';
import type { ActiveMarker, MarkerMapPin } from '../../lib/markerPins';
import { useRenderLoopWatchdog } from '../../lib/renderLoopWatchdog';
import { useRangeOptions } from './characters/rangeOptions';
import { MarkerSetItem } from './markers/MarkerSetItem';
import { useExpandableEntityList } from './useExpandableEntityList';
import { SectionLoading } from './SectionLoading';
import { track } from '../../lib/analytics';

interface MarkersSectionProps {
  storyId: number;
  onCountChange?: (count: number) => void;
  /** The map's current center, used as a new marker's starting position. */
  mapCenter?: LatLng;
  /** Called with the pins to render for every marker set toggled visible, excluding whichever marker is currently selected. */
  onVisibleMarkersChange?: (pins: MarkerMapPin[] | null) => void;
  /** Called with the currently selected marker (and a handler for dragging its pin), or null once none is selected. */
  onActiveMarkerChange?: (active: ActiveMarker | null) => void;
  /** Whether the Markers accordion itself is expanded; collapsing it also collapses whichever marker set/marker was expanded inside it. */
  sectionExpanded?: boolean;
  /** Whether the currently selected marker's area is being drawn/edited on the map. */
  isEditingMarkerArea?: boolean;
  /** The number of points in the in-progress area draft, for enabling/disabling Save. */
  areaDraftPointCount?: number;
  onStartEditingMarkerArea?: () => void;
  onSaveMarkerArea?: () => void;
  onCancelMarkerArea?: () => void;
  onClearMarkerArea?: () => void;
}

export function MarkersSection({
  storyId,
  onCountChange,
  mapCenter,
  onVisibleMarkersChange,
  onActiveMarkerChange,
  sectionExpanded,
  isEditingMarkerArea,
  areaDraftPointCount,
  onStartEditingMarkerArea,
  onSaveMarkerArea,
  onCancelMarkerArea,
  onClearMarkerArea,
}: MarkersSectionProps) {
  useRenderLoopWatchdog('MarkersSection');

  // This section lazy-mounts (its SidebarSection unmounts it on every
  // collapse, not just the first time), which is new: every other sidebar
  // section stays mounted for the app's whole lifetime once first rendered.
  // Without this, a marker set left toggled "visible on map" (or a marker
  // left selected) when the section collapses would leave its pins stuck
  // showing with no way to turn them off, since the component reporting
  // them would simply be gone. Runs only on unmount (empty deps): the
  // props are stable setState functions from EditScreen, not meant to
  // retrigger this on every render.
  useEffect(() => {
    return () => {
      onVisibleMarkersChange?.(null);
      onActiveMarkerChange?.(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [markersByMarkerSetId, setMarkersByMarkerSetId] = useState<Record<number, Marker[]>>({});
  const [visibleMarkerSetIds, setVisibleMarkerSetIds] = useState<Set<number>>(new Set());
  const [expandedMarkerId, setExpandedMarkerId] = useState<number | null>(null);
  const [expandedMarkerSetId, setExpandedMarkerSetId] = useState<number | null>(null);
  const { chapterOptions, episodeOptions, hasBooks, hasSeasons } = useRangeOptions(storyId);
  // Read via handleAddMarker (a stable useCallback) instead of closing over
  // the mapCenter prop directly, so panning the map — which changes
  // mapCenter independently of anything about the markers themselves —
  // doesn't hand every MarkerSetItem a new onAddMarker identity.
  const mapCenterRef = useRef(mapCenter);
  mapCenterRef.current = mapCenter;

  const load = useCallback(async (storyId: number, isCancelled: () => boolean) => {
    const loadedMarkerSets = await listMarkerSetsForStory(storyId);
    /* v8 ignore next -- load() only starts after the first paint (see useExpandableEntityList), and listMarkerSetsForStory then resolves within the same task, so unmounting inside this window isn't reliably reproducible; the hook's own cancelled check before load() covers the common case. */
    if (isCancelled()) return loadedMarkerSets;
    const markerLists = await Promise.all(
      loadedMarkerSets.map((markerSet) => listMarkersForMarkerSet(markerSet.id)),
    );
    /* v8 ignore next -- exercising this specific unmount window (after listMarkerSetsForStory resolves but before the marker Promise.all does) is too timing-dependent to test reliably; the outer isCancelled() check above covers the same defensive purpose. */
    if (isCancelled()) return loadedMarkerSets;

    const markerMap: Record<number, Marker[]> = {};
    loadedMarkerSets.forEach((markerSet, index) => {
      markerMap[markerSet.id] = markerLists[index];
    });
    setMarkersByMarkerSetId(markerMap);
    return loadedMarkerSets;
  }, []);

  const onReset = useCallback(() => {
    setMarkersByMarkerSetId({});
    setVisibleMarkerSetIds(new Set());
    setExpandedMarkerId(null);
    setExpandedMarkerSetId(null);
  }, []);

  // useExpandableEntityList already collapses the marker *set* accordion
  // (its own expandedId) when the outer Markers section collapses, but
  // expandedMarkerId/expandedMarkerSetId are a second level of expansion
  // nested inside that, tracked separately here — collapsing the section
  // wouldn't otherwise clear them, leaving the active marker's draggable
  // pin on the map with no visible sidebar row to explain it. Adjusted
  // directly during render (React's documented pattern for this — see
  // https://react.dev/learn/you-might-not-need-an-effect) rather than in a
  // useEffect: sectionExpanded is already known synchronously, and this
  // condition is false again as soon as the clear itself takes effect, so
  // it can't loop.
  if (sectionExpanded === false && (expandedMarkerId !== null || expandedMarkerSetId !== null)) {
    setExpandedMarkerId(null);
    setExpandedMarkerSetId(null);
  }

  const {
    entities: markerSets,
    expandedId: expandedMarkerSetIdFromList,
    toggle,
    addEntity,
    updateEntity,
    removeEntity,
  } = useExpandableEntityList<MarkerSet>({
    storyId,
    load,
    onReset,
    sectionExpanded,
  });

  useEffect(() => {
    if (markerSets === null) return;
    const total = markerSets.reduce(
      /* v8 ignore next -- load() populates markersByMarkerSetId for every id in markerSets in the same state update, so the `?? 0` fallback is never actually reached. */
      (sum, markerSet) => sum + (markersByMarkerSetId[markerSet.id]?.length ?? 0),
      0,
    );
    onCountChange?.(total);
  }, [markerSets, markersByMarkerSetId, onCountChange]);

  // Applies an update to the currently selected marker, both locally and to
  // the database. Stable except when the selection itself changes, so it
  // doesn't retrigger the pins effect below on every unrelated render.
  const updateExpandedMarker = useCallback(
    (apply: (marker: Marker) => Marker) => {
      /* v8 ignore next -- this is only ever called via onDrag/onAreaSave, which the pins effect below only hands out (as part of the ActiveMarker bundle) once expandedMarkerId/expandedMarkerSetId are both non-null and name an existing marker — so this guard never actually trips. */
      if (expandedMarkerId === null || expandedMarkerSetId === null) return;
      setMarkersByMarkerSetId((previous) => {
        /* v8 ignore next -- expandedMarkerSetId always names a set already present here, for the same reason as above. */
        const markers = previous[expandedMarkerSetId] ?? [];
        const marker = markers.find((candidate) => candidate.id === expandedMarkerId);
        /* v8 ignore next -- same guarantee as above: the marker named by expandedMarkerId always exists in this array by the time onDrag/onAreaSave can be called. */
        if (!marker) return previous;
        const updated = apply(marker);
        updateMarker(updated.id, {
          markerSetId: updated.markerSetId,
          label: updated.label,
          icon: updated.icon,
          url: updated.url,
          color: updated.color,
          large: updated.large,
          position: updated.position,
          polygon: updated.polygon,
          chapterRange: updated.chapterRange,
          episodeRange: updated.episodeRange,
        });
        return {
          ...previous,
          [expandedMarkerSetId]: markers.map((candidate) =>
            candidate.id === expandedMarkerId ? updated : candidate,
          ),
        };
      });
    },
    [expandedMarkerId, expandedMarkerSetId],
  );

  // Handles a drag on the currently selected marker's map pin.
  const handleMarkerDrag = useCallback(
    (position: LatLng) => updateExpandedMarker((marker) => ({ ...marker, position })),
    [updateExpandedMarker],
  );

  // Saves the currently selected marker's area; fewer than 3 points is
  // treated as no area at all (a polygon needs at least a triangle).
  const handleAreaSave = useCallback(
    (polygon: LatLng[] | null) =>
      updateExpandedMarker((marker) => ({
        ...marker,
        polygon: polygon && polygon.length >= 3 ? polygon : null,
      })),
    [updateExpandedMarker],
  );

  useEffect(() => {
    const pins: MarkerMapPin[] = [];
    (markerSets ?? []).forEach((markerSet) => {
      if (!visibleMarkerSetIds.has(markerSet.id)) return;
      /* v8 ignore next -- every visible markerSet has a loaded markers array by this point (see the load() comment above), so this fallback is never reached. */
      (markersByMarkerSetId[markerSet.id] ?? []).forEach((marker) => {
        if (marker.id === expandedMarkerId) return;
        pins.push({ marker, noIcons: markerSet.noIcons });
      });
    });
    onVisibleMarkersChange?.(pins.length > 0 ? pins : null);

    if (expandedMarkerId !== null && expandedMarkerSetId !== null) {
      /* v8 ignore next -- expandedMarkerSetId always names a loaded set, for the same reason as above. */
      const marker = (markersByMarkerSetId[expandedMarkerSetId] ?? []).find(
        (candidate) => candidate.id === expandedMarkerId,
      );
      const markerSet = markerSets?.find((candidate) => candidate.id === expandedMarkerSetId);
      onActiveMarkerChange?.(
        /* v8 ignore next -- expandedMarkerId/expandedMarkerSetId are only ever set (via handleMarkerToggle) to an id pair that names a real, already-loaded marker and set, so `marker`/`markerSet` are never both falsy here. */
        marker && markerSet
          ? {
              marker,
              noIcons: markerSet.noIcons,
              onDrag: handleMarkerDrag,
              onAreaSave: handleAreaSave,
            }
          : null,
      );
    } else {
      onActiveMarkerChange?.(null);
    }
  }, [
    markerSets,
    markersByMarkerSetId,
    visibleMarkerSetIds,
    expandedMarkerId,
    expandedMarkerSetId,
    handleMarkerDrag,
    handleAreaSave,
    onVisibleMarkersChange,
    onActiveMarkerChange,
  ]);

  // All of the handlers below are wrapped in useCallback (with the id of
  // whichever marker set/marker they act on threaded through as a call-time
  // argument, rather than curried per-item at the JSX .map() below) so that
  // MarkerSetItem/MarkerItem — memoized, see those files — can actually
  // skip re-rendering the other (unaffected) markers/sets whenever one of
  // them changes, instead of every list item getting fresh callback props
  // (and so re-rendering) on every keystroke into any single one's fields.

  const handleSetToggle = useCallback(
    (setId: number, event: SyntheticEvent, isExpanded: boolean) => {
      toggle(setId)(event, isExpanded);
      setExpandedMarkerId(null);
      setExpandedMarkerSetId(null);
    },
    [toggle],
  );

  const handleMarkerToggle = useCallback(
    (setId: number, markerId: number, _event: SyntheticEvent, isExpanded: boolean) => {
      setExpandedMarkerId(isExpanded ? markerId : null);
      setExpandedMarkerSetId(isExpanded ? setId : null);
    },
    [],
  );

  const handleToggleVisible = useCallback((setId: number) => {
    setVisibleMarkerSetIds((previous) => {
      const next = new Set(previous);
      if (next.has(setId)) {
        next.delete(setId);
      } else {
        next.add(setId);
      }
      return next;
    });
  }, []);

  // Only reachable once marker sets have loaded: the Loading/Add UI below
  // only renders handleAddMarkerSet's callers after the
  // `markerSets === null` early return.
  const handleAddMarkerSet = useCallback(async () => {
    const markerSet = await createMarkerSet({ storyId, name: '', noIcons: false });
    track('marker_set_added');
    addEntity(markerSet);
    setMarkersByMarkerSetId((previous) => ({ ...previous, [markerSet.id]: [] }));
  }, [storyId, addEntity]);

  const handleDeleteMarkerSet = useCallback(
    async (setId: number) => {
      await deleteMarkerSet(setId);
      removeEntity(setId);
      setMarkersByMarkerSetId((previous) => {
        const { [setId]: _removed, ...rest } = previous;
        return rest;
      });
      setVisibleMarkerSetIds((previous) => {
        if (!previous.has(setId)) return previous;
        const next = new Set(previous);
        next.delete(setId);
        return next;
      });
      if (expandedMarkerSetId === setId) {
        setExpandedMarkerId(null);
        setExpandedMarkerSetId(null);
      }
    },
    [removeEntity, expandedMarkerSetId],
  );

  const handleAddMarker = useCallback(async (setId: number) => {
    const marker = await createMarker({
      markerSetId: setId,
      label: '',
      icon: null,
      url: null,
      color: null,
      large: false,
      position: mapCenterRef.current ?? { lat: 0, lng: 0 },
      polygon: null,
      chapterRange: null,
      episodeRange: null,
    });
    setMarkersByMarkerSetId((previous) => ({
      ...previous,
      /* v8 ignore next -- setId always has an entry (created alongside its marker set, see handleAddMarkerSet) by the time a marker can be added to it. */
      [setId]: [...(previous[setId] ?? []), marker],
    }));
    track('marker_added');
    setExpandedMarkerId(marker.id);
    setExpandedMarkerSetId(setId);
  }, []);

  const handleDeleteMarker = useCallback(
    async (setId: number, markerId: number) => {
      await deleteMarker(markerId);
      setMarkersByMarkerSetId((previous) => ({
        ...previous,
        /* v8 ignore next -- setId always has an entry by the time one of its markers can be deleted. */
        [setId]: (previous[setId] ?? []).filter((marker) => marker.id !== markerId),
      }));
      if (expandedMarkerId === markerId) {
        setExpandedMarkerId(null);
        setExpandedMarkerSetId(null);
      }
    },
    [expandedMarkerId],
  );

  const handleMarkerChange = useCallback((setId: number, marker: Marker) => {
    setMarkersByMarkerSetId((previous) => ({
      ...previous,
      /* v8 ignore next -- setId always has an entry by the time one of its markers can be edited. */
      [setId]: (previous[setId] ?? []).map((candidate) =>
        candidate.id === marker.id ? marker : candidate,
      ),
    }));
  }, []);

  if (markerSets === null) {
    return <SectionLoading>Loading markers…</SectionLoading>;
  }

  return (
    <Stack spacing={1}>
      {markerSets.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No markers yet.
        </Typography>
      )}

      {markerSets.map((markerSet) => (
        <MarkerSetItem
          key={markerSet.id}
          markerSet={markerSet}
          /* v8 ignore next -- every markerSet reaching this render has a loaded entry (see the load() comment above), so this fallback is never reached. */
          markers={markersByMarkerSetId[markerSet.id] ?? []}
          expanded={expandedMarkerSetIdFromList === markerSet.id}
          onToggle={handleSetToggle}
          visible={visibleMarkerSetIds.has(markerSet.id)}
          onToggleVisible={handleToggleVisible}
          onMarkerSetChange={updateEntity}
          onDelete={handleDeleteMarkerSet}
          expandedMarkerId={expandedMarkerSetId === markerSet.id ? expandedMarkerId : null}
          onMarkerToggle={handleMarkerToggle}
          onMarkerChange={handleMarkerChange}
          onAddMarker={handleAddMarker}
          onDeleteMarker={handleDeleteMarker}
          chapterOptions={chapterOptions}
          episodeOptions={episodeOptions}
          hasBooks={hasBooks}
          hasSeasons={hasSeasons}
          isEditingMarkerArea={isEditingMarkerArea}
          areaDraftPointCount={areaDraftPointCount}
          onStartEditingMarkerArea={onStartEditingMarkerArea}
          onSaveMarkerArea={onSaveMarkerArea}
          onCancelMarkerArea={onCancelMarkerArea}
          onClearMarkerArea={onClearMarkerArea}
        />
      ))}

      <Button size="small" startIcon={<AddIcon fontSize="small" />} onClick={handleAddMarkerSet}>
        Add Collection
      </Button>
    </Stack>
  );
}
