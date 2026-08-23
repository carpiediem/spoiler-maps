const STORAGE_KEY = 'spoiler-maps:last-viewed-story-id';

/** The id of the last story selected in the editor, or null if none is remembered (or it isn't a valid id). */
export function getLastViewedStoryId(): number | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Remembers `storyId` as the last one selected in the editor, so a bare /edit visit returns to it. */
export function setLastViewedStoryId(storyId: number): void {
  localStorage.setItem(STORAGE_KEY, String(storyId));
}
