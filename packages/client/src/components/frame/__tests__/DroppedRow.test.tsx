/**
 * The dropped row — what is true, not what is comforting.
 *
 * ⭐⭐ The most important test in this file asserts an ABSENCE. The
 * reference art's dropped panel promises a held-commands queue that
 * does not exist, and the honest replacement is the sentence saying
 * input is being discarded. A placeholder count would undo that
 * silently, so the absence is guarded rather than trusted.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
import { DroppedRow, formatCountdown } from '../DroppedRow';
import { MobileFrame } from '../MobileFrame';
import { useStore } from '../../../store/index';

const reconnectNow = vi.fn();

vi.mock('../../../services/websocket', () => ({
  websocketClient: {
    reconnectNow: () => reconnectNow(),
    subscribeMql: () => 'sub-self',
    unsubscribe: () => {},
    onEnvelope: () => {},
    offEnvelope: () => {},
    sendCommand: () => {},
  },
}));

function setLink(
  link: 'connected' | 'reconnecting' | 'dropped',
  retryAt?: number,
): void {
  useStore.setState({
    connection: {
      link,
      isConnected: link === 'connected',
      socketId: null,
      sessionId: null,
      error: null,
      ...(retryAt !== undefined ? { retryAt } : {}),
    },
  });
}

function rowFor(label: string): HTMLElement {
  const found = Array.from(
    screen.getByTestId('dropped-row').querySelectorAll('[data-figure-state]'),
  ).find((g) => (g.getAttribute('aria-label') ?? '').startsWith(`${label}:`));
  if (!found) throw new Error(`no dropped-row figure for ${label}`);
  return found as HTMLElement;
}

beforeEach(() => {
  vi.useFakeTimers();
  reconnectNow.mockClear();
  useStore.setState({ frames: [], lastFrameAt: undefined, clientState: {}, shelfFigures: null });
  setLink('reconnecting');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('DroppedRow', () => {
  it.each([
    ['reconnecting', 'Reconnecting'],
    ['dropped', 'Disconnected'],
  ] as const)('names the %s link state', (link, shown) => {
    setLink(link);
    render(<DroppedRow />);
    expect(screen.getByTestId('dropped-state').textContent).toBe(shown);
  });

  /*
   * ⭐⭐ The inversion. The art comforts; this is bleaker and strictly
   * more actionable — a player who knows their input is going nowhere
   * stops typing into a void.
   */
  it('⭐⭐ states that commands sent now will not arrive', () => {
    render(<DroppedRow />);
    expect(screen.getByTestId('dropped-truth').textContent).toMatch(
      /will not arrive/i,
    );
  });

  /*
   * ⭐⭐ And renders NO held count. The queue is a non-goal, and its
   * absence must not read as a promise.
   */
  it('⭐⭐ renders no "held" count of any kind', () => {
    const now = Date.now();
    setLink('reconnecting', now + 4000);
    useStore.setState({
      frames: [
        { id: 'f1', topic: 'act.deed', body: 'x', timestamp: now - 3000 },
      ],
    });
    render(<DroppedRow />);
    const text = screen.getByTestId('dropped-row').textContent ?? '';
    expect(text).not.toMatch(/held|queued|saved|pending|buffered/i);
  });

  describe('the retry countdown', () => {
    /*
     * ⭐ LIVE and DERIVED — driven by advancing the clock, not by
     * asserting a constant. A static countdown that never moved would
     * be a worse lie than showing nothing, because it looks live.
     */
    it('⭐ ticks down from the real retryAt', () => {
      const now = Date.now();
      vi.setSystemTime(now);
      setLink('reconnecting', now + 5000);
      render(<DroppedRow />);
      expect(rowFor('retry in').getAttribute('aria-label')).toBe(
        'retry in: 5s',
      );

      // ⚠ `advanceTimersByTime` moves the mocked clock too, so this
      // lands at now+4000 against a retryAt of now+5000 — one second
      // left. Asserting the arithmetic rather than a magic string is
      // the point: the figure is derived, not printed.
      act(() => {
        vi.setSystemTime(now + 3000);
        vi.advanceTimersByTime(1000);
      });
      expect(Date.now()).toBe(now + 4000);
      expect(rowFor('retry in').getAttribute('aria-label')).toBe(
        'retry in: 1s',
      );
    });

    /*
     * ⚠ Once the machine has given up there is no NEXT attempt. The
     * figure says so rather than sitting at 0s pretending to wait.
     */
    it('⚠ is empty WITH a reason once retrying has stopped', () => {
      setLink('dropped');
      render(<DroppedRow />);
      const row = rowFor('retry in');
      expect(row.getAttribute('data-figure-state')).toBe('empty');
      expect(row.textContent ?? '').not.toMatch(/\d/);
      expect(row.getAttribute('aria-label')).toContain('retry is yours');
    });

    it('never reads a negative countdown', () => {
      const now = Date.now();
      vi.setSystemTime(now);
      setLink('reconnecting', now - 5000);
      render(<DroppedRow />);
      expect(rowFor('retry in').getAttribute('aria-label')).toBe(
        'retry in: 0s',
      );
    });
  });

  describe('time since the last frame', () => {
    it('reports it live', () => {
      const now = Date.now();
      vi.setSystemTime(now);
      useStore.setState({ lastFrameAt: now - 90_000 });
      render(<DroppedRow />);
      expect(rowFor('last frame').getAttribute('aria-label')).toBe(
        'last frame: 1m',
      );
    });

    /*
     * ⚠⚠ **The regression this figure actually had, and the reason it
     * reads `lastFrameAt` rather than the frame buffer.**
     *
     * `WebSocketClient.onclose` calls `clearFrames()`, so by the time
     * this row exists the buffer is ALWAYS empty — the figure reported
     * "no frame has arrived this session" in a session that had just
     * rendered a full transcript. The original test seeded `frames`
     * directly and passed, because it never modelled the clear that
     * every real drop performs. Found by driving a real server restart.
     */
    it('⚠⚠ survives the clearFrames that every real drop performs', () => {
      const now = Date.now();
      vi.setSystemTime(now);
      useStore.getState().appendFrame({
        id: 'f1',
        topic: 'act.deed',
        body: 'x',
        timestamp: now - 30_000,
      });
      // Exactly what `onclose` does.
      useStore.getState().clearFrames();
      expect(useStore.getState().frames).toHaveLength(0);

      render(<DroppedRow />);
      const row = rowFor('last frame');
      expect(row.getAttribute('data-figure-state')).toBe('live');
      expect(row.getAttribute('aria-label')).toBe('last frame: 30s');
    });

    /*
     * ⚠ And genuinely-never is still `empty` with a reason, not a zero.
     */
    it('⚠ is empty with a reason when no frame has EVER arrived', () => {
      useStore.setState({ frames: [], lastFrameAt: undefined });
      render(<DroppedRow />);
      const row = rowFor('last frame');
      expect(row.getAttribute('data-figure-state')).toBe('empty');
      expect(row.textContent ?? '').not.toMatch(/\d/);
      expect(row.getAttribute('aria-label')).toContain('no frame has arrived');
    });
  });

  it('the manual retry goes through the EXISTING reconnect path', () => {
    setLink('dropped');
    render(<DroppedRow />);
    screen.getByTestId('dropped-retry').click();
    expect(reconnectNow).toHaveBeenCalledTimes(1);
  });

  describe('formatCountdown', () => {
    it.each([
      [4500, '5s'],
      [4000, '4s'],
      [1, '1s'],
      [0, '0s'],
      [-3000, '0s'],
    ])('%i ms → %s', (ms, expected) => {
      expect(formatCountdown(ms)).toBe(expected);
    });
  });
});

describe('the mobile bar, when the link is down', () => {
  beforeEach(() => {
    useStore.setState({
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
    });
  });

  it.each(['reconnecting', 'dropped'] as const)(
    '⭐ %s claims the entire first row',
    (link) => {
      setLink(link);
      render(<MobileFrame />);
      expect(screen.getByTestId('dropped-row')).toBeTruthy();
      expect(screen.queryByTestId('mobile-facts-row')).toBeNull();
    },
  );

  it('and the glance-line survives the drop', () => {
    setLink('dropped');
    useStore.setState({ clientState: { 'cockpit.shelf': ['renown'] } });
    render(<MobileFrame />);
    // A shelf that vanished on a blip would reflow the bar every time a
    // train went into a tunnel.
    expect(
      within(screen.getByTestId('glance-line')).getAllByLabelText(/^RENOWN:/),
    ).toHaveLength(1);
  });

  it('yields back to the fixed facts on reconnect', () => {
    setLink('dropped');
    const { rerender } = render(<MobileFrame />);
    expect(screen.getByTestId('dropped-row')).toBeTruthy();

    act(() => setLink('connected'));
    rerender(<MobileFrame />);
    expect(screen.queryByTestId('dropped-row')).toBeNull();
    expect(screen.getByTestId('mobile-facts-row')).toBeTruthy();
  });
});
