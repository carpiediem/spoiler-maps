import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TileSourceSidebar } from './TileSourceSidebar';

describe('TileSourceSidebar', () => {
  it('calls onApply with a valid tile URL template', async () => {
    const onApply = vi.fn();
    const user = userEvent.setup();
    render(<TileSourceSidebar onApply={onApply} />);

    fireEvent.change(screen.getByLabelText(/tile url template/i), {
      target: { value: 'https://tile.example.com/{z}/{x}/{y}.png' },
    });
    await user.click(screen.getByRole('button', { name: /apply/i }));

    expect(onApply).toHaveBeenCalledWith('https://tile.example.com/{z}/{x}/{y}.png');
  });

  it('extrapolates a {q} template from a real example tile URL', async () => {
    const onApply = vi.fn();
    const user = userEvent.setup();
    render(<TileSourceSidebar onApply={onApply} />);

    fireEvent.change(screen.getByLabelText(/tile url template/i), {
      target: { value: 'https://carpiediem.github.io/game-of-thrones-map/fsm/tqtqr.jpg' },
    });
    await user.click(screen.getByRole('button', { name: /apply/i }));

    expect(onApply).toHaveBeenCalledWith(
      'https://carpiediem.github.io/game-of-thrones-map/fsm/{q}.jpg',
    );
  });

  it('shows an error and does not call onApply for an invalid URL', async () => {
    const onApply = vi.fn();
    const user = userEvent.setup();
    render(<TileSourceSidebar onApply={onApply} />);

    await user.type(screen.getByLabelText(/tile url template/i), 'not-a-valid-url');
    await user.click(screen.getByRole('button', { name: /apply/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();
  });
});
