/**
 * Resolves once the browser has had a chance to paint. Effects that run in
 * response to a click are flushed synchronously, before that paint, so any
 * heavy synchronous work started from one (like a sql.js query) delays the
 * UI update the click caused. Awaiting this first lets the UI update
 * (e.g. an accordion opening with its loading state) show up before the
 * work begins.
 */
export function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => setTimeout(resolve, 0));
  });
}
