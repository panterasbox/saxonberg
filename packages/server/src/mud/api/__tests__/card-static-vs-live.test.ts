/**
 * ⭐ **Liveness is orthogonal, opt-in, and honest** (decision 3, AC 6).
 *
 * A static card is resolved once and **stamped with when** — that stamp
 * is what earns it a refresh control. A live card carries no stamp,
 * because a card that looks live and is not is a lie, and the refresh
 * button on one is a bandage over a wake that does not fire.
 *
 * ⚠⚠ **The live card is tested by performing the world change and
 * asserting the consequence — nothing here refreshes anything.** A
 * `here` card was immortal through eleven passing tests because every
 * one of them called `refreshForInteractive` by hand; a derive-on-read
 * answer is dead unless something invalidates it, and a test that does
 * the invalidating itself proves nothing.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { CardApi } from '../card';
import { StuffApi } from '../stuff';
import { EventApi } from '../event';
import { ShadowApi } from '../shadow';
import { MqlSubscriptionApi } from '../mql-subscription';
import { ContainmentApi } from '../containment';
import { CARDS } from '../../lib/connection/Cards';
import Room from '../../obj/location/Room';
import { makeHarness, makeContext, type Harness } from './card-harness';

async function makeRoom(name: string): Promise<Room> {
  const room = await StuffApi.create(() => new Room());
  room.setShortDescription(name);
  return room;
}

describe('static and live are different KINDS of answer', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    MqlSubscriptionApi._clearAllForTesting();
    CardApi._clearAllForTesting();
  });

  it('a static card stamps `takenAt` and re-stamps on every touch', async () => {
    const h: Harness = await makeHarness();
    const ctx = makeContext(h, {
      commandText: 'who',
      verbs: ['who'],
      opensCard: 'who',
    });
    CardApi.open(ctx, 'who');

    const opened = h.ofType('card-opened')[0]!;
    expect(CARDS.who.live).toBe(false);
    expect(opened.live).toBe(false);
    expect(typeof opened.takenAt).toBe('number');

    CardApi.open(ctx, 'who');
    const touched = h.ofType('card-touched')[0]!;
    expect(typeof touched.takenAt).toBe('number');
    expect(touched.takenAt as number).toBeGreaterThanOrEqual(
      opened.takenAt as number,
    );
  });

  it('a LIVE card carries no `takenAt` — there is no stale answer to stamp', async () => {
    const h = await makeHarness();
    const room = await makeRoom('the lounge');
    ContainmentApi.move(h.avatar, room);

    CardApi.push(h.interactive, 'place');
    const opened = h.ofType('card-opened')[0]!;
    expect(CARDS.place.live).toBe(true);
    expect(opened.live).toBe(true);
    expect(opened.takenAt).toBeUndefined();
  });

  /**
   * ⭐ The whole liveness claim, and it is asserted the only honest
   * way: move the body, then look at what the client was told. No
   * refresh, no drain-by-hand — if the wake does not fire, this fails.
   */
  it('a live card wakes on the world change, with no refresh', async () => {
    const h = await makeHarness();
    const lounge = await makeRoom('the lounge');
    const yard = await makeRoom('the yard');
    ContainmentApi.move(h.avatar, lounge);

    const instanceId = CardApi.push(h.interactive, 'place');
    expect(instanceId).not.toBeNull();
    const opened = h.ofType('card-opened')[0]!;
    const first = (opened.result as { displayName?: string }[])[0];
    expect(first?.displayName).toBe('the lounge');

    // The world moves. Nothing else happens.
    ContainmentApi.move(h.avatar, yard);
    await MqlSubscriptionApi._drainScheduledForTesting();

    /*
     * The live card's own subscription handle IS its instance id, so
     * its update rides the ordinary delta envelope — no join table, no
     * second correlation key.
     */
    const deltas = h.ofType('mql-subscription-delta');
    expect(deltas.length).toBeGreaterThanOrEqual(1);
    expect(deltas.some((d) => d.subscriptionId === instanceId)).toBe(true);
  });

  it('the live card OWNS its subscription handle', async () => {
    const h = await makeHarness();
    const room = await makeRoom('the lounge');
    ContainmentApi.move(h.avatar, room);

    const before = MqlSubscriptionApi._getRegistrySizeForTesting();
    const instanceId = CardApi.push(h.interactive, 'place');
    expect(MqlSubscriptionApi._getRegistrySizeForTesting()).toBe(before + 1);

    CardApi.close(h.interactive, instanceId!, 'dismissed');
    expect(MqlSubscriptionApi._getRegistrySizeForTesting()).toBe(before);
  });

  it('a static card registers NO subscription at all', async () => {
    const h = await makeHarness();
    const before = MqlSubscriptionApi._getRegistrySizeForTesting();
    CardApi.open(
      makeContext(h, {
        commandText: 'who',
        verbs: ['who'],
        opensCard: 'who',
      }),
      'who',
    );
    expect(MqlSubscriptionApi._getRegistrySizeForTesting()).toBe(before);
  });
});
