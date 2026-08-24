import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DescriptionPanel } from './DescriptionPanel';

describe('DescriptionPanel', () => {
  it('shows a placeholder when there is no description yet', () => {
    render(<DescriptionPanel description={null} onSave={vi.fn()} />);
    expect(screen.getByText('No description yet.')).toBeInTheDocument();
  });

  it('shows the description text when set', () => {
    render(<DescriptionPanel description="A tale of ice and fire." onSave={vi.fn()} />);
    expect(screen.getByText('A tale of ice and fire.')).toBeInTheDocument();
  });

  it('opens the rich-text editor dialog when the edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<DescriptionPanel description="Existing" onSave={vi.fn()} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit description' }));

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(screen.getByText('Edit Description')).toBeInTheDocument();
  });
});
