import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { FlatOption } from './editor-sidebar/characters/rangeOptions';
import { MapTimelineControl } from './MapTimelineControl';

function chapterOptions(...names: string[]): FlatOption[] {
  return names.map((name, i) => ({ id: i, index: i, label: `${i + 1}. AGOT: ${name}`, url: null }));
}

function episodeOptions(...names: string[]): FlatOption[] {
  return names.map((name, i) => ({
    id: i,
    index: i,
    label: `${i + 1}. S01E0${i + 1}: ${name}`,
    url: null,
  }));
}

describe('MapTimelineControl', () => {
  it('renders nothing when there are no books or seasons', () => {
    const { container } = render(
      <MapTimelineControl
        chapterOptions={[]}
        episodeOptions={[]}
        hasBooks={false}
        hasSeasons={false}
        onChange={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a placeholder and disables navigation when the story has a book but no chapters', () => {
    render(
      <MapTimelineControl
        chapterOptions={[]}
        episodeOptions={[]}
        hasBooks
        hasSeasons={false}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous Chapter' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next Chapter' })).toBeDisabled();
    expect(screen.getByRole('slider')).toBeDisabled();
  });

  it('clicking the already-active mode button leaves the mode unchanged', async () => {
    const user = userEvent.setup();
    render(
      <MapTimelineControl
        chapterOptions={chapterOptions('Prologue', 'Bran')}
        episodeOptions={[]}
        hasBooks
        hasSeasons={false}
        onChange={vi.fn()}
      />,
    );

    const booksButton = screen.getByRole('button', { name: 'Books' });
    expect(booksButton).toHaveAttribute('aria-pressed', 'true');

    await user.click(booksButton);

    expect(booksButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('AGOT: Bran')).toBeInTheDocument();
  });

  it('defaults to book mode, starts on the last chapter, and reports it', async () => {
    const onChange = vi.fn();
    render(
      <MapTimelineControl
        chapterOptions={chapterOptions('Prologue', 'Bran')}
        episodeOptions={[]}
        hasBooks
        hasSeasons={false}
        onChange={onChange}
      />,
    );

    expect(screen.getByText('AGOT: Bran')).toBeInTheDocument();
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('book', 2));
    expect(screen.getByRole('button', { name: 'Books' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('defaults to tv mode when the story has only seasons', async () => {
    const onChange = vi.fn();
    render(
      <MapTimelineControl
        chapterOptions={[]}
        episodeOptions={episodeOptions('Winter Is Coming', 'The Kingsroad')}
        hasBooks={false}
        hasSeasons
        onChange={onChange}
      />,
    );

    expect(screen.getByText('S01E02: The Kingsroad')).toBeInTheDocument();
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('tv', 2));
    expect(screen.getByRole('button', { name: 'TV seasons' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('switches modes, jumping to the new medium’s last entry', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <MapTimelineControl
        chapterOptions={chapterOptions('Prologue', 'Bran')}
        episodeOptions={episodeOptions('Winter Is Coming', 'The Kingsroad')}
        hasBooks
        hasSeasons
        onChange={onChange}
      />,
    );

    expect(screen.getByText('AGOT: Bran')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'TV seasons' }));

    expect(await screen.findByText('S01E02: The Kingsroad')).toBeInTheDocument();
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('tv', 2));
  });

  it('steps backward and forward with the arrow buttons, disabling them at the ends', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <MapTimelineControl
        chapterOptions={chapterOptions('Prologue', 'Bran')}
        episodeOptions={[]}
        hasBooks
        hasSeasons={false}
        onChange={onChange}
      />,
    );

    const previous = screen.getByRole('button', { name: 'Previous Chapter' });
    const next = screen.getByRole('button', { name: 'Next Chapter' });
    expect(next).toBeDisabled();

    await user.click(previous);
    expect(await screen.findByText('AGOT: Prologue')).toBeInTheDocument();
    expect(previous).toBeDisabled();
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('book', 1));

    await user.click(next);
    expect(await screen.findByText('AGOT: Bran')).toBeInTheDocument();
    expect(next).toBeDisabled();
  });

  it('moves the scrub position via the slider', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <MapTimelineControl
        chapterOptions={chapterOptions('Prologue', 'Bran')}
        episodeOptions={[]}
        hasBooks
        hasSeasons={false}
        onChange={onChange}
      />,
    );

    const slider = screen.getByRole('slider');
    slider.focus();
    await user.keyboard('{ArrowLeft}');

    expect(await screen.findByText('AGOT: Prologue')).toBeInTheDocument();
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('book', 1));
  });

  it('hyperlinks the label when the current chapter has a URL', () => {
    const options = chapterOptions('Prologue', 'Bran');
    options[1]!.url = 'https://example.com/bran';
    render(
      <MapTimelineControl
        chapterOptions={options}
        episodeOptions={[]}
        hasBooks
        hasSeasons={false}
        onChange={vi.fn()}
      />,
    );

    const link = screen.getByRole('link', { name: 'AGOT: Bran' });
    expect(link).toHaveAttribute('href', 'https://example.com/bran');
  });

  it('does not hyperlink the label when the current chapter has no URL', () => {
    render(
      <MapTimelineControl
        chapterOptions={chapterOptions('Prologue', 'Bran')}
        episodeOptions={[]}
        hasBooks
        hasSeasons={false}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('AGOT: Bran')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows an optional heading above the panel', () => {
    render(
      <MapTimelineControl
        chapterOptions={chapterOptions('Prologue', 'Bran')}
        episodeOptions={[]}
        hasBooks
        hasSeasons={false}
        onChange={vi.fn()}
        heading="Show spoilers through:"
      />,
    );

    expect(screen.getByText('Show spoilers through:')).toBeInTheDocument();
  });
});
