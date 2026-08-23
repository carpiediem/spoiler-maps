import type { Polyline as LeafletPolyline } from 'leaflet';
import { describe, expect, it, vi } from 'vitest';
import { attachTailFlowClass } from './tailFlowClass';

describe('attachTailFlowClass', () => {
  it('does nothing for a null instance', () => {
    expect(() => attachTailFlowClass(null)).not.toThrow();
  });

  it('adds the class immediately when the element already exists', () => {
    const element = document.createElement('div');
    const instance = {
      getElement: () => element,
      on: vi.fn(),
    } as unknown as LeafletPolyline;

    attachTailFlowClass(instance);

    expect(element.classList.contains('character-tail-flow')).toBe(true);
  });

  it('does nothing yet if the element doesn’t exist when first called', () => {
    const instance = {
      getElement: () => undefined,
      on: vi.fn(),
    } as unknown as LeafletPolyline;

    expect(() => attachTailFlowClass(instance)).not.toThrow();
  });

  it('registers a persistent "add" listener (not once), re-applying the class every time Leaflet fires it', () => {
    let element = document.createElement('div');
    let addCallback: (() => void) | undefined;
    const instance = {
      getElement: () => element,
      on: vi.fn((event: string, callback: () => void) => {
        expect(event).toBe('add');
        addCallback = callback;
      }),
    } as unknown as LeafletPolyline;

    attachTailFlowClass(instance);
    expect(element.classList.contains('character-tail-flow')).toBe(true);
    expect(instance.on).toHaveBeenCalledTimes(1);

    // Leaflet's Path.onAdd recreates the underlying <path> element from
    // scratch on every add, so a fresh (classless) element stands in here —
    // the listener should reapply the class to it too, not just once.
    element = document.createElement('div');
    addCallback?.();

    expect(element.classList.contains('character-tail-flow')).toBe(true);
  });
});
