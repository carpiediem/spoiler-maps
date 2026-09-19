import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextPaint } from './nextPaint';

describe('nextPaint', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'setTimeout'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves only after an animation frame and a following timeout', async () => {
    const resolved = vi.fn();
    nextPaint().then(resolved);

    await vi.advanceTimersByTimeAsync(0);
    expect(resolved).not.toHaveBeenCalled();

    // The frame has run, but its follow-up timeout hasn't yet.
    vi.advanceTimersToNextFrame();
    await Promise.resolve();
    expect(resolved).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(resolved).toHaveBeenCalledTimes(1);
  });
});
