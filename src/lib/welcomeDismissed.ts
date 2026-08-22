const STORAGE_KEY = 'spoiler-maps:view-welcome-dismissed';

/** Whether this browser has already dismissed the view screen's welcome dialog. */
export function isWelcomeDismissed(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

/** Remembers that this browser has dismissed the view screen's welcome dialog. */
export function setWelcomeDismissed(): void {
  localStorage.setItem(STORAGE_KEY, 'true');
}
