/**
 * `useIsCompact` — and the one behaviour that makes it usable.
 *
 * ⚠ **It must SUBSCRIBE, not read once.** Dragging a desktop window
 * narrow is how anybody will actually test the mobile chrome, and a
 * one-shot read at mount would make exactly that not work — the chrome
 * would stay whatever it was when the tab opened, which reads as "the
 * mobile layout is broken" rather than "the hook is stale". A test that
 * only checked the initial value would pass against that bug.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useIsCompact, COMPACT_QUERY } from '../useIsCompact';
import { tokens } from '../../../components/ui';

type Listener = (e: MediaQueryListEvent) => void;

/** A controllable `matchMedia`, so a test can "drag the window". */
function installMatchMedia(initial: boolean) {
  const listeners = new Set<Listener>();
  let matches = initial;
  const seen: string[] = [];
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => {
      seen.push(query);
      return {
        get matches() {
          return matches;
        },
        media: query,
        onchange: null,
        addEventListener: (_: string, cb: Listener) => listeners.add(cb),
        removeEventListener: (_: string, cb: Listener) => listeners.delete(cb),
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      };
    },
  });
  return {
    seen,
    listenerCount: () => listeners.size,
    resize(next: boolean) {
      matches = next;
      for (const cb of listeners) cb({ matches: next } as MediaQueryListEvent);
    },
  };
}

function Probe(): JSX.Element {
  return <span data-testid="probe">{useIsCompact() ? 'compact' : 'wide'}</span>;
}

function value(): string {
  return screen.getByTestId('probe').textContent ?? '';
}

afterEach(() => {
  // @ts-expect-error — removing the stub entirely, as jsdom ships none.
  delete window.matchMedia;
  vi.restoreAllMocks();
});

describe('useIsCompact', () => {
  it('reads the named breakpoint, not a loose literal', () => {
    const mm = installMatchMedia(false);
    render(<Probe />);
    expect(COMPACT_QUERY).toBe(`(max-width: ${tokens.breakpoint.compact})`);
    expect(mm.seen).toContain(COMPACT_QUERY);
  });

  it('starts compact when the viewport already is', () => {
    installMatchMedia(true);
    render(<Probe />);
    expect(value()).toBe('compact');
  });

  /*
   * ⚠⚠ The assertion the whole hook exists for.
   */
  it('⚠⚠ follows the viewport across the breakpoint, both ways', () => {
    const mm = installMatchMedia(false);
    render(<Probe />);
    expect(value()).toBe('wide');

    act(() => mm.resize(true));
    expect(value()).toBe('compact');

    act(() => mm.resize(false));
    expect(value()).toBe('wide');
  });

  it('unsubscribes on unmount', () => {
    const mm = installMatchMedia(false);
    const { unmount } = render(<Probe />);
    expect(mm.listenerCount()).toBe(1);
    unmount();
    expect(mm.listenerCount()).toBe(0);
  });

  /*
   * ⚠ No `matchMedia` at all (a non-browser environment) resolves to
   * the DESKTOP composition — the one that has been shipping — rather
   * than throwing or guessing narrow.
   */
  it('⚠ falls back to wide where matchMedia does not exist', () => {
    // @ts-expect-error — jsdom's default state, made explicit.
    delete window.matchMedia;
    render(<Probe />);
    expect(value()).toBe('wide');
  });
});
