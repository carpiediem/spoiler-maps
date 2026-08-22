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
});
