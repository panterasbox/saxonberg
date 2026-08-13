/**
 * `ConnectionChip` — always visible, and honest about which of its
 * three readings it can stand behind.
 *
 * ⚠ The load-bearing assertion is the DELEGATION one: the chip owns the
 * healthy state and hands the unhealthy vocabulary to
 * `ConnectionIndicator`, which is why that component's own test (which
 * pins "renders null when connected") passes unmodified. If the chip
 * ever grew its own "Reconnecting…" string there would be two of them,
 * and two surfaces describing one socket can disagree.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ConnectionChip, formatDuration } from '../ConnectionChip';
import { useStore } from '../../../store/index';

function setLink(
  link: 'connected' | 'reconnecting' | 'dropped',
  connectedAt?: number,
  roundTripMs?: number,
): void {
  useStore.setState({
    connection: {
      link,
      isConnected: link === 'connected',
      socketId: link === 'connected' ? 'sock-1' : null,
      sessionId: link === 'connected' ? 'sess-1' : null,
      error: null,
      ...(connectedAt !== undefined ? { connectedAt } : {}),
      ...(roundTripMs !== undefined ? { roundTripMs } : {}),
    },
  });
}

function open(): HTMLElement {
  fireEvent.click(screen.getByLabelText('Connection status'));
  return screen.getByTestId('connection-popover');
}

function rowFor(popover: HTMLElement, label: string): HTMLElement {
  const found = Array.from(
    popover.querySelectorAll('[data-figure-state]'),
  ).find((g) =>
    (g.getAttribute('aria-label') ?? '').startsWith(`${label}:`),
  );
  if (!found) throw new Error(`no popover row for ${label}`);
  return found as HTMLElement;
}

describe('ConnectionChip', () => {
  beforeEach(() => {
    setLink('connected', Date.now());
  });

  describe('the chip itself', () => {
    it('is visible when connected, and says so in its own words', () => {
      render(<ConnectionChip />);
      expect(screen.getByText('connected')).toBeTruthy();
      // ⚠ The indicator is silent when healthy; its vocabulary must be
      // absent, or something is rendering it in a state it refuses.
      expect(screen.queryByText(/Reconnecting|Disconnected/)).toBeNull();
    });

    it.each([
      ['reconnecting', /Reconnecting/],
      ['dropped', /Disconnected/],
    ] as const)('delegates the %s vocabulary, once', (link, pattern) => {
      setLink(link);
      render(<ConnectionChip />);
      // Present…
      expect(screen.getAllByText(pattern)).toHaveLength(1);
      // …and the healthy label is gone, so the two cannot both show.
      expect(screen.queryByText('connected')).toBeNull();
    });
  });

  describe('the popover', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('reports THIS CONNECTION as a live duration', () => {
      const now = Date.now();
      vi.setSystemTime(now);
      // 2h 14m ago.
      setLink('connected', now - (2 * 3600 + 14 * 60) * 1000);
      render(<ConnectionChip />);
      const row = rowFor(open(), 'this connection');
      expect(row.getAttribute('data-figure-state')).toBe('live');
      expect(row.getAttribute('aria-label')).toBe('this connection: 2h 14m');
    });

    /*
     * ⭐ The label is "this connection", not "session". A reconnect
     * issues a fresh `connection-established` and the timestamp resets;
     * rather than paper over that with a fake continuous session clock,
     * the label names what is actually measured.
     */
    it('⭐ names what it measures — "this connection", never "session"', () => {
      render(<ConnectionChip />);
      const popover = open();
      expect(popover.textContent ?? '').toContain('this connection');
      expect(popover.textContent ?? '').not.toMatch(/\bsession\b/i);
    });

    /*
     * ⚠ `empty` with a reason, NOT a fabricated `0m`. Before the first
     * connection and after a drop there is no duration to report, and a
     * zero would be a claim the client cannot make.
     */
    it('⚠ with no connectedAt the duration is empty, not a zero', () => {
      setLink('dropped');
      render(<ConnectionChip />);
      const row = rowFor(open(), 'this connection');
      expect(row.getAttribute('data-figure-state')).toBe('empty');
      expect(row.textContent ?? '').not.toMatch(/\d/);
      expect(row.getAttribute('aria-label')).toContain('no connection to measure');
    });

    /*
     * ⚠ This assertion used to cover TWO hatched rows and pinned round
     * trip's reason as "ping/pong". **Editing it is the point of the
     * change**, not collateral: that reason was inaccurate — the
     * protocol existed and nothing called it — so the row is measured
     * now and only frames-behind is genuinely unmeasured.
     */
    it('hatches the ONE unmeasured reading, with what is actually missing', () => {
      render(<ConnectionChip />);
      const popover = open();
      const fb = rowFor(popover, 'frames behind');

      expect(fb.getAttribute('data-figure-state')).toBe('unwired');
      // The reason must say WHAT IS MISSING — a generic "not wired"
      // tells the next builder nothing about what to build, and a
      // reason naming the wrong missing thing is worse still.
      expect(fb.getAttribute('aria-label')).toContain('sequence number');
      expect(fb.textContent ?? '').not.toMatch(/\d/);
    });

    /*
     * ⭐ The measurement B said needed protocol work it already had.
     */
    it('⭐ reports a completed round trip as a live figure', () => {
      setLink('connected', Date.now(), 42);
      render(<ConnectionChip />);
      const rt = rowFor(open(), 'round trip');
      expect(rt.getAttribute('data-figure-state')).toBe('live');
      expect(rt.getAttribute('aria-label')).toContain('42 ms');
    });

    /*
     * ⚠⚠ **`empty` with a reason, never a zero.** A 0 ms round trip is
     * not a thing that happens, so printing one would claim a perfect
     * link where the truth is that nothing has been measured yet. Same
     * rule as the duration row, and the reason it is asserted
     * separately is that "unmeasured" and "measured as zero" are the
     * two readings this whole convention exists to keep apart.
     */
    it('⚠ before the first pong is empty WITH a reason, never 0', () => {
      setLink('connected', Date.now());
      render(<ConnectionChip />);
      const rt = rowFor(open(), 'round trip');
      expect(rt.getAttribute('data-figure-state')).toBe('empty');
      expect(rt.textContent ?? '').not.toMatch(/\d/);
      expect(rt.getAttribute('aria-label')).toContain(
        'no round trip completed yet',
      );
    });

    it('ticks while open', () => {
      const now = Date.now();
      vi.setSystemTime(now);
      setLink('connected', now - 61_000);
      render(<ConnectionChip />);
      const popover = open();
      expect(rowFor(popover, 'this connection').getAttribute('aria-label')).toBe(
        'this connection: 1m',
      );
      act(() => {
        vi.setSystemTime(now + 60_000);
        vi.advanceTimersByTime(1000);
      });
      expect(rowFor(popover, 'this connection').getAttribute('aria-label')).toBe(
        'this connection: 2m',
      );
    });
  });

  describe('formatDuration', () => {
    it.each([
      [0, '0s'],
      [9_000, '9s'],
      [61_000, '1m'],
      [(2 * 3600 + 14 * 60) * 1000, '2h 14m'],
      [-5_000, '0s'],
    ])('formats %ims as %s', (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected);
    });
  });
});
