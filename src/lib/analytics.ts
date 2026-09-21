// Privacy-friendly usage analytics (Umami: cookieless, no personal data).
// Off unless a website ID is configured at build time, and never active in
// development. Only fixed event names are ever sent — never story content —
// and the tracker is told to drop the URL's query string and hash, since a
// `?d=` share link points at someone's story data.

/** Every event the app reports. Names only: no payloads, so nothing about a story leaves the browser. */
export type AnalyticsEvent =
  // Creating and sharing a map
  | 'story_created'
  | 'story_imported'
  | 'share_link_imported'
  | 'story_exported'
  // Building one up
  | 'book_added'
  | 'season_added'
  | 'character_added'
  | 'alias_added'
  | 'position_added'
  | 'marker_set_added'
  | 'marker_added'
  | 'marker_area_saved'
  // Viewing one (timeline_used is the map timeline's slider, keys, or medium toggle)
  | 'share_link_opened'
  | 'welcome_dismissed'
  | 'timeline_used';

interface UmamiTracker {
  track: (event: string) => void;
}

declare global {
  interface Window {
    umami?: UmamiTracker;
  }
}

const DEFAULT_SCRIPT_URL = 'https://cloud.umami.is/script.js';

/** Loads the Umami tracker, if analytics is configured and this is a production build. */
export function initAnalytics(): void {
  const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID;
  if (!websiteId || !import.meta.env.PROD) return;

  const script = document.createElement('script');
  script.defer = true;
  script.src = import.meta.env.VITE_UMAMI_SCRIPT_URL || DEFAULT_SCRIPT_URL;
  script.dataset.websiteId = websiteId;
  // Respect the browser's Do Not Track setting.
  script.dataset.doNotTrack = 'true';
  // A `?d=` share link's URL points at a story's data, so never report it.
  script.dataset.excludeSearch = 'true';
  script.dataset.excludeHash = 'true';
  document.head.appendChild(script);
}

/** Reports an event. A no-op when the tracker isn't loaded, and never throws: analytics must not be able to break the app. */
export function track(event: AnalyticsEvent): void {
  try {
    window.umami?.track(event);
  } catch {
    // Deliberately ignored; see above.
  }
}

const alreadyTracked = new Set<AnalyticsEvent>();

/** Like track(), but only the first time per page load — for events that would otherwise fire continuously, like scrubbing a slider. */
export function trackOnce(event: AnalyticsEvent): void {
  if (alreadyTracked.has(event)) return;
  alreadyTracked.add(event);
  track(event);
}

/** Test-only: forgets which events trackOnce() has already sent, so each test starts fresh. */
export function resetTrackedEventsForTests(): void {
  alreadyTracked.clear();
}
