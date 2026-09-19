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
        timelineMode="book"
        timelineIndex={1}
      />,
    );

    expect(screen.getByText(/no characters yet/i)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /toggle all characters/i })).toBeDisabled();
  });

  it('sticks the header to the top of the panel, with an opaque background so the list can’t show through', () => {
    render(
      <CharacterPathsPanel
        characters={characters}
        checkedIndices={new Set()}
        onCheckedIndicesChange={vi.fn()}
        showFullPath={false}
        onShowFullPathChange={vi.fn()}
        timelineMode="book"
        timelineIndex={1}
      />,
    );

    const header = screen.getByText('Character Paths').closest('div')!;
    expect(getComputedStyle(header).position).toBe('sticky');
    expect(getComputedStyle(header).top).toBe('0px');
    expect(getComputedStyle(header).backgroundColor).not.toBe('');
    expect(getComputedStyle(header).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
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
        timelineMode="book"
        timelineIndex={1}
      />,
    );

    expect(screen.getByText('Unnamed Character')).toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/jon.png');
    expect(screen.getByRole('checkbox', { name: 'Ghost' })).toBeInTheDocument();
  });

  it('links the name to the character’s own URL when set, plain text otherwise', () => {
    render(
      <CharacterPathsPanel
        characters={[
          {
            name: 'Jon Snow',
            url: 'https://awoiaf.westeros.org/index.php/Jon_Snow',
            positions: [],
          },
          { name: 'Ghost', positions: [] },
        ]}
        checkedIndices={new Set()}
        onCheckedIndicesChange={vi.fn()}
        showFullPath={false}
        onShowFullPathChange={vi.fn()}
        timelineMode="book"
        timelineIndex={1}
      />,
    );

    expect(screen.getByRole('link', { name: 'Jon Snow' })).toHaveAttribute(
      'href',
      'https://awoiaf.westeros.org/index.php/Jon_Snow',
    );
    expect(screen.queryByRole('link', { name: 'Ghost' })).not.toBeInTheDocument();
    expect(screen.getByText('Ghost')).toBeInTheDocument();
  });

  it('shows an active alias’s name/icon/color/url instead of the character’s own, reverting once its range ends', () => {
    const { rerender } = render(
      <CharacterPathsPanel
        characters={[
          {
            name: 'Aegon Targaryen',
            icon: 'https://example.com/aegon.png',
            color: '#000000',
            url: 'https://awoiaf.westeros.org/index.php/Aegon_Targaryen_(son_of_Rhaegar)',
            positions: [],
            aliases: [
              {
                name: 'Young Griff',
                icon: 'https://example.com/griff.png',
                color: '#0000ff',
                url: 'https://awoiaf.westeros.org/index.php/Young_Griff',
                chapters: [0, 0],
              },
            ],
          },
        ]}
        checkedIndices={new Set()}
        onCheckedIndicesChange={vi.fn()}
        showFullPath={false}
        onShowFullPathChange={vi.fn()}
        timelineMode="book"
        timelineIndex={1}
      />,
    );

    expect(screen.getByRole('link', { name: 'Young Griff' })).toHaveAttribute(
      'href',
      'https://awoiaf.westeros.org/index.php/Young_Griff',
    );
    expect(screen.getByRole('img', { name: 'Young Griff' })).toHaveAttribute(
      'src',
      'https://example.com/griff.png',
    );

    rerender(
      <CharacterPathsPanel
        characters={[
          {
            name: 'Aegon Targaryen',
            icon: 'https://example.com/aegon.png',
            color: '#000000',
            url: 'https://awoiaf.westeros.org/index.php/Aegon_Targaryen_(son_of_Rhaegar)',
            positions: [],
            aliases: [
              {
                name: 'Young Griff',
                icon: 'https://example.com/griff.png',
                color: '#0000ff',
                url: 'https://awoiaf.westeros.org/index.php/Young_Griff',
                chapters: [0, 0],
              },
            ],
          },
        ]}
        checkedIndices={new Set()}
        onCheckedIndicesChange={vi.fn()}
        showFullPath={false}
        onShowFullPathChange={vi.fn()}
        timelineMode="book"
        timelineIndex={2}
      />,
    );

    expect(screen.getByRole('link', { name: 'Aegon Targaryen' })).toHaveAttribute(
      'href',
      'https://awoiaf.westeros.org/index.php/Aegon_Targaryen_(son_of_Rhaegar)',
    );
    expect(screen.getByRole('img', { name: 'Aegon Targaryen' })).toHaveAttribute(
      'src',
      'https://example.com/aegon.png',
    );
  });

  it('lists every character, unchecked by default', () => {
    render(
      <CharacterPathsPanel
        characters={characters}
        checkedIndices={new Set()}
        onCheckedIndicesChange={vi.fn()}
        showFullPath={false}
        onShowFullPathChange={vi.fn()}
        timelineMode="book"
        timelineIndex={1}
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
        timelineMode="book"
        timelineIndex={1}
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
        timelineMode="book"
        timelineIndex={1}
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
        timelineMode="book"
        timelineIndex={1}
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
        timelineMode="book"
        timelineIndex={1}
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
        timelineMode="book"
        timelineIndex={1}
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
        timelineMode="book"
        timelineIndex={1}
      />,
    );

    const toggle = screen.getByRole('button', { name: /show full path/i });
    await user.click(toggle);

    expect(onShowFullPathChange).toHaveBeenCalledWith(true);
  });

  it('labels the toggle "Current locations only" once full paths are already shown', async () => {
    const onShowFullPathChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CharacterPathsPanel
        characters={characters}
        checkedIndices={new Set()}
        onCheckedIndicesChange={vi.fn()}
        showFullPath
        onShowFullPathChange={onShowFullPathChange}
        timelineMode="book"
        timelineIndex={1}
      />,
    );

    const toggle = screen.getByRole('button', { name: /current locations only/i });
    await user.click(toggle);

    expect(onShowFullPathChange).toHaveBeenCalledWith(false);
  });
});
