import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

  describe('open animation', () => {
    // MUI's Accordion animates for a height-based duration ('auto'), which
    // jsdom's always-zero layout collapses to nothing — so give elements a
    // real height, or a non-lazy section would look un-animated too.
    const originalClientHeight = Object.getOwnPropertyDescriptor(
      Element.prototype,
      'clientHeight',
    )!;

    beforeEach(() => {
      Object.defineProperty(Element.prototype, 'clientHeight', {
        configurable: true,
        get: () => 200,
      });
    });

    afterEach(() => {
      Object.defineProperty(Element.prototype, 'clientHeight', originalClientHeight);
      vi.useRealTimers();
    });

    // MUI's Collapse only reaches its "entered" state (height: auto) once its
    // transition timeout elapses.
    function isEntered(container: HTMLElement) {
      return container
        .querySelector('.MuiCollapse-root')!
        .classList.contains('MuiCollapse-entered');
    }

    function renderAndExpand(lazy: boolean) {
      vi.useFakeTimers();
      const { container, rerender } = render(
        <SidebarSection id="books" title="Books" expanded={false} onChange={vi.fn()} lazy={lazy}>
          content
        </SidebarSection>,
      );
      rerender(
        <SidebarSection id="books" title="Books" expanded onChange={vi.fn()} lazy={lazy}>
          content
        </SidebarSection>,
      );
      return container;
    }

    it('opens a lazy section without animating, so its content changing right after opening is never clipped', () => {
      const container = renderAndExpand(true);

      act(() => {
        vi.advanceTimersByTime(1);
      });

      expect(isEntered(container)).toBe(true);
    });

    it('still animates a non-lazy section open', () => {
      const container = renderAndExpand(false);

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(isEntered(container)).toBe(false);

      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(isEntered(container)).toBe(true);
    });
  });
});
