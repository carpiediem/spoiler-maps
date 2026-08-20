import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Story } from '../db';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../lib/mapDefaults';
import { EditorSidebar } from './EditorSidebar';

function makeStory(overrides: Partial<Story>): Story {
  return {
    id: 1,
    name: 'A Song of Ice and Fire',
    tileUrlTemplate: 'https://tile.example.com/{z}/{x}/{y}.png',
    initialCenter: { lat: 51.5, lng: -0.1278 },
    initialZoom: 6,
    ...overrides,
  };
}

describe('EditorSidebar', () => {
  it('calls onSave with a valid name, tile URL template, and default initial position', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <EditorSidebar
        stories={[]}
        selectedStoryId={null}
        onSelectStory={vi.fn()}
        onSave={onSave}
        onCaptureMapPosition={() => null}
      />,
    );

    await user.type(screen.getByLabelText(/map name/i), 'A Song of Ice and Fire');
    fireEvent.change(screen.getByLabelText(/tile url template/i), {
      target: { value: 'https://tile.example.com/{z}/{x}/{y}.png' },
    });
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(onSave).toHaveBeenCalledWith({
      name: 'A Song of Ice and Fire',
      tileUrlTemplate: 'https://tile.example.com/{z}/{x}/{y}.png',
      initialCenter: DEFAULT_CENTER,
      initialZoom: DEFAULT_ZOOM,
    });
  });

  it('extrapolates a {q} template from a real example tile URL', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <EditorSidebar
        stories={[]}
        selectedStoryId={null}
        onSelectStory={vi.fn()}
        onSave={onSave}
        onCaptureMapPosition={() => null}
      />,
    );

    await user.type(screen.getByLabelText(/map name/i), 'A Song of Ice and Fire');
    fireEvent.change(screen.getByLabelText(/tile url template/i), {
      target: { value: 'https://carpiediem.github.io/game-of-thrones-map/fsm/tqtqr.jpg' },
    });
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        tileUrlTemplate: 'https://carpiediem.github.io/game-of-thrones-map/fsm/{q}.jpg',
      }),
    );
  });

  it('shows an error and does not call onSave when the name is blank', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <EditorSidebar
        stories={[]}
        selectedStoryId={null}
        onSelectStory={vi.fn()}
        onSave={onSave}
        onCaptureMapPosition={() => null}
      />,
    );

    fireEvent.change(screen.getByLabelText(/tile url template/i), {
      target: { value: 'https://tile.example.com/{z}/{x}/{y}.png' },
    });
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/enter a name/i);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows an error and does not call onSave for an invalid tile URL', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <EditorSidebar
        stories={[]}
        selectedStoryId={null}
        onSelectStory={vi.fn()}
        onSave={onSave}
        onCaptureMapPosition={() => null}
      />,
    );

    await user.type(screen.getByLabelText(/map name/i), 'A Song of Ice and Fire');
    await user.type(screen.getByLabelText(/tile url template/i), 'not-a-valid-url');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('prefills the form from the selected story', () => {
    const story = makeStory({ id: 1 });
    render(
      <EditorSidebar
        stories={[story]}
        selectedStoryId={1}
        onSelectStory={vi.fn()}
        onSave={vi.fn()}
        onCaptureMapPosition={() => null}
      />,
    );

    expect(screen.getByLabelText(/map name/i)).toHaveValue(story.name);
    expect(screen.getByLabelText(/tile url template/i)).toHaveValue(story.tileUrlTemplate);
    expect(screen.getByText(/51\.5000, -0\.1278 · Zoom 6/)).toBeInTheDocument();
  });

  it('clears the form when switching to "New Map"', () => {
    const story = makeStory({ id: 1 });
    const { rerender } = render(
      <EditorSidebar
        stories={[story]}
        selectedStoryId={1}
        onSelectStory={vi.fn()}
        onSave={vi.fn()}
        onCaptureMapPosition={() => null}
      />,
    );

    rerender(
      <EditorSidebar
        stories={[story]}
        selectedStoryId={null}
        onSelectStory={vi.fn()}
        onSave={vi.fn()}
        onCaptureMapPosition={() => null}
      />,
    );

    expect(screen.getByLabelText(/map name/i)).toHaveValue('');
    expect(screen.getByLabelText(/tile url template/i)).toHaveValue('');
    expect(
      screen.getByText(
        new RegExp(`${DEFAULT_CENTER.lat.toFixed(4)}, ${DEFAULT_CENTER.lng.toFixed(4)}`),
      ),
    ).toBeInTheDocument();
  });

  it('forwards story selection from the story selector', async () => {
    const onSelectStory = vi.fn();
    const user = userEvent.setup();
    const stories = [makeStory({ id: 1 }), makeStory({ id: 2, name: 'The Wheel of Time' })];
    render(
      <EditorSidebar
        stories={stories}
        selectedStoryId={1}
        onSelectStory={onSelectStory}
        onSave={vi.fn()}
        onCaptureMapPosition={() => null}
      />,
    );

    await user.click(screen.getByRole('button', { name: /a song of ice and fire/i }));
    await user.click(screen.getByRole('option', { name: /the wheel of time/i }));

    expect(onSelectStory).toHaveBeenCalledWith(2);
  });

  it('captures the current map position and reflects it in the display and on save', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    const story = makeStory({ id: 1 });
    render(
      <EditorSidebar
        stories={[story]}
        selectedStoryId={1}
        onSelectStory={vi.fn()}
        onSave={onSave}
        onCaptureMapPosition={() => ({ center: { lat: 40.7128, lng: -74.006 }, zoom: 10 })}
      />,
    );

    await user.click(screen.getByRole('button', { name: /use current map position/i }));

    expect(screen.getByText(/40\.7128, -74\.0060 · Zoom 10/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        initialCenter: { lat: 40.7128, lng: -74.006 },
        initialZoom: 10,
      }),
    );
  });

  it('leaves the displayed position unchanged when the map is not ready', async () => {
    const user = userEvent.setup();
    const story = makeStory({ id: 1 });
    render(
      <EditorSidebar
        stories={[story]}
        selectedStoryId={1}
        onSelectStory={vi.fn()}
        onSave={vi.fn()}
        onCaptureMapPosition={() => null}
      />,
    );

    await user.click(screen.getByRole('button', { name: /use current map position/i }));

    expect(screen.getByText(/51\.5000, -0\.1278 · Zoom 6/)).toBeInTheDocument();
  });
});
