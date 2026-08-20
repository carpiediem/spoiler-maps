import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MapView } from './MapView';

describe('MapView', () => {
  it('renders the default xyz tile layer when no tileUrl is set', () => {
    const { container } = render(<MapView tileUrl={null} />);
    expect(container.querySelector('.leaflet-container')).toBeInTheDocument();
  });

  it('renders an xyz tile layer for a custom {x}/{y}/{z} template', () => {
    const { container } = render(<MapView tileUrl="https://tile.example.com/{z}/{x}/{y}.png" />);
    expect(container.querySelector('.leaflet-container')).toBeInTheDocument();
  });

  it('renders the quadkey tile layer for a {q} template', () => {
    const { container } = render(<MapView tileUrl="https://tile.example.com/{q}.jpg" />);
    expect(container.querySelector('.leaflet-container')).toBeInTheDocument();
  });
});
