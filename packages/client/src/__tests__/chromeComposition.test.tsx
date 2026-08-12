/**
 * ⭐⭐ **The viewport seam, asserted at the one place it is decided.**
 *
 * The individual bars have their own tests. What only `App` can answer
 * is the question the requirement actually asks: *which composition is
 * in the tree*. And it is a question a CSS-only implementation could
 * not answer at all — rendering both bars and hiding one would leave
 * two `StatusBar`s in the DOM forever, so "exactly one renders above
 * the breakpoint" would be untestable by construction. That the
 * assertion below is even writable is the argument for the JS switch.
 *
 * ⚠ jsdom ships no `matchMedia`, so these tests install one. That is
 * also why the hook's own fallback is *not compact*: in an environment
 * with no media queries the desktop composition is the honest default,
 * being the one that has been shipping.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';
import { useStore } from '../store/index';

vi.mock('../services/websocket', () => ({
  websocketClient: {
    connect: () => {},
    isConnected: () => true,
    onAnyTopic: () => {},
    offAnyTopic: () => {},
    onEnvelope: () => {},
    offEnvelope: () => {},
    subscribeMql: () => 'sub-1',
    unsubscribe: () => {},
    sendCommand: () => {},
    reconnectNow: () => {},
  },
}));

/** Install a `matchMedia` that answers one way for every query. */
function setViewport(compact: boolean): void {
  const listeners = new Set<(e: MediaQueryListEvent) => void>();
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: compact,
      media: query,
      onchange: null,
      addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) =>
        listeners.add(cb),
      removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) =>
        listeners.delete(cb),
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

function inWorld(): void {
  useStore.setState({
    connectionPhase: 'in-world',
    clientState: {},
    frames: [],
    shelfFigures: null,
    auth: {
      isAuthenticated: true,
      user: { id: 'u', email: '', displayName: 'Bartleby' },
      player: {
        _id: 'p',
        name: 'Bartleby',
        pronouns: 'they' as never,
        portraitUrl: '',
      },
    },
    connection: {
      link: 'connected',
      isConnected: true,
      socketId: 's',
      sessionId: 'sess',
      error: null,
    },
  });
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      json: async () => ({ isAuthenticated: false, providers: [] }),
    })),
  );
  inWorld();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the in-world chrome, by viewport', () => {
  it('below the breakpoint renders the mobile bar and NOT the desktop one', () => {
    setViewport(true);
    render(<App />);
    expect(screen.getByTestId('mobile-bar')).toBeTruthy();
    expect(screen.queryByTestId('top-bar')).toBeNull();
  });

  /*
   * ⚠ The other half, and the one that guards a regression: the
   * desktop composition must not have moved. This build inverts the
   * chrome on a phone; it changes nothing above the breakpoint.
   */
  it('⚠ above the breakpoint the desktop bar is unchanged', () => {
    setViewport(false);
    render(<App />);
    expect(screen.getByTestId('top-bar')).toBeTruthy();
    expect(screen.queryByTestId('mobile-bar')).toBeNull();
    // B's composition, still whole: the shelf lives IN the bar.
    expect(screen.getByTestId('shelf')).toBeTruthy();
  });

  /*
   * ⭐ The status bar. It has no hover to report on a phone and would
   * cost a row the feed needs — so it does not exist there, rather than
   * existing and being hidden.
   */
  it('⭐ renders NO status bar below the breakpoint', () => {
    setViewport(true);
    render(<App />);
    expect(screen.queryByTestId('status-bar')).toBeNull();
  });

  it('⭐ and EXACTLY ONE above it', () => {
    setViewport(false);
    render(<App />);
    expect(screen.getAllByTestId('status-bar')).toHaveLength(1);
  });
});
