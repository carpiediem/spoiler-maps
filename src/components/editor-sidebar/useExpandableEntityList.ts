import { useEffect, useRef, useState, type SyntheticEvent } from 'react';

interface UseExpandableEntityListOptions<T extends { id: number }> {
  storyId: number;
  /** 1-based index of the entity to auto-expand, e.g. from a URL hash. */
  initialExpandedIndex?: number | null;
  onCountChange?: (count: number) => void;
  /**
   * Loads the list for `storyId`. `isCancelled` reflects whether the
   * story has since changed or the component has unmounted — check it
   * before any state set that isn't the returned entities themselves
   * (e.g. a related children map), since the hook only guards its own
   * `setEntities` call automatically.
   */
  load: (storyId: number, isCancelled: () => boolean) => Promise<T[]>;
  /** Runs synchronously when a story change resets the list, e.g. to clear other per-story state. */
  onReset?: () => void;
  /**
   * Whether the list's own parent accordion (e.g. "Characters") is expanded.
   * Collapsing it also collapses whichever entity was expanded inside it.
   */
  sectionExpanded?: boolean;
}

/**
 * Manages the load/expand/add/update/remove shape shared by the sidebar's
 * accordion-style entity lists (books, tv seasons, characters): fetch the
 * list for the current story (cancelling if the story changes or the
 * component unmounts first), track a single expanded entity id, apply an
 * initialExpandedIndex once per story, and report the list's count.
 */
export function useExpandableEntityList<T extends { id: number }>({
  storyId,
  initialExpandedIndex,
  onCountChange,
  load,
  onReset,
  sectionExpanded,
}: UseExpandableEntityListOptions<T>) {
  const [entities, setEntities] = useState<T[] | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const appliedInitialIndexRef = useRef(false);

  useEffect(() => {
    if (entities !== null) onCountChange?.(entities.length);
  }, [entities, onCountChange]);

  useEffect(() => {
    let cancelled = false;

    function resetForNewStory() {
      setEntities(null);
      setExpandedId(null);
      appliedInitialIndexRef.current = false;
      onReset?.();
    }
    resetForNewStory();

    load(storyId, () => cancelled).then((loaded) => {
      if (cancelled) return;
      setEntities(loaded);
    });

    return () => {
      cancelled = true;
    };
    // Deliberately keyed only on storyId: load/onReset are expected to be
    // stable per caller (wrapped in useCallback), and this effect must run
    // exactly once per story change, not on their identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

  useEffect(() => {
    function applyInitialExpandedIndex() {
      if (entities === null || appliedInitialIndexRef.current) return;
      appliedInitialIndexRef.current = true;
      const target = initialExpandedIndex ? entities[initialExpandedIndex - 1] : undefined;
      if (target) setExpandedId(target.id);
    }
    applyInitialExpandedIndex();
  }, [entities, initialExpandedIndex]);

  useEffect(() => {
    if (sectionExpanded === false) setExpandedId(null);
  }, [sectionExpanded]);

  function toggle(id: number) {
    return (_event: SyntheticEvent, isExpanded: boolean) => {
      setExpandedId(isExpanded ? id : null);
    };
  }

  function addEntity(entity: T) {
    setEntities((previous) => [...previous!, entity]);
    setExpandedId(entity.id);
  }

  function updateEntity(updated: T) {
    setEntities((previous) =>
      previous!.map((entity) => (entity.id === updated.id ? updated : entity)),
    );
  }

  function removeEntity(id: number) {
    setEntities((previous) => previous!.filter((entity) => entity.id !== id));
    setExpandedId(null);
  }

  return { entities, setEntities, expandedId, toggle, addEntity, updateEntity, removeEntity };
}
