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

  it('sticks the header’s h3 wrapper to the top of its scroll container', () => {
    render(
      <SidebarSection id="books" title="Books" expanded onChange={vi.fn()}>
        content
      </SidebarSection>,
    );

    const heading = document.getElementById('books-header')!.closest('h3')!;
    expect(getComputedStyle(heading).position).toBe('sticky');
    expect(getComputedStyle(heading).top).toBe('0px');
  });

  it('gives the button an opaque background, not just the h3 wrapper, so scrolled content can’t show through', () => {
    render(
      <SidebarSection id="books" title="Books" expanded onChange={vi.fn()}>
        content
      </SidebarSection>,
    );

    const button = document.getElementById('books-header')!;
    expect(getComputedStyle(button).backgroundColor).not.toBe('');
    expect(getComputedStyle(button).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });
});
