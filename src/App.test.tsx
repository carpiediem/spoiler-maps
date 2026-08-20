import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the map and sidebar, and applies a new tile source', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    expect(container.querySelector('.leaflet-container')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /tile source/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/tile url template/i), {
      target: { value: 'https://tile.example.com/{z}/{x}/{y}.png' },
    });
    await user.click(screen.getByRole('button', { name: /apply/i }));

    expect(container.querySelector('.leaflet-container')).toBeInTheDocument();
  });
});
