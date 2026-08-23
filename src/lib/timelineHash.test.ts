import { describe, expect, it } from 'vitest';
import { parseTimelineHash } from './timelineHash';

describe('parseTimelineHash', () => {
  it('parses a #chapter-N fragment into book mode', () => {
    expect(parseTimelineHash('#chapter-20')).toEqual({ mode: 'book', index: 20 });
  });

  it('parses a #episode-N fragment into tv mode', () => {
    expect(parseTimelineHash('#episode-3')).toEqual({ mode: 'tv', index: 3 });
  });

  it('is case-insensitive', () => {
    expect(parseTimelineHash('#Chapter-5')).toEqual({ mode: 'book', index: 5 });
    expect(parseTimelineHash('#EPISODE-5')).toEqual({ mode: 'tv', index: 5 });
  });

  it('returns null for an empty hash', () => {
    expect(parseTimelineHash('')).toBeNull();
  });

  it('returns null for an unrelated hash', () => {
    expect(parseTimelineHash('#books-2')).toBeNull();
  });

  it('returns null for a fragment missing its index', () => {
    expect(parseTimelineHash('#chapter')).toBeNull();
    expect(parseTimelineHash('#chapter-')).toBeNull();
  });

  it('returns null for a zero index', () => {
    expect(parseTimelineHash('#chapter-0')).toBeNull();
  });
});
