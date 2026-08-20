import { describe, expect, it } from 'vitest';
import { sortOrderAfter, sortOrderBetween } from './ordering';

describe('sortOrderAfter', () => {
  it('starts an empty list at 0', () => {
    expect(sortOrderAfter([])).toBe(0);
  });

  it('appends after the largest existing sort order', () => {
    expect(sortOrderAfter([0, 2, 1])).toBe(3);
  });
});

describe('sortOrderBetween', () => {
  it('starts an empty list at 0', () => {
    expect(sortOrderBetween(null, null)).toBe(0);
  });

  it('inserts before the first item', () => {
    expect(sortOrderBetween(null, 5)).toBe(4);
  });

  it('inserts after the last item', () => {
    expect(sortOrderBetween(5, null)).toBe(6);
  });

  it('inserts at the midpoint between two items', () => {
    expect(sortOrderBetween(1, 2)).toBe(1.5);
  });
});
