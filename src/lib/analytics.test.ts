import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initAnalytics, resetTrackedEventsForTests, track, trackOnce } from './analytics';

function trackerScript(): HTMLScriptElement | null {
  return document.head.querySelector('script[data-website-id]');
}

afterEach(() => {
  vi.unstubAllEnvs();
  trackerScript()?.remove();
});

describe('initAnalytics', () => {
  it('does nothing without a website ID, even in production', () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_UMAMI_WEBSITE_ID', '');

    initAnalytics();

    expect(trackerScript()).toBeNull();
  });

  it('does nothing outside a production build, even with a website ID', () => {
    vi.stubEnv('PROD', false);
    vi.stubEnv('VITE_UMAMI_WEBSITE_ID', 'site-123');

    initAnalytics();

    expect(trackerScript()).toBeNull();
  });

  it('loads the tracker with privacy options when configured for production', () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_UMAMI_WEBSITE_ID', 'site-123');
    vi.stubEnv('VITE_UMAMI_SCRIPT_URL', '');

    initAnalytics();

    const script = trackerScript()!;
    expect(script.src).toBe('https://cloud.umami.is/script.js');
    expect(script.defer).toBe(true);
    expect(script.dataset.websiteId).toBe('site-123');
    // Honors Do Not Track, and never reports a `?d=` share link's query string or hash.
    expect(script.dataset.doNotTrack).toBe('true');
    expect(script.dataset.excludeSearch).toBe('true');
    expect(script.dataset.excludeHash).toBe('true');
  });

  it('loads the tracker from a custom script URL, e.g. a self-hosted instance', () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_UMAMI_WEBSITE_ID', 'site-123');
    vi.stubEnv('VITE_UMAMI_SCRIPT_URL', 'https://stats.example.com/script.js');

    initAnalytics();

    expect(trackerScript()!.src).toBe('https://stats.example.com/script.js');
  });
});

describe('track', () => {
  it('reports the event to the tracker', () => {
    track('story_created');

    expect(window.umami!.track).toHaveBeenCalledWith('story_created');
  });

  it('does nothing when the tracker is not loaded', () => {
    delete window.umami;

    expect(() => track('story_created')).not.toThrow();
  });

  it('swallows an error from the tracker instead of breaking the app', () => {
    window.umami = {
      track: vi.fn(() => {
        throw new Error('blocked');
      }),
    };

    expect(() => track('story_created')).not.toThrow();
  });
});

describe('trackOnce', () => {
  beforeEach(() => {
    resetTrackedEventsForTests();
  });

  it('reports an event only the first time', () => {
    trackOnce('timeline_used');
    trackOnce('timeline_used');
    trackOnce('timeline_used');

    expect(window.umami!.track).toHaveBeenCalledTimes(1);
  });

  it('tracks different events independently', () => {
    trackOnce('timeline_used');
    trackOnce('welcome_dismissed');

    expect(window.umami!.track).toHaveBeenCalledTimes(2);
  });

  it('can be reset, so each test starts fresh', () => {
    trackOnce('timeline_used');
    resetTrackedEventsForTests();
    trackOnce('timeline_used');

    expect(window.umami!.track).toHaveBeenCalledTimes(2);
  });
});
