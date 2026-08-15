/**
 * The mobile bar — two rows, and everything the desktop bar is not.
 *
 * ⚠ **No test here asserts geometry.** jsdom has no layout and
 * substitutes no `var()`, so every claim about wrapping, overflow, safe
 * areas and tap-target size is e2e (`e2e/tests/mobile-chrome.spec.ts`).
 * The honest-chrome build shipped a menu that overflowed the viewport
 * and made the whole page scroll sideways with the entire unit suite
 * green — assume the same of every geometric claim in this build.
 *
 * What IS assertable here is composition: which components exist in the
 * tree, which do not, what order the glance-line renders, and what
 * command an affordance carries.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import { SHELF_ROW_IDS, LEGACY_LAYOUT_MIGRATION } from '@saxonberg/types';
import { MobileFrame } from '../MobileFrame';
import { useStore } from '../../../store/index';

/** Every `subscribeMql` spec the bar asked for. */
const subscribed: unknown[] = [];

vi.mock('../../../services/websocket', () => ({
  websocketClient: {
    subscribeMql: (spec: unknown) => {
      subscribed.push(spec);
      return 'sub-self';
    },
    unsubscribe: () => {},
    onEnvelope: () => {},
    offEnvelope: () => {},
    sendCommand: () => {},
    reconnectNow: () => {},
  },
}));

function setShelf(rows: string[]): void {
  useStore.setState({ clientState: { 'cockpit.shelf': rows } });
}

function chips(): HTMLElement[] {
  return Array.from(
    screen.getByTestId('glance-line').querySelectorAll('[data-figure-state]'),
  );
}

/** The engraved label a glance chip renders, in DOM order. */
function chipLabels(): string[] {
  return chips().map((c) =>
    (c.getAttribute('aria-label') ?? '').split(':')[0]!.trim(),
  );
}

describe('MobileFrame', () => {
  /*
   * ⭐⭐ **The bug every other test in this file was structurally blind
   * to.**
   *
   * The glance-line and the pull-down read `store.shelfFigures`, and
   * the `self` subscription that fills it was opened by `Shelf` — which
   * the mobile bar does not render. So the mobile chrome shipped
   * reading a value nothing populated: every row showed its honest
   * empty state forever, for figures the server was willing to send.
   *
   * ⚠⚠ Eleven green tests missed it, and could not have caught it:
   * every one seeds `shelfFigures` with `useStore.setState`, which is
   * the seam that makes the shelf testable without a socket — and is
   * therefore blind to *does anything ask?* **A derive-on-read surface
   * needs its WAKE tested, not only its read.** This is that test.
   */
  it('⭐⭐ OPENS the self subscription — the figures do not arrive by themselves', () => {
    subscribed.length = 0;
    render(<MobileFrame />);
    expect(subscribed).toEqual([{ chrome: 'self' }]);
  });

  it('closes it on unmount, so switching form factor leaks nothing', () => {
    subscribed.length = 0;
    const { unmount } = render(<MobileFrame />);
    expect(subscribed).toHaveLength(1);
    unmount();
    // A second mount subscribes again rather than riding a stale one.
    render(<MobileFrame />);
    expect(subscribed).toHaveLength(2);
  });

  beforeEach(() => {
    useStore.setState({
      shelfFigures: null,
      clientState: {},
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
  });

  describe('row one — the fixed facts', () => {
    it('renders the seal, the connection and the identity', () => {
      render(<MobileFrame />);
      const row = screen.getByTestId('mobile-facts-row');
      expect(within(row).getByLabelText('Connection status')).toBeTruthy();
      expect(within(row).getByText('Bartleby')).toBeTruthy();
    });

    /*
     * ⚠ From the state a player can actually REACH — unpinning every
     * row is four commands, not a hypothetical. Row one must not
     * depend on the shelf having anything in it.
     */
    it('⚠ survives an EMPTY shelf', () => {
      setShelf([]);
      render(<MobileFrame />);
      expect(screen.getByTestId('mobile-facts-row')).toBeTruthy();
      expect(chips()).toHaveLength(0);
      // And says so rather than leaving an unexplained gap.
      expect(screen.getByTestId('glance-line').textContent).toContain(
        'nothing pinned',
      );
    });

    /*
     * ⚠⚠ **The mobile twin of the desktop guard.** The reference art
     * puts a notification bell in row one and calls it never
     * removable. It is not built, not hatched and not placeholdered,
     * because what belongs in that tray wants NotifyPolicy read first —
     * and nothing about a smaller screen changes what is behind it. A
     * stub would be an interface promising a model that does not exist,
     * in the scarcest row on the screen.
     */
    it('⚠⚠ renders NO notification bell, hatched or otherwise', () => {
      render(<MobileFrame />);
      const bar = screen.getByTestId('mobile-bar');
      expect(bar.textContent ?? '').not.toMatch(
        /notification|bell|unread|alerts?\b/i,
      );
      expect(screen.queryByLabelText(/notification/i)).toBeNull();
      // Not by an icon either — the art's glyph.
      expect(bar.textContent ?? '').not.toContain('◔');
    });
  });

  describe('row two — the glance-line', () => {
    it('renders the FIRST THREE shelf rows, in shelf order', () => {
      setShelf(['coin', 'renown', 'skill', 'play', 'make']);
      render(<MobileFrame />);
      expect(chipLabels()).toEqual(['COIN', 'RENOWN', 'SKILL']);
    });

    it('renders fewer when the shelf is shorter', () => {
      setShelf(['renown']);
      render(<MobileFrame />);
      expect(chipLabels()).toEqual(['RENOWN']);
    });

    /*
     * ⭐ **Reordering is what changes the bar**, because the glance-line
     * is the HEAD of the one list. This is the client half of
     * `cockpit shelf first`.
     */
    it('⭐ follows a reorder, with no second list anywhere', () => {
      setShelf(['play', 'renown', 'skill']);
      const { rerender } = render(<MobileFrame />);
      expect(chipLabels()[0]).toBe('PLAY');

      // What the server pushes back after `cockpit shelf first coin`.
      act(() => setShelf(['coin', 'play', 'renown', 'skill']));
      rerender(<MobileFrame />);
      expect(chipLabels()).toEqual(['COIN', 'PLAY', 'RENOWN']);

      // ⚠ And nothing client-side is keeping its own copy: the ONLY
      // shelf state in the store is the server's key.
      const state = useStore.getState() as unknown as Record<string, unknown>;
      const glanceish = Object.keys(state).filter((k) =>
        /glance|barRows|shelfOrder/i.test(k),
      );
      expect(glanceish).toEqual([]);
    });

    it('drops a row the client no longer knows', () => {
      setShelf(['renown', 'retired-row', 'skill']);
      render(<MobileFrame />);
      expect(chipLabels()).toEqual(['RENOWN', 'SKILL']);
    });
  });

  describe('the grab, and the pull-down', () => {
    it('opens the full catalogue in shelf order', () => {
      setShelf([...SHELF_ROW_IDS]);
      render(<MobileFrame />);
      expect(screen.queryByTestId('shelf-pulldown')).toBeNull();

      fireEvent.click(screen.getByTestId('shelf-grab'));

      const grid = screen.getByTestId('pulldown-grid');
      const labels = Array.from(
        grid.querySelectorAll('[data-figure-state]'),
      ).map((g) => (g.getAttribute('aria-label') ?? '').split(':')[0]!.trim());
      expect(labels).toEqual([
        'PLAY',
        'RENOWN',
        'SKILL',
        'MAKE',
        'COIN',
        'STATUS',
        'TIME',
        'ONLINE',
        'DOCKET',
      ]);
    });

    it('closes again', () => {
      render(<MobileFrame />);
      fireEvent.click(screen.getByTestId('shelf-grab'));
      expect(screen.getByTestId('shelf-pulldown')).toBeTruthy();
      fireEvent.click(screen.getByTestId('shelf-grab'));
      expect(screen.queryByTestId('shelf-pulldown')).toBeNull();
    });
  });

  describe('Views and Settings', () => {
    /*
     * ⚠ They move into the account dropdown rather than going away.
     * Dropping them would regress two shipped surfaces; giving them a
     * permanent slot would spend a bar row on them.
     */
    it('⚠ are reachable from the account menu', () => {
      render(
        <MobileFrame
          mode="play"
          onCommandClick={() => {}}
          onCommandPreview={() => {}}
          onToggleSettings={() => {}}
        />,
      );
      // Not in the bar itself…
      const bar = screen.getByTestId('mobile-bar');
      expect(within(bar).queryByLabelText('Open the Views menu')).toBeNull();

      // …but one tap away, inside the identity dropdown.
      fireEvent.click(screen.getByText('Bartleby'));
      expect(screen.getByTestId('views-menu')).toBeTruthy();
      expect(screen.getByLabelText('Toggle settings card')).toBeTruthy();
    });

    it('sends the same command the desktop menu sends', () => {
      const sent: string[] = [];
      render(
        <MobileFrame
          mode="play"
          onCommandClick={(c) => sent.push(c)}
          onCommandPreview={() => {}}
        />,
      );
      fireEvent.click(screen.getByText('Bartleby'));
      fireEvent.click(screen.getByTestId('views-item-play:default'));
      // The legacy-layout migration's own mapping — asserted as the
      // real string so the two form factors are pinned to ONE command,
      // not to two hand-written literals that agree today.
      expect(sent).toEqual([
        `cockpit mode ${LEGACY_LAYOUT_MIGRATION.world.mode} ${LEGACY_LAYOUT_MIGRATION.world.arrangement}`,
      ]);
      expect(sent).toEqual(['cockpit mode play default']);
    });
  });
});
