import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SidebarSection } from './SidebarSection';

describe('SidebarSection', () => {
  it('shows no count chip when count is omitted', () => {
    render(
      <SidebarSection id="books" title="Books" expanded onChange={vi.fn()}>
        content
      </SidebarSection>,
    );

    expect(screen.getByText('Books')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('hides the count chip when count is zero', () => {
    render(
      <SidebarSection id="books" title="Books" count={0} expanded onChange={vi.fn()}>
        content
      </SidebarSection>,
    );

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('shows a count chip when count is greater than zero', () => {
    render(
      <SidebarSection id="books" title="Books" count={3} expanded onChange={vi.fn()}>
        content
      </SidebarSection>,
    );

    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
