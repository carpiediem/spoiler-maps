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
      once: vi.fn(),
    } as unknown as LeafletPolyline;

    attachTailFlowClass(instance);

    expect(element.classList.contains('character-tail-flow')).toBe(true);
    expect(instance.once).not.toHaveBeenCalled();
  });

  it('waits for Leaflet’s own "add" event when the element does not exist yet', () => {
    const element = document.createElement('div');
    let elementReady = false;
    let addCallback: (() => void) | undefined;
    const instance = {
      getElement: () => (elementReady ? element : undefined),
      once: vi.fn((event: string, callback: () => void) => {
        expect(event).toBe('add');
        addCallback = callback;
      }),
    } as unknown as LeafletPolyline;

    attachTailFlowClass(instance);

    expect(element.classList.contains('character-tail-flow')).toBe(false);
    expect(instance.once).toHaveBeenCalledTimes(1);

    elementReady = true;
    addCallback?.();

    expect(element.classList.contains('character-tail-flow')).toBe(true);
  });
});
