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

  it('a static card stamps `takenAt`, and each re-issue is its own stamp', async () => {
    const h: Harness = await makeHarness();
    const ctx = makeContext(h, {
      commandText: 'who',
      verbs: ['who'],
      opensCard: 'who',
    });
    CardApi.open(ctx, 'who');
    CardApi.open(ctx, 'who');

    // ⭐ The feed is a log: two asks, two cards, two honest stamps.
    const opened = h.ofType('card-opened');
    expect(CARDS.who.live).toBe(false);
    expect(opened.length).toBe(2);
    for (const o of opened) {
      expect(o.live).toBe(false);
      expect(typeof o.takenAt).toBe('number');
    }
    expect(opened[1]!.takenAt as number).toBeGreaterThanOrEqual(
      opened[0]!.takenAt as number,
    );
  });

  /**
   * ⚠ Touch survives for the SINGLETON surfaces — an editor is one
   * application, so re-running `cms` re-resolves the card you have.
   */
  it('a touched STATIC singleton re-stamps `takenAt`', async () => {
    const h = await makeHarness();
    const ctx = makeContext(h, {
      commandText: 'cms',
      verbs: ['cms'],
      opensCard: 'cms',
    });
    CardApi.open(ctx, 'cms');
    CardApi.open(ctx, 'cms');
    const touched = h.ofType('card-touched');
    expect(touched.length).toBe(1);
    expect(typeof touched[0]!.takenAt).toBe('number');
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

  /**
   * ⭐⭐ **The delta has to be APPLICABLE, not merely present** — and
   * asserting only that one arrived is how this shipped broken.
   *
   * A cardinality-`one` answer that moves to a different subject used to
   * emit a lone `replace` under a key the consumer had never seen. Every
   * consumer looks its record up by `stuffId`, misses, and **appends**,
   * so the old room survived at index 0 and the card rendered the place
   * you left — while a passing test watched the envelope go by.
   *
   * Two consumers had already written private bypasses for exactly this
   * (the shelf's `self` handler documents it at length). The fix is one
   * `remove` at the source; this asserts the ops, and then asserts the
   * consequence by applying them the way the wire says they apply.
   */
  it('⭐ the delta REPLACES the answer rather than appending a second one', async () => {
    const h = await makeHarness();
    const lounge = await makeRoom('the lounge');
    const yard = await makeRoom('the yard');
    ContainmentApi.move(h.avatar, lounge);

    const instanceId = CardApi.push(h.interactive, 'place');
    const opened = h.ofType('card-opened')[0]!;
    const records = [
      ...((opened.result ?? []) as { stuffId: string; displayName?: string }[]),
    ];
    expect(records.map((r) => r.displayName)).toEqual(['the lounge']);

    ContainmentApi.move(h.avatar, yard);
    await MqlSubscriptionApi._drainScheduledForTesting();

    const delta = h
      .ofType('mql-subscription-delta')
      .find((d) => d.subscriptionId === instanceId)!;
    const changes = delta.changes as {
      op: string;
      key: string;
      fields?: Record<string, unknown>;
    }[];
    expect(changes.map((c) => c.op)).toEqual(['remove', 'replace']);

    // Apply them exactly as the wire contract says: `remove` drops by
    // key, `replace` overwrites in place or lands as the new record.
    for (const change of changes) {
      const idx = records.findIndex((r) => r.stuffId === change.key);
      if (change.op === 'remove') {
        if (idx >= 0) records.splice(idx, 1);
        continue;
      }
      const record = {
        ...(change.fields as { displayName?: string }),
        stuffId: change.key,
      };
      if (idx >= 0) records[idx] = record;
      else records.push(record);
    }

    // ⚠ ONE record, and it is the room the body is actually standing in.
    expect(records.map((r) => r.displayName)).toEqual(['the yard']);
  });

  /**
   * ⚠⚠ **Touching a live card must not re-assert its birth body.**
   *
   * `state.records` on a live card is the subscription's first resolve
   * and is never written again — deltas go straight at the client. So a
   * bare `look` in a new room used to push the OLD room's records back
   * over a client that had already been told the truth, confidently and
   * with no way to tell.
   */
  it('⚠ a live card is touched WITHOUT a body — the subscription owns it', async () => {
    const h = await makeHarness();
    const lounge = await makeRoom('the lounge');
    const yard = await makeRoom('the yard');
    ContainmentApi.move(h.avatar, lounge);

    CardApi.push(h.interactive, 'place');
    ContainmentApi.move(h.avatar, yard);
    await MqlSubscriptionApi._drainScheduledForTesting();

    /*
     * ⚠ Live cards STACK now, so a repeat `look` never touches one. The
     * rule is still real — `CardApi.touch` reaches it, the sweep's
     * bookkeeping uses it — so drive it directly rather than through a
     * dedup that no longer happens.
     */
    CardApi.touch(h.interactive, CARDS.place.command);

    const touched = h.ofType('card-touched');
    expect(touched.length).toBe(1);
    expect(touched[0]!.result).toBeUndefined();
    expect(touched[0]!.payload).toBeUndefined();

    // …and a STATIC card still carries its freshly-resolved body.
    const cmsCtx = makeContext(h, {
      commandText: 'cms',
      verbs: ['cms'],
      opensCard: 'cms',
    });
    CardApi.open(cmsCtx, 'cms');
    CardApi.open(cmsCtx, 'cms');
    const cmsTouch = h.ofType('card-touched').at(-1)!;
    expect(cmsTouch.instanceId).toBeDefined();
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
