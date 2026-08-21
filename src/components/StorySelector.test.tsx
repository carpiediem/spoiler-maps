import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Story } from '../db';
import { StorySelector } from './StorySelector';

function makeStory(overrides: Partial<Story>): Story {
  return {
    id: 1,
    name: 'Untitled',
    tileUrlTemplate: null,
    tileLayerAuthor: null,
    tileLayerAttributionUrl: null,
    initialCenter: { lat: 0, lng: 0 },
    initialZoom: 4,
    ...overrides,
  };
}

describe('StorySelector', () => {
  it('shows "New Map" when no story is selected', () => {
    render(<StorySelector stories={[]} selectedStoryId={null} onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: /new map/i })).toBeInTheDocument();
  });

  it('shows the selected story name as the title', () => {
    const stories = [makeStory({ id: 1, name: 'A Song of Ice and Fire' })];
    render(<StorySelector stories={stories} selectedStoryId={1} onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: /a song of ice and fire/i })).toBeInTheDocument();
  });

  it('opens the menu and lists every story plus a New Map option', async () => {
    const user = userEvent.setup();
    const stories = [
      makeStory({ id: 1, name: 'A Song of Ice and Fire' }),
      makeStory({ id: 2, name: 'The Wheel of Time' }),
    ];
    render(<StorySelector stories={stories} selectedStoryId={1} onSelect={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /a song of ice and fire/i }));

    expect(screen.getByRole('option', { name: /a song of ice and fire/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('option', { name: /the wheel of time/i })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(screen.getByRole('option', { name: /new map/i })).toBeInTheDocument();
  });

  it('calls onSelect with a story id when a story is chosen', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const stories = [
      makeStory({ id: 1, name: 'A Song of Ice and Fire' }),
      makeStory({ id: 2, name: 'The Wheel of Time' }),
    ];
    render(<StorySelector stories={stories} selectedStoryId={1} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: /a song of ice and fire/i }));
    await user.click(screen.getByRole('option', { name: /the wheel of time/i }));

    expect(onSelect).toHaveBeenCalledWith(2);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('calls onSelect with null when "New Map" is chosen', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const stories = [makeStory({ id: 1, name: 'A Song of Ice and Fire' })];
    render(<StorySelector stories={stories} selectedStoryId={1} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: /a song of ice and fire/i }));
    await user.click(screen.getByRole('option', { name: /new map/i }));

    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('filters the list by the search query', async () => {
    const user = userEvent.setup();
    const stories = [
      makeStory({ id: 1, name: 'A Song of Ice and Fire' }),
      makeStory({ id: 2, name: 'The Wheel of Time' }),
    ];
    render(<StorySelector stories={stories} selectedStoryId={1} onSelect={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /a song of ice and fire/i }));
    await user.type(screen.getByPlaceholderText(/search stories/i), 'wheel');

    expect(
      screen.queryByRole('option', { name: /a song of ice and fire/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: /the wheel of time/i })).toBeInTheDocument();
  });

  it('shows an empty state when the search query matches nothing', async () => {
    const user = userEvent.setup();
    const stories = [makeStory({ id: 1, name: 'A Song of Ice and Fire' })];
    render(<StorySelector stories={stories} selectedStoryId={1} onSelect={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /a song of ice and fire/i }));
    await user.type(screen.getByPlaceholderText(/search stories/i), 'nonexistent');

    expect(screen.getByText(/no stories found/i)).toBeInTheDocument();
  });

  it('closes the menu when clicking outside', async () => {
    const user = userEvent.setup();
    const stories = [makeStory({ id: 1, name: 'A Song of Ice and Fire' })];
    render(
      <div>
        <StorySelector stories={stories} selectedStoryId={1} onSelect={vi.fn()} />
        <button type="button">Outside</button>
      </div>,
    );

    await user.click(screen.getByRole('button', { name: /a song of ice and fire/i }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /outside/i }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes the menu when pressing Escape', async () => {
    const user = userEvent.setup();
    const stories = [makeStory({ id: 1, name: 'A Song of Ice and Fire' })];
    render(<StorySelector stories={stories} selectedStoryId={1} onSelect={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /a song of ice and fire/i }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('toggles the menu closed when the trigger is clicked again', async () => {
    const user = userEvent.setup();
    const stories = [makeStory({ id: 1, name: 'A Song of Ice and Fire' })];
    render(<StorySelector stories={stories} selectedStoryId={1} onSelect={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: /a song of ice and fire/i });
    await user.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.click(trigger);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
