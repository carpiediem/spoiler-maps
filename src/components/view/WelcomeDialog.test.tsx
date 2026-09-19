import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WelcomeDialog } from './WelcomeDialog';

describe('WelcomeDialog', () => {
  it('is hidden when not open', () => {
    render(<WelcomeDialog open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the explainer text when open', async () => {
    render(<WelcomeDialog open onClose={vi.fn()} />);
    // The autofocused button starts a focus ripple; let that land inside act().
    await act(async () => {});
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/show spoilers through/i)).toBeInTheDocument();
    expect(screen.getByText(/character paths/i)).toBeInTheDocument();
  });

  it('calls onClose when dismissed', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<WelcomeDialog open onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: /got it/i }));

    expect(onClose).toHaveBeenCalled();
  });
});
