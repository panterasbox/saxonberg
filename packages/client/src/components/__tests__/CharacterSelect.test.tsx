/**
 * CharacterSelect — the account's screen.
 *
 * ⭐ The assertions worth reading are the honest-state ones. This screen
 * carries more unbuilt surface than any other in the wave, and the value
 * of the wave is that each gap names its OWN reason rather than sharing
 * a generic one. A test that only checked "something hatched" would pass
 * against the failure the three-category convention exists to prevent.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
import type { CharGenRosterEntry } from '@saxonberg/types';
import { CharacterSelect } from '../CharacterSelect';
import { useStore } from '../../store/index';

function entry(over: Partial<CharGenRosterEntry> = {}): CharGenRosterEntry {
  return {
    playerId: 'p1',
    name: 'Maren Vask',
    species: 'human',
    description: 'a wright',
    lastSeen: Date.now() - 2 * 60 * 60 * 1000,
    playStanding: 'rising',
    lastLocation: "The Cartwright's Yard",
    binomial: 'Homo sapiens',
    portrait: 'species/sapiens.png',
    practice: [{ discipline: 'smithing', band: 'practised' }],
    ...over,
  };
}

function seed(
  roster: CharGenRosterEntry[],
  account: { make?: string; fund?: string } = {},
): void {
  act(() => {
    useStore.setState({
      charGenRoster: roster,
      accountStanding: account,
      autoEnterPending: false,
    });
  });
}

function renderSelect(onSendCommand = vi.fn()) {
  render(<CharacterSelect onSendCommand={onSendCommand} />);
  return onSendCommand;
}

describe('CharacterSelect', () => {
  beforeEach(() => {
    seed([]);
  });

  it('reads the roster figures the payload has always carried', () => {
    seed([entry()]);
    renderSelect();
    const detail = screen.getByTestId('roster-detail');
    expect(detail.textContent).toMatch(/rising/);
    expect(detail.textContent).toMatch(/Cartwright/);
    expect(screen.getByTestId('practice-record').textContent).toMatch(
      /smithing/,
    );
  });

  /**
   * ⭐ A single-character account opens straight on the detail. The
   * list answers *who*, and with one character that question has one
   * answer.
   */
  it('opens straight on the detail for a one-character account', () => {
    seed([entry()]);
    renderSelect();
    expect(screen.getByTestId('roster-detail')).toBeTruthy();
  });

  it('waits for a pick when the account has several characters', () => {
    seed([entry(), entry({ playerId: 'p2', name: 'Korrin' })]);
    renderSelect();
    expect(screen.queryByTestId('roster-detail')).toBeNull();
    act(() => {
      screen.getByTestId('roster-card-p2').click();
    });
    expect(screen.getByTestId('roster-detail').textContent).toMatch(/Korrin/);
  });

  /**
   * ⚠ Never a zero. A zero says "we measured, and it is nothing"; the
   * truth for a character nobody has taken out is that nothing has been
   * measured at all.
   */
  it('shows a never-played character a reason, not a zero', () => {
    seed([
      entry({
        lastSeen: undefined,
        playStanding: undefined,
        lastLocation: undefined,
        practice: [],
      }),
    ]);
    renderSelect();
    const detail = screen.getByTestId('roster-detail');
    expect(detail.textContent).toMatch(/never taken out/);
    expect(detail.textContent).not.toMatch(/\b0\b/);
  });

  /**
   * ⭐⭐ The three hatch reasons are DISTINCT claims. Collapsing them
   * into one string would send the next reader to the wrong place —
   * which is the failure the three-category convention exists to
   * prevent, and which a previous build shipped anyway.
   */
  it('names a different reason for each different gap', () => {
    seed([entry()], {});
    renderSelect();

    const since = screen.getByTestId('since-you-left').textContent ?? '';
    // Account standing is a METER band in the header now, not a card.
    const meters = screen.getByTestId('account-standing').textContent ?? '';
    const retire =
      screen.getByTestId('roster-unbuilt-retire').textContent ?? '';

    // ⚠ The reason CHANGED when the record layer shipped: the server
    // now keeps what you were told, so the old sentence ("nothing
    // records what happened…") became false. What is still missing is
    // the DIGEST that reads it back, and that is what the hatch says.
    expect(since).toMatch(/nothing reads it back/i);
    expect(since).not.toMatch(/not kept for you between sessions/i);
    expect(meters).toMatch(/no faucet/i);
    expect(retire).toMatch(/no retire command exists/i);

    // Three gaps, three sentences — none of them the same words.
    expect(since).not.toEqual(retire);
  });

  /** ⚠ Make hatches when the server could not resolve the account. */
  it('hatches account Make when the server sent none', () => {
    seed([entry()], {});
    renderSelect();
    expect(document.body.textContent).toMatch(/could not be resolved/i);
  });

  it('renders account Make live when the server sent it', () => {
    seed([entry()], { make: 'established' });
    renderSelect();
    expect(document.body.textContent).toMatch(/established/);
  });

  /** ⭐ The axiom: every clickable previews exactly what it sends. */
  it('previews the command the enter control sends, and sends it', () => {
    seed([entry()]);
    const send = renderSelect();
    expect(screen.getByTestId('roster-sends-as').textContent).toBe(
      'sends as play p1',
    );
    act(() => {
      screen.getByTestId('roster-play-p1').click();
    });
    expect(send).toHaveBeenCalledWith('play p1');
  });

  /**
   * ⚠ Retire RENDERS, disabled, naming its reason — a missing control
   * would hide a gap the screen itself raises (a roster grows and
   * nothing shelves a character), and a live one would promise a
   * command that does not exist.
   *
   * ⭐ Rename and appearance are GONE, not hatched. Hatching is for a
   * gap the surface implies; it is not an obligation to enumerate every
   * verb the world lacks, and a disabled control that exists only to
   * say "not built" is clutter dressed as honesty.
   */
  it('keeps retire as a reasoned stub and drops the rest', () => {
    seed([entry()]);
    renderSelect();
    const retire = screen.getByTestId('roster-unbuilt-retire');
    expect((retire as HTMLButtonElement).disabled).toBe(true);
    expect(retire.textContent).toMatch(/no retire command exists/i);

    expect(screen.queryByTestId('roster-unbuilt-rename')).toBeNull();
    expect(screen.queryByTestId('roster-unbuilt-appearance')).toBeNull();
  });

  /**
   * ⭐ The binomial, not the common name. The world models species
   * properly and the roster is a good place to show it — the art heads
   * both the row and the detail with it.
   */
  it('names a character by binomial when the server sent one', () => {
    seed([entry()]);
    renderSelect();
    expect(document.body.textContent).toMatch(/Homo sapiens/);
  });

  /** ⚠ Falls back to the common name rather than showing nothing. */
  it('falls back to the common name when no binomial arrived', () => {
    seed([entry({ binomial: undefined })]);
    renderSelect();
    expect(document.body.textContent).toMatch(/human/);
  });

  /**
   * ⚠ The plate is the SPECIES portrait — no per-character art exists.
   * Absent, it degrades to initials rather than a broken image.
   */
  it('renders the species plate, and initials when there is none', () => {
    seed([entry()]);
    const { unmount } = render(<CharacterSelect onSendCommand={vi.fn()} />);
    expect(
      screen.getByTestId('roster-portrait-p1').querySelector('img'),
    ).toBeTruthy();
    unmount();

    seed([entry({ portrait: undefined })]);
    renderSelect();
    expect(screen.getByTestId('roster-portrait-p1').textContent).toBe('MV');
  });

  /**
   * ⭐ NEW is DERIVED from `lastSeen` being absent, not a second field
   * that could disagree with it.
   * ⚠ And there is no RETIRED badge, because nothing can retire a
   * character — a badge would advertise a state the world cannot enter.
   */
  it('flags a never-played character NEW, and never flags RETIRED', () => {
    seed([entry({ lastSeen: undefined })]);
    renderSelect();
    expect(document.body.textContent).toMatch(/NEW/);
    expect(document.body.textContent).not.toMatch(/RETIRED/);
  });

  it('names the account, because this screen is about the person', () => {
    act(() => {
      useStore.setState({ accountName: 'maren.vask@example.com' });
    });
    seed([entry()]);
    renderSelect();
    expect(document.body.textContent).toMatch(/maren\.vask@example\.com/);
  });

  it('still shows a quiet line while the roster is empty', () => {
    seed([]);
    renderSelect();
    expect(within(screen.getByTestId('roster-screen')).getByText(/Connecting/));
  });
});
