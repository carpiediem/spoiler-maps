/**
 * Fetches a story's YAML from an external URL (a `?d=` share link), throwing
 * a user-facing error for a non-2xx response. Pass a signal to cancel the
 * request, e.g. when the component that started it unmounts.
 */
export async function fetchStoryYaml(url: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Could not load this map: the server responded with ${response.status}.`);
  }
  return response.text();
}
