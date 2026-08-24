import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DescriptionEditorDialog } from './DescriptionEditorDialog';

describe('DescriptionEditorDialog', () => {
  it('renders the existing description and saves the edited markdown', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <DescriptionEditorDialog
        open
        onClose={onClose}
        description="Existing text."
        onSave={onSave}
      />,
    );

    await waitFor(() => expect(screen.getByText('Existing text.')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Existing text.'));
    expect(onClose).toHaveBeenCalled();
  });

  it('runs each toolbar button (Bold, Italic, Bulleted list, Numbered list, Quote) without error', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(<DescriptionEditorDialog open onClose={vi.fn()} description={null} onSave={onSave} />);

    await waitFor(() => expect(document.querySelector('.ProseMirror')).toBeInTheDocument());

    for (const label of ['Bold', 'Italic', 'Bulleted list', 'Numbered list', 'Quote']) {
      await user.click(screen.getByRole('button', { name: label }));
    }

    // Still usable afterward — toggling formatting commands didn't break the editor.
    await user.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
  });

  it('closes without saving when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onClose = vi.fn();

    render(<DescriptionEditorDialog open onClose={onClose} description="Text" onSave={onSave} />);

    await waitFor(() => expect(screen.getByText('Text')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('closes via the close icon', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<DescriptionEditorDialog open onClose={onClose} description={null} onSave={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});
