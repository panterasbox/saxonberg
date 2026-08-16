/**
 * ⭐ **Pinned or unpinned is the whole lifetime** (decision 2, AC 4).
 *
 * An unpinned card closes on its relevance window **and states the
 * reason**; a pinned card does not close. A card that vanishes without
 * a reason reads as a bug, and the player cannot tell a rule from a
 * defect.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { CardApi } from '../card';
import { StuffApi } from '../stuff';
import { EventApi } from '../event';
import { ShadowApi } from '../shadow';
import { MqlSubscriptionApi } from '../mql-subscription';
import { CARDS } from '../../lib/connection/Cards';
import { makeHarness, makeContext, type Harness } from './card-harness';

/**
 * ⚠ The sweep's FALLBACK, not the window. The window is the
 * `cards.window` setting (600 s by default), which is what every case
 * below actually moves — see `CardRegistry.sweep`.
 */
const FALLBACK = 60_000;
/** The schema default, in ms — what an untouched player's window is. */
const DEFAULT_WINDOW = 600_000;

function openWho(h: Harness, text = 'who'): string | null {
  return CardApi.open(
    makeContext(h, { commandText: text, verbs: ['who'], opensCard: 'who' }),
    'who',
  );
}

describe('a card lives on one axis: pinned or not', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    MqlSubscriptionApi._clearAllForTesting();
    CardApi._clearAllForTesting();
  });

  it('an unpinned card ages out, and the close CARRIES ITS REASON', async () => {
    const h = await makeHarness();
    const id = openWho(h);
    expect(CardApi._getSizeForTesting()).toBe(1);

    // Inside the window: nothing goes.
    expect(CardApi._sweepNowForTesting(FALLBACK, Date.now())).toBe(0);
    expect(CardApi._getSizeForTesting()).toBe(1);

    // Past it: gone, with a reason.
    expect(
      CardApi._sweepNowForTesting(FALLBACK, Date.now() + DEFAULT_WINDOW + 1),
    ).toBe(1);
    expect(CardApi._getSizeForTesting()).toBe(0);

    const closed = h.ofType('card-closed');
    expect(closed.length).toBe(1);
    expect(closed[0]!.instanceId).toBe(id);
    expect(closed[0]!.reason).toBe('aged-out');
  });

  it('a pinned card does NOT close, however long it sits', async () => {
    const h = await makeHarness();
    openWho(h);
    CardApi.setPinned(h.interactive, 'who', true);

    expect(
      CardApi._sweepNowForTesting(FALLBACK, Date.now() + DEFAULT_WINDOW * 100),
    ).toBe(0);
    expect(CardApi._getSizeForTesting()).toBe(1);
    expect(h.ofType('card-closed').length).toBe(0);
  });

  it('the catalogue default decides pinned-ness, and `auto` restores it', async () => {
    const h = await makeHarness();
    openWho(h);
    // `who` ships unpinned.
    expect(CARDS.who.pinnedByDefault).toBe(false);
    expect(CardApi.list(h.interactive)[0]!.pinned).toBe(false);

    CardApi.setPinned(h.interactive, 'who', true);
    expect(CardApi.list(h.interactive)[0]!.pinned).toBe(true);
    expect(h.ofType('card-pinned').length).toBe(1);
    expect(h.ofType('card-pinned')[0]!.pinned).toBe(true);

    // `null` = hand the decision back to the catalogue.
    CardApi.setPinned(h.interactive, 'who', null);
    expect(CardApi.list(h.interactive)[0]!.pinned).toBe(
      CARDS.who.pinnedByDefault,
    );
  });

  it('touching a card resets its window', async () => {
    const h = await makeHarness();
    openWho(h);
    const later = Date.now() + DEFAULT_WINDOW - 1;

    // Re-issue just before it would lapse…
    openWho(h);
    // …and the sweep at the moment it WOULD have lapsed finds it fresh.
    expect(CardApi._sweepNowForTesting(FALLBACK, later)).toBe(0);
    expect(CardApi._getSizeForTesting()).toBe(1);
  });

  it('a dismissed card ages out again — the override goes both ways', async () => {
    const h = await makeHarness();
    openWho(h);
    CardApi.setPinned(h.interactive, 'who', true);
    expect(
      CardApi._sweepNowForTesting(FALLBACK, Date.now() + DEFAULT_WINDOW + 1),
    ).toBe(0);

    CardApi.setPinned(h.interactive, 'who', false);
    expect(
      CardApi._sweepNowForTesting(FALLBACK, Date.now() + DEFAULT_WINDOW * 2),
    ).toBe(1);
    expect(h.ofType('card-closed')[0]!.reason).toBe('aged-out');
  });

  /**
   * ⚠⚠ Found by DRIVING. Two `who` cards can be open at once (`who` and
   * `who --here` are different commands, so different cards), and
   * resolving the pin by catalogue name first meant both cards' controls
   * sent `cockpit card pin who` — **two controls, identical labels,
   * acting on one thing.** The KEY is the card's identity and is unique
   * by construction, so it resolves first.
   */
  it('⚠⚠ setPinned resolves the KEY first, so two of a kind are distinct', async () => {
    const h = await makeHarness();
    openWho(h, 'who');
    openWho(h, 'who --here');
    expect(CardApi.list(h.interactive).length).toBe(2);

    expect(CardApi.setPinned(h.interactive, 'who --here', true)).toBe(true);
    const byKey = new Map(
      CardApi.list(h.interactive).map((c) => [c.key, c.pinned]),
    );
    expect(byKey.get('who --here')).toBe(true);
    // ⭐ The OTHER one is untouched — which is the whole point.
    expect(byKey.get('who')).toBe(false);
  });

  it('the catalogue name still resolves — the form the verb\'s help shows', async () => {
    const h = await makeHarness();
    openWho(h, 'who');
    expect(CardApi.setPinned(h.interactive, 'who', true)).toBe(true);
    expect(CardApi.list(h.interactive)[0]!.pinned).toBe(true);
  });

  /**
   * ⭐ **The window is a per-player SETTING**, not a constant — which is
   * what lets a player shorten theirs to watch a card age out and say
   * so, without changing anybody else's.
   *
   * ⚠ A fact about TIME rather than about the world, which is what
   * makes it a legitimate duration at all: a clock on a world CONDITION
   * would end something still actionable.
   */
  it('⭐ `cards.window` overrides the sweep default, per player', async () => {
    const h = await makeHarness();
    openWho(h);
    // Five seconds, where the schema default is ten minutes.
    h.avatar.setSetting('cards.window', 5, h.avatar);

    // Still inside the player's own window.
    expect(CardApi._sweepNowForTesting(FALLBACK, Date.now() + 4_000)).toBe(0);
    // Past it — and well INSIDE the ten-minute default, which is what
    // proves the setting is the one being read.
    expect(CardApi._sweepNowForTesting(FALLBACK, Date.now() + 6_000)).toBe(1);
    expect(h.ofType('card-closed')[0]!.reason).toBe('aged-out');
  });

  it('⚠ a pinned card ignores the setting entirely', async () => {
    const h = await makeHarness();
    openWho(h);
    h.avatar.setSetting('cards.window', 5, h.avatar);
    CardApi.setPinned(h.interactive, 'who', true);
    expect(
      CardApi._sweepNowForTesting(FALLBACK, Date.now() + 60_000),
    ).toBe(0);
  });

  /**
   * ⚠⚠ **A session must never fail because a card could not open.**
   *
   * `Avatar.enter` applies the mode's arrangement, so the card layer
   * now runs on the login path. A partial or holderless Interactive
   * must yield a missing card — which the player re-opens with one
   * command — and never a throw, which is a player who cannot log in.
   * Found when `Avatar.enter`'s own tests, which use a stub
   * Interactive, started failing on `getHolder is not a function`.
   */
  it('⚠⚠ a partial Interactive yields no card, never a throw', async () => {
    const stub = {} as unknown as Parameters<typeof CardApi.push>[0];
    expect(() => CardApi.push(stub, 'who')).not.toThrow();
    expect(CardApi.push(stub, 'who')).toBeNull();
    expect(() =>
      CardApi.applyArrangement(stub, ['who', 'news']),
    ).not.toThrow();
    expect(() => CardApi._sweepNowForTesting(FALLBACK)).not.toThrow();
  });

  it('an explicit close states its own reason', async () => {
    const h = await makeHarness();
    const id = openWho(h);
    expect(CardApi.close(h.interactive, id!, 'dismissed')).toBe(true);
    expect(h.ofType('card-closed')[0]!.reason).toBe('dismissed');
    // …and closing something that is not open is a no-op, not a throw.
    expect(CardApi.close(h.interactive, id!, 'dismissed')).toBe(false);
  });

  it('an arrangement closes what it does not name, saying `rearranged`', async () => {
    const h = await makeHarness();
    openWho(h);
    const { opened, closed } = CardApi.applyArrangement(h.interactive, [
      'news',
    ]);
    expect(closed).toBe(1);
    expect(opened).toBe(1);
    const reasons = h.ofType('card-closed').map((e) => e.reason);
    expect(reasons).toEqual(['rearranged']);
  });

  it('an arrangement leaves a card it still names alone, pin and all', async () => {
    const h = await makeHarness();
    openWho(h);
    CardApi.setPinned(h.interactive, 'who', true);
    const before = CardApi.list(h.interactive)[0]!.instanceId;

    const { opened, closed } = CardApi.applyArrangement(h.interactive, [
      'who',
    ]);
    expect({ opened, closed }).toEqual({ opened: 0, closed: 0 });
    const after = CardApi.list(h.interactive)[0]!;
    expect(after.instanceId).toBe(before);
    expect(after.pinned).toBe(true);
  });

  /**
   * ⚠ An arrangement is a statement about a WORKSPACE; a card about a
   * particular thing is a statement about a MOMENT. Restoring one next
   * week would be restoring an answer to a question nobody is asking.
   */
  it('an arrangement never opens or closes a subject card', async () => {
    const h = await makeHarness();
    CardApi.open(
      makeContext(h, {
        commandText: 'look lamp',
        verbs: ['look', 'l', 'examine', 'exa'],
        opensCard: 'subject',
      }),
      'subject',
    );
    const { opened, closed } = CardApi.applyArrangement(h.interactive, [
      'subject',
    ]);
    expect({ opened, closed }).toEqual({ opened: 0, closed: 0 });
    // The subject card is still there, untouched by the rearrange.
    expect(CardApi.list(h.interactive).map((c) => c.cardId)).toEqual([
      'subject',
    ]);
  });
});
