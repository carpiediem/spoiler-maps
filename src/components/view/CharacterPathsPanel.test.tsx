import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { StoryDocumentCharacter } from '../../lib/storyDocument';
import { CharacterPathsPanel } from './CharacterPathsPanel';

const characters: StoryDocumentCharacter[] = [
  { name: 'Jon Snow', color: '#ff0000', positions: [] },
  { name: 'Daenerys Targaryen', color: '#000000', positions: [] },
];

describe('CharacterPathsPanel', () => {
  it('shows an empty state when the story has no characters', () => {
    render(
      <CharacterPathsPanel
        characters={[]}
        checkedIndices={new Set()}
        onCheckedIndicesChange={vi.fn()}
        showFullPath={false}
        onShowFullPathChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/no characters yet/i)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /toggle all characters/i })).toBeDisabled();
  });

  it('shows an icon image when set, "Unnamed Character" when the name is blank, and a default swatch color when unset', () => {
    const { container } = render(
      <CharacterPathsPanel
        characters={[
          { name: '', icon: 'https://example.com/jon.png', positions: [] },
          { name: 'Ghost', positions: [] },
        ]}
        checkedIndices={new Set()}
        onCheckedIndicesChange={vi.fn()}
        showFullPath={false}
        onShowFullPathChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Unnamed Character')).toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/jon.png');
    expect(screen.getByRole('checkbox', { name: 'Ghost' })).toBeInTheDocument();
  });

  it('lists every character, unchecked by default', () => {
    render(
      <CharacterPathsPanel
        characters={characters}
        checkedIndices={new Set()}
        onCheckedIndicesChange={vi.fn()}
        showFullPath={false}
        onShowFullPathChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Jon Snow')).toBeInTheDocument();
    expect(screen.getByText('Daenerys Targaryen')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Jon Snow' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Daenerys Targaryen' })).not.toBeChecked();
  });

  it('toggles one character on click', async () => {
    const onCheckedIndicesChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CharacterPathsPanel
        characters={characters}
        checkedIndices={new Set()}
        onCheckedIndicesChange={onCheckedIndicesChange}
        showFullPath={false}
        onShowFullPathChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: 'Jon Snow' }));

    expect(onCheckedIndicesChange).toHaveBeenCalledWith(new Set([0]));
  });

  it('unchecks an already-checked character', async () => {
    const onCheckedIndicesChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CharacterPathsPanel
        characters={characters}
        checkedIndices={new Set([0])}
        onCheckedIndicesChange={onCheckedIndicesChange}
        showFullPath={false}
        onShowFullPathChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: 'Jon Snow' }));

    expect(onCheckedIndicesChange).toHaveBeenCalledWith(new Set());
  });

  it('checks every character via the select-all control, and shows indeterminate for a partial selection', async () => {
    const onCheckedIndicesChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <CharacterPathsPanel
        characters={characters}
        checkedIndices={new Set()}
        onCheckedIndicesChange={onCheckedIndicesChange}
        showFullPath={false}
        onShowFullPathChange={vi.fn()}
      />,
    );

    const selectAll = screen.getByRole('checkbox', { name: /toggle all characters/i });
    await user.click(selectAll);
    expect(onCheckedIndicesChange).toHaveBeenCalledWith(new Set([0, 1]));

    rerender(
      <CharacterPathsPanel
        characters={characters}
        checkedIndices={new Set([0])}
        onCheckedIndicesChange={onCheckedIndicesChange}
        showFullPath={false}
        onShowFullPathChange={vi.fn()}
      />,
    );
    expect(selectAll).toHaveAttribute('data-indeterminate', 'true');
  });

  it('unchecks everything via the select-all control once all are checked', async () => {
    const onCheckedIndicesChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CharacterPathsPanel
        characters={characters}
        checkedIndices={new Set([0, 1])}
        onCheckedIndicesChange={onCheckedIndicesChange}
        showFullPath={false}
        onShowFullPathChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: /toggle all characters/i }));

    expect(onCheckedIndicesChange).toHaveBeenCalledWith(new Set());
  });

  it('toggles the full-path setting, with a tooltip reflecting the current state', async () => {
    const onShowFullPathChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CharacterPathsPanel
        characters={characters}
        checkedIndices={new Set()}
        onCheckedIndicesChange={vi.fn()}
        showFullPath={false}
        onShowFullPathChange={onShowFullPathChange}
      />,
    );

    const toggle = screen.getByRole('button', { name: /current locations only/i });
    await user.click(toggle);

    expect(onShowFullPathChange).toHaveBeenCalledWith(true);
  });
});
