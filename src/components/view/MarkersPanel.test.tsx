import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { StoryDocumentMarkerSet } from '../../lib/storyDocument';
import { MarkersPanel } from './MarkersPanel';

const markerSets: StoryDocumentMarkerSet[] = [
  { name: 'Cities', markers: [] },
  { name: 'Battles', markers: [] },
];

describe('MarkersPanel', () => {
  it('shows an empty state when the story has no listable marker sets', () => {
    render(
      <MarkersPanel markerSets={[]} hiddenIndices={new Set()} onHiddenIndicesChange={vi.fn()} />,
    );

    expect(screen.getByText(/no markers yet/i)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /toggle all marker collections/i })).toBeDisabled();
  });

  it('lists every collection, checked (visible) by default', () => {
    render(
      <MarkersPanel
        markerSets={markerSets}
        hiddenIndices={new Set()}
        onHiddenIndicesChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('checkbox', { name: 'Cities' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Battles' })).toBeChecked();
  });

  it('shows "Unnamed Collection" for a blank name', () => {
    render(
      <MarkersPanel
        markerSets={[{ name: '', markers: [] }]}
        hiddenIndices={new Set()}
        onHiddenIndicesChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Unnamed Collection')).toBeInTheDocument();
  });

  it('unchecks a collection on click, hiding the whole thing at once', async () => {
    const onHiddenIndicesChange = vi.fn();
    const user = userEvent.setup();
    render(
      <MarkersPanel
        markerSets={markerSets}
        hiddenIndices={new Set()}
        onHiddenIndicesChange={onHiddenIndicesChange}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: 'Cities' }));

    expect(onHiddenIndicesChange).toHaveBeenCalledWith(new Set([0]));
  });

  it('rechecks an already-hidden collection', async () => {
    const onHiddenIndicesChange = vi.fn();
    const user = userEvent.setup();
    render(
      <MarkersPanel
        markerSets={markerSets}
        hiddenIndices={new Set([0])}
        onHiddenIndicesChange={onHiddenIndicesChange}
      />,
    );

    expect(screen.getByRole('checkbox', { name: 'Cities' })).not.toBeChecked();
    await user.click(screen.getByRole('checkbox', { name: 'Cities' }));

    expect(onHiddenIndicesChange).toHaveBeenCalledWith(new Set());
  });

  it('never mentions a noIcons collection, and always treats it as visible', () => {
    render(
      <MarkersPanel
        markerSets={[
          { name: 'Cities', markers: [] },
          { name: 'Landmarks', noIcons: true, markers: [] },
        ]}
        hiddenIndices={new Set()}
        onHiddenIndicesChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Cities')).toBeInTheDocument();
    expect(screen.queryByText('Landmarks')).not.toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(2); // select-all + Cities only
  });

  it('checks every listable collection via select-all, ignoring noIcons ones', async () => {
    const onHiddenIndicesChange = vi.fn();
    const user = userEvent.setup();
    render(
      <MarkersPanel
        markerSets={[
          { name: 'Cities', markers: [] },
          { name: 'Battles', markers: [] },
          { name: 'Landmarks', noIcons: true, markers: [] },
        ]}
        hiddenIndices={new Set([0, 1])}
        onHiddenIndicesChange={onHiddenIndicesChange}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: /toggle all marker collections/i }));

    expect(onHiddenIndicesChange).toHaveBeenCalledWith(new Set());
  });

  it('hides every listable collection via select-all once all are checked', async () => {
    const onHiddenIndicesChange = vi.fn();
    const user = userEvent.setup();
    render(
      <MarkersPanel
        markerSets={markerSets}
        hiddenIndices={new Set()}
        onHiddenIndicesChange={onHiddenIndicesChange}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: /toggle all marker collections/i }));

    expect(onHiddenIndicesChange).toHaveBeenCalledWith(new Set([0, 1]));
  });

  it('shows indeterminate for a partial selection', () => {
    render(
      <MarkersPanel
        markerSets={markerSets}
        hiddenIndices={new Set([0])}
        onHiddenIndicesChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('checkbox', { name: /toggle all marker collections/i }),
    ).toHaveAttribute('data-indeterminate', 'true');
  });
});
