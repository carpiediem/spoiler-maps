import { afterEach, describe, expect, it } from 'vitest';
import { getLastViewedStoryId, setLastViewedStoryId } from './lastViewedStory';

afterEach(() => {
  localStorage.clear();
});

describe('lastViewedStory', () => {
  it('returns null when nothing has been remembered', () => {
    expect(getLastViewedStoryId()).toBeNull();
  });

  it('remembers and returns a set story id', () => {
    setLastViewedStoryId(42);
    expect(getLastViewedStoryId()).toBe(42);
  });

  it('returns null for a corrupted (non-numeric) stored value', () => {
    localStorage.setItem('spoiler-maps:last-viewed-story-id', 'not-a-number');
    expect(getLastViewedStoryId()).toBeNull();
  });
});
