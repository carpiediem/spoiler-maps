import AddIcon from '@mui/icons-material/Add';
import { Button, Stack, Typography } from '@mui/material';
import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';
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
import { useRangeOptions } from './characters/rangeOptions';
import { MarkerSetItem } from './markers/MarkerSetItem';
import { useExpandableEntityList } from './useExpandableEntityList';

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
  const [markersByMarkerSetId, setMarkersByMarkerSetId] = useState<Record<number, Marker[]>>({});
  const [visibleMarkerSetIds, setVisibleMarkerSetIds] = useState<Set<number>>(new Set());
  const [expandedMarkerId, setExpandedMarkerId] = useState<number | null>(null);
  const [expandedMarkerSetId, setExpandedMarkerSetId] = useState<number | null>(null);
  const { chapterOptions, episodeOptions, hasBooks, hasSeasons } = useRangeOptions(storyId);

  const load = useCallback(async (storyId: number, isCancelled: () => boolean) => {
    const loadedMarkerSets = await listMarkerSetsForStory(storyId);
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

  function handleSetToggle(setId: number) {
    return (event: SyntheticEvent, isExpanded: boolean) => {
      toggle(setId)(event, isExpanded);
      setExpandedMarkerId(null);
      setExpandedMarkerSetId(null);
    };
  }

  function handleMarkerToggle(setId: number, markerId: number) {
    return (_event: SyntheticEvent, isExpanded: boolean) => {
      setExpandedMarkerId(isExpanded ? markerId : null);
      setExpandedMarkerSetId(isExpanded ? setId : null);
    };
  }

  function handleToggleVisible(setId: number) {
    setVisibleMarkerSetIds((previous) => {
      const next = new Set(previous);
      if (next.has(setId)) {
        next.delete(setId);
      } else {
        next.add(setId);
      }
      return next;
    });
  }

  // Only reachable once marker sets have loaded: the Loading/Add UI below
  // only renders handleAddMarkerSet's callers after the
  // `markerSets === null` early return.
  async function handleAddMarkerSet() {
    const markerSet = await createMarkerSet({ storyId, name: '', noIcons: false });
    addEntity(markerSet);
    setMarkersByMarkerSetId((previous) => ({ ...previous, [markerSet.id]: [] }));
  }

  async function handleDeleteMarkerSet(setId: number) {
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
  }

  async function handleAddMarker(setId: number) {
    const marker = await createMarker({
      markerSetId: setId,
      label: '',
      icon: null,
      url: null,
      color: null,
      large: false,
      position: mapCenter ?? { lat: 0, lng: 0 },
      polygon: null,
      chapterRange: null,
      episodeRange: null,
    });
    setMarkersByMarkerSetId((previous) => ({
      ...previous,
      /* v8 ignore next -- setId always has an entry (created alongside its marker set, see handleAddMarkerSet) by the time a marker can be added to it. */
      [setId]: [...(previous[setId] ?? []), marker],
    }));
    setExpandedMarkerId(marker.id);
    setExpandedMarkerSetId(setId);
  }

  async function handleDeleteMarker(setId: number, markerId: number) {
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
  }

  function handleMarkerChange(setId: number, marker: Marker) {
    setMarkersByMarkerSetId((previous) => ({
      ...previous,
      /* v8 ignore next -- setId always has an entry by the time one of its markers can be edited. */
      [setId]: (previous[setId] ?? []).map((candidate) =>
        candidate.id === marker.id ? marker : candidate,
      ),
    }));
  }

  if (markerSets === null) {
    return (
      <Typography variant="body2" color="text.secondary">
        Loading markers…
      </Typography>
    );
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
          onToggle={handleSetToggle(markerSet.id)}
          visible={visibleMarkerSetIds.has(markerSet.id)}
          onToggleVisible={() => handleToggleVisible(markerSet.id)}
          onMarkerSetChange={updateEntity}
          onDelete={() => handleDeleteMarkerSet(markerSet.id)}
          expandedMarkerId={expandedMarkerSetId === markerSet.id ? expandedMarkerId : null}
          onMarkerToggle={(markerId) => handleMarkerToggle(markerSet.id, markerId)}
          onMarkerChange={(marker) => handleMarkerChange(markerSet.id, marker)}
          onAddMarker={() => handleAddMarker(markerSet.id)}
          onDeleteMarker={(markerId) => handleDeleteMarker(markerSet.id, markerId)}
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
