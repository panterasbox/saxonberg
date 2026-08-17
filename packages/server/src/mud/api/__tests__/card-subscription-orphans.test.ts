/**
 * ⚠ **The drift this build's structure bought, and the test that closes
 * it.**
 *
 * `inspection-pane.md` argued the card set should BE the subscription
 * registry, because then there is no second registry to drift. That
 * argument rested on every card being a subscription; after this build
 * most are static, so the identity is broken and the two are separate
 * substrates.
 *
 * The risk moved to *card ↔ its subscription handle*. It is closed by
 * making the card OWN the handle — `instanceId === subscriptionId`, one
 * teardown path — and by this file, which asserts the count rather than
 * trusting the intention.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { CardApi } from '../card';
import { StuffApi } from '../stuff';
import { EventApi } from '../event';
import { ShadowApi } from '../shadow';
import { MqlSubscriptionApi } from '../mql-subscription';
import { ContainmentApi } from '../containment';
import Room from '../../obj/location/Room';
import { makeHarness, makeContext } from './card-harness';

describe('a card owns its subscription handle', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    MqlSubscriptionApi._clearAllForTesting();
    CardApi._clearAllForTesting();
  });

  it('closing every card leaves ZERO orphan subscriptions', async () => {
    const h = await makeHarness();
    const room = await StuffApi.create(() => new Room());
    room.setShortDescription('the lounge');
    ContainmentApi.move(h.avatar, room);

    // A live card (owns a handle), and three static ones (own none).
    CardApi.push(h.interactive, 'subject', { subjectId: room.stuffId });
    CardApi.open(
      makeContext(h, { commandText: 'who', verbs: ['who'], opensCard: 'who' }),
      'who',
    );
    CardApi.open(
      makeContext(h, {
        commandText: 'who --here',
        verbs: ['who'],
        opensCard: 'who',
      }),
      'who',
    );
    CardApi.open(
      makeContext(h, {
        commandText: 'look lamp',
        verbs: ['look', 'l', 'examine', 'exa'],
        opensCard: 'subject',
      }),
      'subject',
    );
    expect(CardApi._getSizeForTesting()).toBe(4);
    expect(MqlSubscriptionApi._getRegistrySizeForTesting()).toBe(1);

    for (const card of CardApi.list(h.interactive)) {
      CardApi.close(h.interactive, card.instanceId, 'dismissed');
    }

    expect(CardApi._getSizeForTesting()).toBe(0);
    expect(MqlSubscriptionApi._getRegistrySizeForTesting()).toBe(0);
  });

  it('the sweep tears the handle down too', async () => {
    const h = await makeHarness();
    const room = await StuffApi.create(() => new Room());
    room.setShortDescription('the lounge');
    ContainmentApi.move(h.avatar, room);

    // `place` ships pinned; unpin it so the window can reach it.
    CardApi.push(h.interactive, 'subject', { subjectId: room.stuffId });
    CardApi.setPinned(h.interactive, 'subject', false);
    expect(MqlSubscriptionApi._getRegistrySizeForTesting()).toBe(1);

    /*
     * ⚠ The WINDOW is the `cards.window` setting (600 s by default),
     * not the sweep's fallback argument — the fallback is reached only
     * for a holder carrying no settings schema at all. Shorten the
     * player's own, which is exactly what the drive does.
     */
    h.avatar.setSetting('cards.window', 5, h.avatar);
    expect(CardApi._sweepNowForTesting(60_000, Date.now() + 6_000)).toBe(1);
    expect(MqlSubscriptionApi._getRegistrySizeForTesting()).toBe(0);
  });

  it('a rearrange tears down what it manages and leaves inspection alone', async () => {
    const h = await makeHarness();
    const room = await StuffApi.create(() => new Room());
    room.setShortDescription('the lounge');
    ContainmentApi.move(h.avatar, room);

    /*
     * ⚠⚠ **An arrangement does not own the inspection feed.**
     *
     * This test used to assert that a rearrange reaped the `place`
     * card's handle, and it was right when an arrangement was the only
     * way a card got born. It is now wrong in shape: a subject-bound
     * card is minted by LOOKING, so a `cockpit` rearrangement that
     * closed it would silently wipe the history of everything the
     * player had inspected — a rearrangement of the furniture that
     * throws out the mail. `applyArrangement` skips subject cards on
     * both sides (what it closes and what it names), which is what the
     * middle assertion here pins.
     *
     * The handle is still owned — the sweep and an explicit close both
     * reap it, and each has its own test above. What must not exist is
     * a THIRD outcome where the card is gone and the handle isn't.
     */
    CardApi.push(h.interactive, 'subject', { subjectId: room.stuffId });
    CardApi.open(
      makeContext(h, {
        commandText: 'press',
        verbs: ['press'],
        opensCard: 'news',
      }),
      'news',
    );
    expect(MqlSubscriptionApi._getRegistrySizeForTesting()).toBe(1);

    CardApi.applyArrangement(h.interactive, ['who']);

    // The arrangement-managed card went; the inspection card stayed.
    expect(CardApi.list(h.interactive).map((c) => c.cardId).sort()).toEqual([
      'subject',
      'who',
    ]);
    expect(MqlSubscriptionApi._getRegistrySizeForTesting()).toBe(1);

    // …and closing it by hand still leaves nothing behind.
    const place = CardApi.list(h.interactive).find((c) => c.cardId === 'subject');
    CardApi.close(h.interactive, place!.instanceId, 'dismissed');
    expect(MqlSubscriptionApi._getRegistrySizeForTesting()).toBe(0);
  });

  it('disconnect drops the whole set and its handles, silently', async () => {
    const h = await makeHarness();
    const room = await StuffApi.create(() => new Room());
    room.setShortDescription('the lounge');
    ContainmentApi.move(h.avatar, room);

    CardApi.push(h.interactive, 'subject', { subjectId: room.stuffId });
    CardApi.open(
      makeContext(h, { commandText: 'who', verbs: ['who'], opensCard: 'who' }),
      'who',
    );
    const closedBefore = h.ofType('card-closed').length;

    CardApi.cancelAllForInteractive(h.interactive);

    expect(CardApi._getSizeForTesting()).toBe(0);
    expect(MqlSubscriptionApi._getRegistrySizeForTesting()).toBe(0);
    /*
     * ⚠ No `card-closed` envelopes: there is nobody to tell. A
     * disconnect is not a reason a card went away, it is the end of the
     * conversation in which reasons are said.
     */
    expect(h.ofType('card-closed').length).toBe(closedBefore);
  });
});
