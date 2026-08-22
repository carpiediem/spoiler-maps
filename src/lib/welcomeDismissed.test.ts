import { afterEach, describe, expect, it } from 'vitest';
import { isWelcomeDismissed, setWelcomeDismissed } from './welcomeDismissed';

afterEach(() => {
  localStorage.clear();
});

describe('welcomeDismissed', () => {
  it('is not dismissed by default', () => {
    expect(isWelcomeDismissed()).toBe(false);
  });

  it('is dismissed after being set', () => {
    setWelcomeDismissed();
    expect(isWelcomeDismissed()).toBe(true);
  });
});
