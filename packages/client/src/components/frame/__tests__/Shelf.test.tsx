/**
 * The widget shelf — nine rows, three live, six honestly hatched.
 *
 * ⚠ **No test here asserts a resolved colour.** jsdom does not
 * substitute `var()`, so every claim about hatched GROUND is e2e
 * (`e2e/tests/shelf.spec.ts`). What is assertable here — and what
 * actually carries the convention — is `data-figure-state`, the reason
 * text, the accessible name, and the command a click dispatches.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import {
  DEFAULT_SHELF,
  SHELF_ROW_IDS,
  type SelfFigureRecord,
} from '@saxonberg/types';
import { Shelf, SHELF_CATALOGUE, HATCH_COPY } from '../Shelf';
import { useStore } from '../../../store/index';

// The shelf opens a real subscription in an effect. Stub the transport:
// these tests drive the store directly, which is the seam the component
// was given precisely so a shelf could be tested without a socket.
vi.mock('../../../services/websocket', () => ({
  websocketClient: {
    subscribeMql: () => 'sub-self',
    unsubscribe: () => {},
    onEnvelope: () => {},
    offEnvelope: () => {},
  },
}));

const LIVE_FIGURES: SelfFigureRecord = {
  stuffId: 'me',
  playStanding: { band: 'nascent' },
  makeStanding: { band: 'dormant' },
  renown: { value: 4 },
  practisingCompetence: { discipline: 'metalwork', band: 'apprentice' },
};

function groups(): HTMLElement[] {
  return Array.from(
    screen.getByTestId('shelf').querySelectorAll('[data-figure-state]'),
  );
}

function groupFor(label: string): HTMLElement {
  const found = groups().find((g) =>
    (g.getAttribute('aria-label') ?? '').startsWith(`${label}:`),
  );
  if (!found) throw new Error(`no shelf group for ${label}`);
  return found;
}

/**
 * Pin every row — the state a player reaches by adding the six hatched
 * ones. NOT the default: see the ⭐ default test below.
 */
function pinAll(): void {
  useStore.setState({ clientState: { 'cockpit.shelf': [...SHELF_ROW_IDS] } });
}

describe('Shelf', () => {
  beforeEach(() => {
    useStore.setState({ shelfFigures: null, clientState: {} });
  });

  describe('the catalogue', () => {
    /*
     * ⭐ **Never default-pin a widget that does not do anything yet.**
     * The catalogue is nine; the DEFAULT SHELF is the three that are
     * actually wired. A new player's first impression should not be six
     * dead boxes, however truthfully each one explains itself — the
     * honesty convention lands in the widget menu instead, which is
     * where a player is actually asking what a row would show.
     */
    it('⭐ defaults to the WIRED rows only', () => {
      render(<Shelf />);
      expect(groups()).toHaveLength(3);
      for (const label of ['PLAY', 'RENOWN', 'SKILL']) {
        expect(groupFor(label)).toBeTruthy();
      }
      for (const label of ['MAKE', 'COIN', 'STATUS', 'TIME', 'ONLINE', 'DOCKET']) {
        expect(
          screen.queryByLabelText(new RegExp(`^${label}:`)),
          `${label} was default-pinned`,
        ).toBeNull();
      }
    });

    it('renders all nine once they are pinned', () => {
      pinAll();
      render(<Shelf />);
      expect(groups()).toHaveLength(9);
    });

    /*
     * ⚠⚠ `TRAIT` is a permanent non-goal, not a deferral. The
     * psychology vocation rests on self-other asymmetry, and a pinned
     * always-on readout of your own personality is the stat sheet that
     * makes the therapist unnecessary. Asserted BY NAME so a catalogue
     * edit cannot reintroduce it quietly, and against the id
     * vocabulary too — the client-side twin of the server's guard.
     */
    it('⭐ TRAIT is absent, by name and by vocabulary', () => {
      pinAll();
      render(<Shelf />);
      expect(screen.queryByText(/TRAIT/)).toBeNull();
      for (const id of SHELF_ROW_IDS) {
        expect(id).not.toMatch(/trait|disposition|personality/i);
      }
      for (const row of SHELF_CATALOGUE) {
        expect(row.label).not.toMatch(/trait|disposition|personality/i);
        expect(row.desc).not.toMatch(/trait|disposition|personality/i);
      }
    });

    it('renders every row through Figure — no value escapes it', () => {
      pinAll();
      useStore.setState({ shelfFigures: LIVE_FIGURES });
      render(<Shelf />);
      const shelf = screen.getByTestId('shelf');
      expect(groups()).toHaveLength(9);

      // The structural form of "no shelf row prints a value outside
      // `Figure`": strip every figure group's text from the shelf's
      // own text and nothing numeric may remain.
      let outside = shelf.textContent ?? '';
      for (const g of groups()) {
        outside = outside.replace(g.textContent ?? '', '');
      }
      expect(outside).not.toMatch(/\d/);
    });
  });

  describe('the three live rows', () => {
    it('render server values', () => {
      useStore.setState({ shelfFigures: LIVE_FIGURES });
      render(<Shelf />);
      for (const label of ['PLAY', 'RENOWN', 'SKILL']) {
        expect(groupFor(label).getAttribute('data-figure-state')).toBe('live');
      }
      expect(groupFor('PLAY').getAttribute('aria-label')).toContain('nascent');
      expect(groupFor('RENOWN').getAttribute('aria-label')).toContain('4');
      expect(groupFor('SKILL').getAttribute('aria-label')).toContain(
        'metalwork',
      );
    });

    /*
     * ⭐ A measured zero is a REAL figure. The server distinguishes
     * "measured and found neutral" from "never materialized" — the
     * latter omits the key — so a `0` arriving here means the answer is
     * zero. An earlier cut rendered every zero as empty, which was
     * choosing which way to be wrong rather than fixing it.
     */
    it('⭐ renders a measured renown of 0 as live, not empty', () => {
      useStore.setState({
        shelfFigures: { stuffId: 'me', renown: { value: 0 } },
      });
      render(<Shelf />);
      const renown = groupFor('RENOWN');
      expect(renown.getAttribute('data-figure-state')).toBe('live');
      // `0.0`, not `0` — see `formatRenown`. The point of this test is
      // that a measured zero is LIVE rather than empty, which is
      // unchanged; only the rendered precision moved.
      expect(renown.getAttribute('aria-label')).toBe('RENOWN: 0.0');
    });

    /**
     * ⚠ Found by DRIVING: the shelf read `RENOWN 1.1004871063830723`.
     *
     * Renown is a signed, continuous, log-saturated score with no
     * natural unit, so the digits past the first decimal are float
     * residue rather than measurement — sixteen of them assert a
     * precision the value-function does not have. The shelf is a glance
     * surface; a glance wants the magnitude.
     */
    it('⭐ renders a float renown at glance resolution, not raw', () => {
      useStore.setState({
        shelfFigures: { stuffId: 'me', renown: { value: 1.1004871063830723 } },
      });
      render(<Shelf />);
      const renown = groupFor('RENOWN');
      expect(renown.getAttribute('data-figure-state')).toBe('live');
      expect(renown.getAttribute('aria-label')).toBe('RENOWN: 1.1');
    });

    it('keeps the sign on a negative renown — notoriety is real', () => {
      useStore.setState({
        shelfFigures: { stuffId: 'me', renown: { value: -2.47 } },
      });
      render(<Shelf />);
      expect(groupFor('RENOWN').getAttribute('aria-label')).toBe(
        'RENOWN: -2.5',
      );
    });

    it('renders an ABSENT renown as empty, with a reason', () => {
      useStore.setState({ shelfFigures: { stuffId: 'me' } });
      render(<Shelf />);
      const renown = groupFor('RENOWN');
      expect(renown.getAttribute('data-figure-state')).toBe('empty');
      expect(renown.getAttribute('aria-label')).toContain('no renown recorded');
    });

    /*
     * `null` is the transcript answering "nothing"; absent is the fold
     * not having landed. Two different facts, two different reasons.
     */
    it('tells a null competence from an absent one', () => {
      useStore.setState({
        shelfFigures: { stuffId: 'me', practisingCompetence: null },
      });
      const { unmount } = render(<Shelf />);
      expect(groupFor('SKILL').getAttribute('aria-label')).toContain(
        'nothing being practised',
      );
      unmount();

      useStore.setState({ shelfFigures: { stuffId: 'me' } });
      render(<Shelf />);
      expect(groupFor('SKILL').getAttribute('aria-label')).toContain(
        'transcript fold',
      );
    });
  });

  describe('the five hatched rows', () => {
    it('render unwired, with NO digit anywhere in them', () => {
      pinAll();
      useStore.setState({ shelfFigures: LIVE_FIGURES });
      render(<Shelf />);
      for (const label of ['COIN', 'STATUS', 'TIME', 'ONLINE', 'DOCKET']) {
        const g = groupFor(label);
        expect(g.getAttribute('data-figure-state'), label).toBe('unwired');
        expect(g.textContent ?? '', label).not.toMatch(/\d/);
      }
    });

    /*
     * ⭐⭐ MAKE left this set when the account roll-up landed, and the
     * REASON left with it. Its hatch copy said the account arithmetic
     * was unbuilt — true when written, false the moment
     * `standingForAccount` shipped, and still on screen.
     *
     * ⚠ This is the second time a stale reason has shipped here (the
     * round-trip row once claimed nothing measured round trip while the
     * protocol existed end to end), and both were found by DRIVING, not
     * by the suite. So the retired string is guarded: a reason pointing
     * at the wrong place is worse than no reason, because it is
     * confidently actionable and false.
     */
    it('⭐⭐ MAKE is live, and its retired reason is gone from the source', () => {
      pinAll();
      useStore.setState({ shelfFigures: LIVE_FIGURES });
      render(<Shelf />);
      const make = groupFor('MAKE');
      expect(make.getAttribute('data-figure-state')).toBe('live');
      expect(make.textContent ?? '').toContain('dormant');

      for (const copy of Object.values(HATCH_COPY)) {
        expect(copy).not.toMatch(/account arithmetic/i);
      }
    });

    /*
     * ⚠ Absent is NOT zero and NOT a per-character fallback. When the
     * server could not resolve the account the row must say so.
     */
    it('MAKE hatches with an account reason when the server sent none', () => {
      pinAll();
      useStore.setState({
        shelfFigures: { ...LIVE_FIGURES, makeStanding: undefined },
      });
      render(<Shelf />);
      const make = groupFor('MAKE');
      expect(make.getAttribute('data-figure-state')).toBe('empty');
      expect(make.getAttribute('aria-label') ?? '').toMatch(/account/i);
    });

    /*
     * ⭐ The three claims must stay three. They tell the next builder
     * WHERE to look — a missing field is one field away, an
     * account-level gap is arithmetic, and a world figure needs a
     * different card entirely. One generic string erases all of that.
     */
    it('⭐ the hatch reasons are pairwise distinct', () => {
      const reasons = Object.values(HATCH_COPY);
      expect(new Set(reasons).size).toBe(reasons.length);
      // ⚠ Two, not three: `level` was retired with the account
      // roll-up. The count is asserted so SHRINKING the vocabulary
      // stays as deliberate an act as widening it.
      expect(reasons).toHaveLength(2);
    });

    it.each([
      ['make', 'live'],
      ['coin', 'unexposed'],
      ['status', 'unexposed'],
      ['time', 'not-self'],
      ['online', 'not-self'],
      ['docket', 'not-self'],
      ['play', 'live'],
      ['renown', 'live'],
      ['skill', 'live'],
    ])('classifies %s as %s', (id, source) => {
      const row = SHELF_CATALOGUE.find((r) => r.id === id);
      expect(row?.source).toBe(source);
    });
  });

  describe('layout', () => {
    /*
     * ⚠ The rule is WRAPS, NEVER SCROLLS: nothing the player pinned may
     * be out of sight, and a horizontal scroller hides figures behind a
     * gesture. Asserted on the emitted CSS rule, which jsdom does give
     * us — unlike a resolved `var()` colour.
     */
    it('wraps rather than scrolling', () => {
      pinAll();
      render(<Shelf />);
      const style = getComputedStyle(screen.getByTestId('shelf'));
      expect(style.flexWrap).toBe('wrap');
      expect(style.overflowX === 'auto' || style.overflowX === 'scroll').toBe(
        false,
      );
    });
  });

  describe('pinning is a command', () => {
    function openMenu() {
      fireEvent.click(screen.getByLabelText('Add or remove a shelf widget'));
      return screen.getByTestId('shelf-menu');
    }

    it('a click DISPATCHES rather than mutating local state', () => {
      const onCommandClick = vi.fn();
      render(<Shelf onCommandClick={onCommandClick} />);
      const menu = openMenu();
      // `coin` is NOT default-pinned, so its affordance PINS it — the
      // real path now that the hatched six start off the bar.
      fireEvent.click(
        within(menu).getByText('COIN').closest('button') as HTMLElement,
      );
      expect(onCommandClick).toHaveBeenCalledWith('cockpit shelf pin coin');
      // ⚠ And nothing moved client-side. The server owns the shelf; a
      // local mutation would falsify the axiom the status bar makes.
      expect(useStore.getState().clientState['cockpit.shelf']).toBeUndefined();
    });

    it('sends an UNPIN for a row that IS on the shelf', () => {
      const onCommandClick = vi.fn();
      pinAll();
      render(<Shelf onCommandClick={onCommandClick} />);
      const menu = openMenu();
      fireEvent.click(
        within(menu).getByText('COIN').closest('button') as HTMLElement,
      );
      expect(onCommandClick).toHaveBeenCalledWith('cockpit shelf unpin coin');
    });

    /*
     * ⚠⚠ **Every row names its ACTION; none of them names `—`.**
     *
     * The state column used to read `pinned` or `—`, and `—` is the
     * glyph an EMPTY figure uses. So an unpinned row wore the costume
     * of a broken one — and `MAKE` made that concrete: it is live and
     * pinnable, but sat under a `—` with no reason line beneath it
     * (live rows have none), which read as *more* broken than the
     * hatched rows around it, all of which at least explained
     * themselves.
     *
     * ⭐ Asserted as "the glyph appears nowhere in this menu" rather
     * than as "MAKE says add". The specific row that exposed it is an
     * accident of which figures happen to be live today; the rule is
     * that a menu of buttons never labels one with a placeholder.
     */
    it('⭐ labels every row with its action, never the empty glyph', () => {
      render(<Shelf onCommandClick={vi.fn()} />);
      const menu = openMenu();

      // ⚠ Scoped to the state column. The em-dash is legitimate INSIDE
      // a reason ("not a figure about you — a world figure"), so a
      // whole-menu text scan would fail on correct copy — which is a
      // test asserting the wrong thing, not a stricter one.
      const states = within(menu)
        .getAllByTestId('shelf-menu-state')
        .map((el) => el.textContent);

      expect(states).toHaveLength(SHELF_CATALOGUE.length);
      expect(states).not.toContain('—');
      // Every row offers an action, and only these two exist.
      expect(new Set(states)).toEqual(new Set(['pinned', 'add']));
      // ⚠ Derived from `DEFAULT_SHELF`, not the literal 3 — a count
      // beside a list is computed from that list, or it is the next
      // figure asserted next to data that did not produce it.
      expect(states.filter((s) => s === 'pinned')).toHaveLength(
        DEFAULT_SHELF.length,
      );
    });

    /*
     * ⭐ Preview EQUALS send — asserted as one claim rather than as two
     * behaviours that happen to agree. That equality is the axiom the
     * status bar advertises, so a test that checked them separately
     * would be testing the wrong thing.
     */
    it('⭐ hover previews exactly the string a click sends', () => {
      const onCommandClick = vi.fn();
      const onCommandPreview = vi.fn();
      render(
        <Shelf
          onCommandClick={onCommandClick}
          onCommandPreview={onCommandPreview}
        />,
      );
      const menu = openMenu();
      const item = within(menu)
        .getByText('COIN')
        .closest('button') as HTMLElement;

      fireEvent.mouseEnter(item);
      const previewed = onCommandPreview.mock.calls[0]?.[0];
      fireEvent.click(item);
      const sent = onCommandClick.mock.calls[0]?.[0];

      expect(previewed).toBe(sent);
      expect(sent).toBe('cockpit shelf pin coin');
    });

    it('mouse-leave stops the preview', () => {
      const onCommandPreview = vi.fn();
      render(<Shelf onCommandPreview={onCommandPreview} />);
      const menu = openMenu();
      const item = within(menu)
        .getByText('COIN')
        .closest('button') as HTMLElement;
      fireEvent.mouseEnter(item);
      fireEvent.mouseLeave(item);
      expect(onCommandPreview).toHaveBeenLastCalledWith(null);
    });

    /*
     * The catalogue menu is where every reason is VISIBLE text — the
     * chip carries it in `title` and the accessible name, which is the
     * compact face of the same fact and never the only place it lives.
     */
    it('⭐ the widget menu shows every row with its reason in words', () => {
      // ⚠ This matters MORE now that the hatched six do not start on the
      // bar: the menu is the only place a player meets them, so it is
      // where the honesty convention has to do its work.
      render(<Shelf />);
      const menu = openMenu();
      for (const row of SHELF_CATALOGUE) {
        expect(within(menu).getByText(row.label)).toBeTruthy();
      }
      for (const reason of Object.values(HATCH_COPY)) {
        expect(menu.textContent ?? '').toContain(reason);
      }
    });
  });

  describe('the server owns the shelf', () => {
    it('renders exactly what cockpit.shelf says, in its order', () => {
      useStore.setState({
        clientState: { 'cockpit.shelf': ['renown', 'play'] },
      });
      render(<Shelf />);
      expect(groups()).toHaveLength(2);
      expect(groups()[0]!.getAttribute('aria-label')).toMatch(/^RENOWN:/);
      expect(groups()[1]!.getAttribute('aria-label')).toMatch(/^PLAY:/);
    });

    it('drops a stored row that is no longer in the vocabulary', () => {
      useStore.setState({
        clientState: { 'cockpit.shelf': ['play', 'trait', 'nonesuch'] },
      });
      render(<Shelf />);
      expect(groups()).toHaveLength(1);
    });
  });

  describe('the single-cardinality delta trap', () => {
    /*
     * ⚠ `self` is `cardinality: 'one'`. An `update` delta carries only
     * the fields that changed, so it must MERGE — replacing wholesale
     * would drop every field the poke did not touch, and the generic
     * `applyChanges` would append a second record instead of either.
     */
    it('an update delta merges into the record rather than replacing it', () => {
      useStore.setState({ shelfFigures: LIVE_FIGURES });
      useStore.getState().mergeShelfFigures({ renown: { value: 9 } });
      const next = useStore.getState().shelfFigures;
      expect(next?.renown).toEqual({ value: 9 });
      // The untouched fields survived.
      expect(next?.playStanding).toEqual({ band: 'nascent' });
      expect(next?.practisingCompetence).toEqual({
        discipline: 'metalwork',
        band: 'apprentice',
      });
      expect(next?.stuffId).toBe('me');
    });

    it('a merge with no prior record is dropped, not half-applied', () => {
      useStore.setState({ shelfFigures: null });
      useStore.getState().mergeShelfFigures({ renown: { value: 9 } });
      expect(useStore.getState().shelfFigures).toBeNull();
    });
  });
});
