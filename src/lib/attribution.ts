function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Combines a tile layer's author and attribution URL into the HTML string
 * Leaflet's TileLayer `attribution` option expects. Returns null unless
 * both are present, since a link needs somewhere to point and a URL alone
 * isn't a readable credit.
 */
export function buildTileAttribution(
  author: string | null,
  attributionUrl: string | null,
): string | null {
  const trimmedAuthor = author?.trim();
  const trimmedUrl = attributionUrl?.trim();
  if (!trimmedAuthor || !trimmedUrl) return null;

  return `<a href="${escapeHtml(trimmedUrl)}">${escapeHtml(trimmedAuthor)}</a>`;
}
