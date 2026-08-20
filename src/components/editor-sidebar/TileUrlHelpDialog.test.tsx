import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TileUrlHelpDialog } from './TileUrlHelpDialog';

describe('TileUrlHelpDialog', () => {
  it('renders nothing when closed', () => {
    render(<TileUrlHelpDialog open={false} onClose={vi.fn()} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the placeholder scheme explanation when open', () => {
    render(<TileUrlHelpDialog open onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent(/\{x\}.*\{y\}.*\{z\}/);
    expect(dialog).toHaveTextContent(/keyhole/i);
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<TileUrlHelpDialog open onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: /close/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when pressing Escape', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<TileUrlHelpDialog open onClose={onClose} />);

    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });

  it('unmounts the dialog once onClose sets open to false', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<TileUrlHelpDialog open onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: /close/i }));
    rerender(<TileUrlHelpDialog open={false} onClose={onClose} />);

    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
  });
});
