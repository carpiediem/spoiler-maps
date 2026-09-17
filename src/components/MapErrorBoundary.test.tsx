import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MapErrorBoundary } from './MapErrorBoundary';

function ThrowingChild(): never {
  throw new Error('Boom');
}

describe('MapErrorBoundary', () => {
  it('renders its children when nothing throws', () => {
    render(
      <MapErrorBoundary>
        <div>All good</div>
      </MapErrorBoundary>,
    );

    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('catches a render error and shows a fallback message instead of a blank screen', () => {
    // Suppresses React's own noisy console.error logging for this expected throw.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <MapErrorBoundary>
        <ThrowingChild />
      </MapErrorBoundary>,
    );

    expect(screen.getByText(/the map failed to render/i)).toBeInTheDocument();
    expect(screen.getByText(/boom/i)).toBeInTheDocument();

    consoleError.mockRestore();
  });
});
