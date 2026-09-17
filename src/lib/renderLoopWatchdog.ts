import { useLayoutEffect, useRef } from 'react';

// Above this many renders within RESET_WINDOW_MS, a component is almost
// certainly stuck in a render loop (an effect whose dependency is a new
// object/array/function reference every render, re-triggering itself)
// rather than legitimately re-rendering that often.
const LOOP_THRESHOLD = 50;
const RESET_WINDOW_MS = 1000;

/**
 * Diagnostic only: call at the top of a component's body. Uses a layout
 * effect (not a passive useEffect) so it still fires on every one of a
 * loop's rapid renders — a passive effect can be starved indefinitely while
 * a synchronous render loop keeps committing. Logs once, loudly, the first
 * time a component renders LOOP_THRESHOLD+ times within RESET_WINDOW_MS.
 */
export function useRenderLoopWatchdog(componentName: string): void {
  const countRef = useRef(0);
  const windowStartRef = useRef(0);
  const hasWarnedRef = useRef(false);

  useLayoutEffect(() => {
    const now = Date.now();
    if (now - windowStartRef.current > RESET_WINDOW_MS) {
      windowStartRef.current = now;
      countRef.current = 0;
      hasWarnedRef.current = false;
    }
    countRef.current += 1;

    if (countRef.current === LOOP_THRESHOLD && !hasWarnedRef.current) {
      hasWarnedRef.current = true;
      // eslint-disable-next-line no-console
      console.error(
        `[renderLoopWatchdog] ${componentName} has rendered ${LOOP_THRESHOLD}+ times in under a second — this is almost certainly an infinite render loop, not legitimate re-rendering. Check useEffect dependencies for a new object/array/function created fresh every render.`,
      );
    }
  });
}
