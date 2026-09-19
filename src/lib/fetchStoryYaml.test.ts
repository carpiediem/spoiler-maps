import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchStoryYaml } from './fetchStoryYaml';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchStoryYaml', () => {
  it('returns the response body as text', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('name: A Story') }),
    );

    expect(await fetchStoryYaml('https://example.com/story.yaml')).toBe('name: A Story');
  });

  it('passes the URL and abort signal through to fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('') });
    vi.stubGlobal('fetch', fetchMock);
    const { signal } = new AbortController();

    await fetchStoryYaml('https://example.com/story.yaml', signal);

    expect(fetchMock).toHaveBeenCalledWith('https://example.com/story.yaml', { signal });
  });

  it('throws a user-facing error naming the status for a non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    await expect(fetchStoryYaml('https://example.com/missing.yaml')).rejects.toThrow(
      'Could not load this map: the server responded with 404.',
    );
  });

  it('rejects when the request is aborted', async () => {
    // Stands in for a real fetch, which rejects with an AbortError once its signal aborts.
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('', 'AbortError')));
        });
      }),
    );
    const controller = new AbortController();

    const request = fetchStoryYaml('https://example.com/story.yaml', controller.signal);
    controller.abort();

    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
  });
});
