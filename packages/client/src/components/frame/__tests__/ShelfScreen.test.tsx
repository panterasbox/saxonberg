/**
 * The shelf-choosing screen — the glance-line as the scarce slot it is,
 * and the rest of the catalogue one drag away.
 *
 * ⚠ Geometric claims (overflow at 320px, tap-target size) are e2e. What
 * is asserted here is what the surface SAYS and what it SENDS.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { SHELF_ROW_IDS } from '@saxonberg/types';
import { ShelfScreen } from '../ShelfScreen';
import { HATCH_COPY, SHELF_CATALOGUE } from '../Shelf';
import { useStore } from '../../../store/index';

vi.mock('../../../services/websocket', () => ({
  websocketClient: {
    subscribeMql: () => 'sub-self',
    unsubscribe: () => {},
    onEnvelope: () => {},
    offEnvelope: () => {},
  },
}));

function setShelf(rows: string[]): void {
  useStore.setState({ clientState: { 'cockpit.shelf': rows } });
}

/** Every command any affordance on the screen would send. */
function commands(): string[] {
  return Array.from(
    screen.getByTestId('shelf-screen').querySelectorAll('[data-command]'),
  ).map((el) => el.getAttribute('data-command') ?? '');
}

describe('ShelfScreen', () => {
  beforeEach(() => {
    useStore.setState({ clientState: {}, shelfFigures: null });
  });

  it('names the glance-line as its own section, above the catalogue', () => {
    setShelf(['play', 'renown', 'skill', 'coin']);
    render(<ShelfScreen onClose={() => {}} />);
    const text = screen.getByTestId('shelf-screen').textContent ?? '';
    expect(text).toContain('On the bar');
    expect(text).toContain('Everything the shelf can show');
    // The head three, and only those, in the bar section.
    expect(screen.getByTestId('glance-row-play')).toBeTruthy();
    expect(screen.getByTestId('glance-row-skill')).toBeTruthy();
    expect(screen.queryByTestId('glance-row-coin')).toBeNull();
  });

  it('lists the whole catalogue in catalogue order', () => {
    render(<ShelfScreen onClose={() => {}} />);
    for (const id of SHELF_ROW_IDS) {
      expect(screen.getByTestId(`catalogue-row-${id}`)).toBeTruthy();
    }
  });

  /*
   * ⚠ VISIBLE text, not a `title` attribute. A phone has no hover, so a
   * tooltip reason is a reason nobody can read — which would make "each
   * with its reason" true of the markup and false of the surface.
   */
  it('⚠ shows every hatch reason as visible text, and no digit', () => {
    render(<ShelfScreen onClose={() => {}} />);
    for (const row of SHELF_CATALOGUE) {
      if (row.source === 'live') continue;
      const el = screen.getByTestId(`catalogue-row-${row.id}`);
      expect(el.textContent ?? '').toContain(HATCH_COPY[row.source]);
      // ⚠ And no number: a hatched row that printed a digit would be
      // the exact failure the convention exists to prevent.
      const reason = (el.textContent ?? '').replace(row.desc, '');
      expect(reason).not.toMatch(/\d/);
    }
  });

  /*
   * ⚠ Absent BY DESIGN — they are not shelf rows at all, and
   * `cockpit shelf unpin identity` refusing with "unknown shelf row" is
   * a stronger guarantee than a rule in this file.
   */
  it('⚠ offers no identity or connection row', () => {
    render(<ShelfScreen onClose={() => {}} />);
    expect(screen.queryByTestId('catalogue-row-identity')).toBeNull();
    expect(screen.queryByTestId('catalogue-row-connection')).toBeNull();
    for (const cmd of commands()) {
      expect(cmd).not.toMatch(/\b(identity|connection)\b/);
    }
  });

  /*
   * ⭐ Every affordance is a command, and NOTHING mutates locally. The
   * server writes `cockpit.shelf` and pushes it back.
   */
  it('⭐ every affordance sends cockpit shelf, and mutates nothing locally', () => {
    setShelf(['play']);
    const sent: string[] = [];
    render(<ShelfScreen onClose={() => {}} onCommandClick={(c) => sent.push(c)} />);

    const before = useStore.getState().clientState['cockpit.shelf'];
    for (const cmd of commands()) expect(cmd).toMatch(/^cockpit shelf /);

    fireEvent.click(
      within(screen.getByTestId('catalogue-row-coin')).getByText('to bar'),
    );
    expect(sent).toEqual(['cockpit shelf first coin']);
    // ⚠ The store is untouched — the screen asked, it did not decide.
    expect(useStore.getState().clientState['cockpit.shelf']).toBe(before);
  });

  it('offers pin for an unpinned row and unpin for a pinned one', () => {
    setShelf(['play']);
    const sent: string[] = [];
    render(<ShelfScreen onClose={() => {}} onCommandClick={(c) => sent.push(c)} />);

    fireEvent.click(
      within(screen.getByTestId('catalogue-row-coin')).getByText('pin'),
    );
    fireEvent.click(
      within(screen.getByTestId('catalogue-row-play')).getByText('unpin'),
    );
    expect(sent).toEqual(['cockpit shelf pin coin', 'cockpit shelf unpin play']);
  });

  /*
   * ⭐ `first` on a row that is not pinned at all still reads as one
   * intention — the server pins it at the front rather than refusing.
   */
  it('⭐ offers "to bar" for a row that is not even on the shelf', () => {
    setShelf([]);
    render(<ShelfScreen onClose={() => {}} />);
    const row = screen.getByTestId('catalogue-row-docket');
    expect(
      within(row).getByText('to bar').getAttribute('data-command'),
    ).toBe('cockpit shelf first docket');
  });
});
