import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useRenderLoopWatchdog } from './renderLoopWatchdog';

describe('useRenderLoopWatchdog', () => {
  it('does not warn for a handful of renders', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = renderHook(() => useRenderLoopWatchdog('Test'));

    for (let i = 0; i < 10; i++) rerender();

    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it('warns exactly once after 50+ renders within a second, naming the component', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = renderHook(() => useRenderLoopWatchdog('SuspiciousComponent'));

    for (let i = 0; i < 60; i++) rerender();

    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('SuspiciousComponent'));
    error.mockRestore();
  });

  it('resets the count after the window elapses, instead of warning forever', () => {
    vi.useFakeTimers();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = renderHook(() => useRenderLoopWatchdog('Test'));

    for (let i = 0; i < 60; i++) rerender();
    expect(error).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2000);
    for (let i = 0; i < 10; i++) rerender();
    expect(error).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
    error.mockRestore();
  });
});
