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
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import { useStore } from '../store/index';

/** Every command that reached the wire this test. */
const sent: Array<{ text: string }> = [];

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
    sendCommand: (text: string) => sent.push({ text }),
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
  sent.length = 0;
  useStore.setState({ commandSheet: null, ghostPreview: null });
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

/**
 * ⭐⭐ **The interception, asserted where it happens.**
 *
 * The sheet's own test proves it shows and sends the same string. What
 * only `App` can prove is that the interception is at the ONE handler
 * every affordance routes through — so a tap anywhere in the tree gets
 * the confirm step, and no renderer had to be taught about viewports.
 * The affordance driven below is a shelf-menu entry precisely because
 * it is not the sheet's own surface: it is ordinary chrome that knows
 * nothing about phones.
 */
describe('the command sheet, intercepting at App', () => {
  function tapAnAffordance(): string {
    // The Views menu is the shortest path to a real affordance in both
    // compositions; its command string is built by `ViewsMenu`, not by
    // this test.
    fireEvent.click(screen.getByText('Bartleby'));
    const item = screen.getByTestId('views-item-world');
    const label = item.textContent ?? '';
    fireEvent.click(item);
    return label;
  }

  it('⭐ below the breakpoint a tap OPENS the sheet and sends nothing', () => {
    setViewport(true);
    render(<App />);
    tapAnAffordance();

    expect(screen.getByTestId('command-sheet')).toBeTruthy();
    expect(sent).toEqual([]);
  });

  it('⭐ confirming sends the verbatim string the sheet showed', () => {
    setViewport(true);
    render(<App />);
    tapAnAffordance();

    const shown = screen.getByTestId('command-sheet-command').textContent;
    fireEvent.click(screen.getByTestId('command-sheet-send'));

    expect(sent.map((s) => s.text)).toEqual([shown]);
    expect(screen.queryByTestId('command-sheet')).toBeNull();
  });

  it('dismissing sends nothing', () => {
    setViewport(true);
    render(<App />);
    tapAnAffordance();
    fireEvent.click(screen.getByText('Cancel'));
    expect(sent).toEqual([]);
  });

  /*
   * ⚠ And the desktop path is unchanged: a click still sends directly,
   * with no sheet in the way. This build adds a step on a phone; it must
   * not have added one anywhere else.
   */
  it('⚠ above the breakpoint the click sends directly, with no sheet', () => {
    setViewport(false);
    render(<App />);
    fireEvent.click(screen.getByLabelText('Open the Views menu'));
    fireEvent.click(screen.getByTestId('views-item-world'));

    expect(sent).toHaveLength(1);
    expect(screen.queryByTestId('command-sheet')).toBeNull();
  });
});
