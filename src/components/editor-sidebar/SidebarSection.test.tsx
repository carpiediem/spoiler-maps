import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SIDEBAR_SECTION_HEADER_Z_INDEX, SidebarSection } from './SidebarSection';

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

  it('sticks the header button to the top of its scroll container, with an opaque background so scrolled content can’t show through', () => {
    render(
      <SidebarSection id="books" title="Books" expanded onChange={vi.fn()}>
        content
      </SidebarSection>,
    );

    const button = document.getElementById('books-header')!;
    expect(getComputedStyle(button).position).toBe('sticky');
    expect(getComputedStyle(button).top).toBe('0px');
    expect(getComputedStyle(button).zIndex).toBe(String(SIDEBAR_SECTION_HEADER_Z_INDEX));
    expect(getComputedStyle(button).backgroundColor).not.toBe('');
    expect(getComputedStyle(button).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });
});
