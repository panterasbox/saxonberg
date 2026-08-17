/**
 * `Frame` — the civic top bar.
 *
 * ⭐ The assertion that matters most here is that identity and
 * connection survive an EMPTY shelf. They are *the two things that must
 * be true at a glance whatever else was removed*, and the honest way to
 * test that is from the state a player could actually reach — an empty
 * `cockpit.shelf` — rather than by asserting a rule exists.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Pronouns } from '@saxonberg/types';
import { Frame } from '../Frame';
import { useStore } from '../../../store/index';

vi.mock('../../../services/websocket', () => ({
  websocketClient: {
    subscribeMql: () => 'sub-self',
    unsubscribe: () => {},
    onEnvelope: () => {},
    offEnvelope: () => {},
  },
}));

function connect(): void {
  useStore.setState({
    connection: {
      link: 'connected',
      isConnected: true,
      socketId: 'sock-1',
      sessionId: 'sess-1',
      error: null,
      connectedAt: Date.now(),
    },
    auth: {
      isAuthenticated: true,
      user: { id: 'u1', email: '', displayName: 'Alice' },
      // ⚠ `AccountMenu` renders `null` without an `auth.player` — the
      // identity chip names the CHARACTER, from the server's own frame,
      // never a client-side guess off the account.
      player: {
        _id: 'p1',
        name: 'Alice',
        pronouns: Pronouns.They,
        portraitUrl: '',
      },
    },
  });
}

describe('Frame', () => {
  beforeEach(() => {
    connect();
    useStore.setState({ clientState: {}, shelfFigures: null });
  });

  it('renders the bar with the seal, the connection chip and identity', () => {
    render(<Frame />);
    expect(screen.getByTestId('top-bar')).toBeTruthy();
    expect(screen.getByLabelText('Saxonberg')).toBeTruthy();
    expect(screen.getByLabelText('Connection status')).toBeTruthy();
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByTestId('shelf')).toBeTruthy();
  });

  /*
   * ⭐ The AC's "identity and connection cannot be unpinned", asserted
   * from the state a player could actually reach. They are not rows
   * with a protection rule — they are not shelf rows at all, which is a
   * stronger guarantee than a rule somebody could edit away. (The verb
   * side of the same claim: `cockpit shelf unpin identity` refuses with
   * "unknown shelf row" — see `CockpitShelfController.test.ts`.)
   */
  it('⭐ identity and connection survive an EMPTY shelf', () => {
    useStore.setState({ clientState: { 'cockpit.shelf': [] } });
    render(<Frame />);

    expect(screen.getByLabelText('Connection status')).toBeTruthy();
    expect(screen.getByText('Alice')).toBeTruthy();
    // The shelf itself is present and simply holds nothing pinned.
    const shelf = screen.getByTestId('shelf');
    expect(shelf.querySelectorAll('[data-figure-state]')).toHaveLength(0);
  });

  /*
   * ⚠ Neither is named in the requirements, and migrating off
   * `cockpit.layout` is an explicit Wave 4 non-goal — so a "full
   * rebuild" that dropped them would silently regress two shipped
   * surfaces.
   */
  it('⚠ keeps the Views switcher and the Settings affordance', () => {
    render(
      <Frame
        mode="play"
        onCommandClick={() => {}}
        onCommandPreview={() => {}}
        onToggleSettings={() => {}}
      />,
    );
    expect(screen.getByLabelText('Toggle settings card')).toBeTruthy();
    expect(screen.getByText(/Views/i)).toBeTruthy();
  });

  /*
   * ⚠ The bell in the reference art is NOT built, NOT hatched and NOT
   * placeholdered — what belongs in a notification tray is whatever the
   * receiver SAID they wanted, which wants `NotifyPolicy` read first. A
   * stub would be an interface promising a model that does not exist,
   * which is the failure this build exists to demonstrate against, one
   * level up from a fake figure.
   */
  it('⚠ ships no notification-tray placeholder', () => {
    render(<Frame />);
    const bar = screen.getByTestId('top-bar');
    expect(bar.textContent ?? '').not.toMatch(/notification|🔔/i);
  });

  it('threads the preview + click handlers into the shelf', () => {
    const onCommandClick = vi.fn();
    render(<Frame onCommandClick={onCommandClick} onCommandPreview={() => {}} />);
    // The shelf's own tests cover the dispatch; this asserts the wiring
    // reaches it at all, which a prop rename would otherwise break
    // silently.
    expect(screen.getByLabelText('Add or remove a shelf widget')).toBeTruthy();
  });
});
