/**
 * The command sheet — a tap names its command before it sends.
 *
 * ⭐ The load-bearing assertion is **sheet-text equals sent-command**.
 * The axiom the click model advertises is that the interface shows
 * which command a click sends; a sheet showing a prettified or
 * abbreviated version of what actually goes over the wire would falsify
 * it more thoroughly than showing nothing would.
 *
 * ⚠ Geometry (the sheet fitting a 320px screen, tap-target size, the
 * scrim covering the feed) is e2e.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { CommandSheet } from '../CommandSheet';
import { useStore } from '../../../store/index';

const here = dirname(fileURLToPath(import.meta.url));

describe('CommandSheet', () => {
  beforeEach(() => {
    useStore.setState({ commandSheet: null, ghostPreview: null });
  });

  it('renders nothing when no command is pending', () => {
    render(<CommandSheet onSend={() => {}} />);
    expect(screen.queryByTestId('command-sheet')).toBeNull();
  });

  it('names the VERBATIM command', () => {
    useStore.setState({ commandSheet: 'look anvil --peek' });
    render(<CommandSheet onSend={() => {}} />);
    expect(screen.getByTestId('command-sheet-command').textContent).toBe(
      'look anvil --peek',
    );
  });

  /*
   * ⭐ The one that matters: what it SHOWED is what it SENDS, character
   * for character.
   */
  it('⭐ sends exactly the string it displayed', () => {
    const sent: string[] = [];
    const command = 'cockpit shelf first coin';
    useStore.setState({ commandSheet: command });
    render(<CommandSheet onSend={(c) => sent.push(c)} />);

    const shown = screen.getByTestId('command-sheet-command').textContent;
    fireEvent.click(screen.getByTestId('command-sheet-send'));

    expect(sent).toEqual([command]);
    expect(sent[0]).toBe(shown);
  });

  it('closes itself after sending', () => {
    useStore.setState({ commandSheet: 'look' });
    render(<CommandSheet onSend={() => {}} />);
    fireEvent.click(screen.getByTestId('command-sheet-send'));
    expect(useStore.getState().commandSheet).toBeNull();
    expect(screen.queryByTestId('command-sheet')).toBeNull();
  });

  it('dismissing sends nothing', () => {
    const sent: string[] = [];
    useStore.setState({ commandSheet: 'look' });
    render(<CommandSheet onSend={(c) => sent.push(c)} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(sent).toEqual([]);
    expect(useStore.getState().commandSheet).toBeNull();
  });

  it('tapping the scrim dismisses without sending', () => {
    const sent: string[] = [];
    useStore.setState({ commandSheet: 'look' });
    render(<CommandSheet onSend={(c) => sent.push(c)} />);
    fireEvent.click(screen.getByTestId('command-sheet-scrim'));
    expect(sent).toEqual([]);
    expect(useStore.getState().commandSheet).toBeNull();
  });

  it('tapping the sheet itself does NOT dismiss', () => {
    useStore.setState({ commandSheet: 'look' });
    render(<CommandSheet onSend={() => {}} />);
    fireEvent.click(screen.getByTestId('command-sheet'));
    expect(useStore.getState().commandSheet).toBe('look');
  });

  /*
   * ⚠⚠ The sheet is not a second preview surface. The existing guard
   * (`StatusBar.test.tsx`) asserts exactly one module reads
   * `ghostPreview`, and it passes unmodified — this is the same claim
   * stated from the sheet's side, so a future edit that reached for the
   * preview slice fails HERE with a reason attached rather than in a
   * guard whose subject is a different component.
   */
  it('⚠⚠ never reads ghostPreview', () => {
    const source = readFileSync(resolve(here, '../CommandSheet.tsx'), 'utf8');
    expect(source).not.toMatch(/\bs\.ghostPreview\b/);
    expect(source).not.toMatch(/setGhostPreview/);
  });

  /*
   * ⚠ ONE command, because that is what an affordance affords today:
   * `commandFor(node)` returns a single string. The slice's type says
   * so; this asserts the surface does not quietly grow a list.
   */
  it('⚠ shows exactly one command', () => {
    useStore.setState({ commandSheet: 'look anvil' });
    render(<CommandSheet onSend={() => {}} />);
    expect(
      screen.getByTestId('command-sheet').querySelectorAll(
        '[data-testid="command-sheet-command"]',
      ),
    ).toHaveLength(1);
  });
});
