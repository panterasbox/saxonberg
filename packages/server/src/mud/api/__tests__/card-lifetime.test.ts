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

const WINDOW = 60_000;

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
    expect(CardApi._sweepNowForTesting(WINDOW, Date.now())).toBe(0);
    expect(CardApi._getSizeForTesting()).toBe(1);

    // Past it: gone, with a reason.
    expect(
      CardApi._sweepNowForTesting(WINDOW, Date.now() + WINDOW + 1),
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
      CardApi._sweepNowForTesting(WINDOW, Date.now() + WINDOW * 1000),
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
    const later = Date.now() + WINDOW - 1;

    // Re-issue just before it would lapse…
    openWho(h);
    // …and the sweep at the moment it WOULD have lapsed finds it fresh.
    expect(CardApi._sweepNowForTesting(WINDOW, later)).toBe(0);
    expect(CardApi._getSizeForTesting()).toBe(1);
  });

  it('a dismissed card ages out again — the override goes both ways', async () => {
    const h = await makeHarness();
    openWho(h);
    CardApi.setPinned(h.interactive, 'who', true);
    expect(
      CardApi._sweepNowForTesting(WINDOW, Date.now() + WINDOW + 1),
    ).toBe(0);

    CardApi.setPinned(h.interactive, 'who', false);
    expect(
      CardApi._sweepNowForTesting(WINDOW, Date.now() + WINDOW * 2),
    ).toBe(1);
    expect(h.ofType('card-closed')[0]!.reason).toBe('aged-out');
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
