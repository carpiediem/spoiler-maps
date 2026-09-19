import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SectionLoading } from './SectionLoading';

describe('SectionLoading', () => {
  it('announces what is loading as a status, with a spinner hidden from assistive tech', () => {
    render(<SectionLoading>Loading characters…</SectionLoading>);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Loading characters…');
    // The spinner is decorative (the text already says what's loading), so it
    // must not also show up as an unnamed progressbar.
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(status.querySelector('.MuiCircularProgress-root')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });
});
