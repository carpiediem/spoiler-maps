import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { resetDatabaseForTests } from './db/client';

async function deleteStoredDatabase(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('spoiler-maps');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

beforeEach(() => {
  resetDatabaseForTests();
});

afterEach(async () => {
  resetDatabaseForTests();
  await deleteStoredDatabase();
});

describe('App routes', () => {
  it('redirects / to /edit', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: /new map/i })).toBeInTheDocument();
  });

  it('redirects /?d=<url> to /view?d=<url> instead of /edit', async () => {
    render(
      <MemoryRouter initialEntries={['/?d=https://example.com/story.yaml']}>
        <App />
      </MemoryRouter>,
    );

    // The view screen starts loading the given URL (rather than the edit
    // screen's "New Map" default), proving the redirect landed on /view
    // with the query string preserved.
    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /new map/i })).not.toBeInTheDocument();
  });

  it('renders the editor at /edit', async () => {
    render(
      <MemoryRouter initialEntries={['/edit']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: /new map/i })).toBeInTheDocument();
  });

  it('renders the view screen at /view, with no map specified', async () => {
    render(
      <MemoryRouter initialEntries={['/view']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/no map specified/i)).toBeInTheDocument();
  });

  it('has exactly one main landmark once / redirects to /edit', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: /new map/i })).toBeInTheDocument();
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });

  it('has exactly one main landmark at /view with no map specified (error state)', async () => {
    render(
      <MemoryRouter initialEntries={['/view']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/no map specified/i)).toBeInTheDocument();
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });
});
