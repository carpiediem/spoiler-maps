/**
 * Fractional indexing helpers for the `sort_order` columns used to order
 * books/chapters/tv_seasons/episodes within their parent. Reordering an
 * item only ever touches that item's own row, since its new sort order is
 * computed from its neighbors rather than by renumbering siblings.
 */

/** The sort order for a new item appended to the end of a list. */
export function sortOrderAfter(existingSortOrders: number[]): number {
  return existingSortOrders.length === 0 ? 0 : Math.max(...existingSortOrders) + 1;
}

/**
 * The sort order for a new item inserted between two adjacent items. Pass
 * null for `before`/`after` when inserting at the very start/end of a list.
 */
export function sortOrderBetween(before: number | null, after: number | null): number {
  if (before === null && after === null) {
    return 0;
  }
  if (before === null) {
    return after! - 1;
  }
  if (after === null) {
    return before + 1;
  }
  return (before + after) / 2;
}
