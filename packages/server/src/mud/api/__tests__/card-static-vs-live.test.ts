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
import SingletonCartesianLocation from '../../platform/location/SingletonCartesianLocation';
import Prop from '../../platform/thing/Prop';
import { makeHarness, makeContext, type Harness } from './card-harness';

async function makeRoom(name: string): Promise<SingletonCartesianLocation> {
  const room = await StuffApi.create(() => new SingletonCartesianLocation());
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

    CardApi.push(h.interactive, 'subject', { subjectId: room.stuffId });
    const opened = h.ofType('card-opened')[0]!;
    expect(CARDS.subject.live).toBe(true);
    expect(opened.live).toBe(true);
    expect(opened.takenAt).toBeUndefined();
  });

  /**
   * ⭐⭐ **The whole liveness claim, and what it is NOT.**
   *
   * A live room card tracks **its own room** — someone walks in and it
   * shows, with no refresh touched. It does **not** follow the viewer:
   * your own movement is not a change to the room you left, it is a new
   * card, and the old one is demoted to a snapshot.
   *
   * ⚠⚠ This test used to assert the opposite — move the avatar, expect
   * the card to become the new room. That was the defect written down
   * as a requirement: the subscription rode the RELATIVE query `here`,
   * so every wake re-answered against the asker and the lounge card
   * silently became the bar's. Reported as *"you're just replacing
   * cards still."* It is subject-bound now, and this asserts the
   * difference in both directions.
   */
  it('⭐ a live card tracks ITS subject when the world changes', async () => {
    const h = await makeHarness();
    const lounge = await makeRoom('the lounge');
    const yard = await makeRoom('the yard');
    ContainmentApi.move(h.avatar, lounge);

    const instanceId = CardApi.push(h.interactive, 'subject', {
      subjectId: lounge.stuffId,
    });
    expect(instanceId).not.toBeNull();

    // Something arrives IN the lounge. Nothing else happens.
    const lamp = await StuffApi.create(() => new Prop());
    lamp.setShortDescription('a brass lamp');
    ContainmentApi.move(lamp, lounge);
    await MqlSubscriptionApi._drainScheduledForTesting();

    const deltas = h.ofType('mql-subscription-delta');
    expect(deltas.some((d) => d.subscriptionId === instanceId)).toBe(true);
    void yard;
  });

  /**
   * ⚠⚠ **Walking away does NOT rewrite the card.** This is the exact
   * failure the subject binding exists to prevent.
   */
  it('⚠ moving the VIEWER leaves the card on the room it is about', async () => {
    const h = await makeHarness();
    const lounge = await makeRoom('the lounge');
    const yard = await makeRoom('the yard');
    ContainmentApi.move(h.avatar, lounge);

    const instanceId = CardApi.push(h.interactive, 'subject', {
      subjectId: lounge.stuffId,
    });
    const opened = h.ofType('card-opened')[0]!;
    /*
     * ⚠ SNAPSHOT the wire records now. The envelope carries the card's
     * own array by reference, so reading it after the world moves tells
     * you what the card holds NOW, not what it was told — which would
     * make this test unable to see the very drift it exists to catch.
     */
    const records = ((opened.result ?? []) as {
      stuffId: string;
      displayName?: string;
    }[]).map((r) => ({ ...r }));
    expect(records.map((r) => r.displayName)).toEqual(['the lounge']);

    ContainmentApi.move(h.avatar, yard);
    await MqlSubscriptionApi._drainScheduledForTesting();
    // It may WAKE (the lounge's contents changed — you left it), but it
    // must still be answering about the lounge.
    for (const d of h
      .ofType('mql-subscription-delta')
      .filter((x) => x.subscriptionId === instanceId)) {
      for (const c of d.changes as { op: string; key: string; fields?: Record<string, unknown> }[]) {
        const idx = records.findIndex((r) => r.stuffId === c.key);
        if (c.op === 'remove') {
          if (idx >= 0) records.splice(idx, 1);
          continue;
        }
        const rec = { ...(c.fields as { displayName?: string }), stuffId: c.key };
        if (idx >= 0) records[idx] = rec;
        else records.push(rec);
      }
    }
    expect(records.map((r) => r.displayName)).toEqual(['the lounge']);
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
  it('⭐ the delta is APPLICABLE — an update in place, not an append', async () => {
    const h = await makeHarness();
    const lounge = await makeRoom('the lounge');
    ContainmentApi.move(h.avatar, lounge);

    const instanceId = CardApi.push(h.interactive, 'subject', {
      subjectId: lounge.stuffId,
    });
    const opened = h.ofType('card-opened')[0]!;
    const records = ((opened.result ?? []) as {
      stuffId: string;
      displayName?: string;
    }[]).map((r) => ({ ...r }));
    expect(records.map((r) => r.displayName)).toEqual(['the lounge']);

    // Something arrives in the room: same subject, new reading.
    const lamp = await StuffApi.create(() => new Prop());
    lamp.setShortDescription('a brass lamp');
    ContainmentApi.move(lamp, lounge);
    await MqlSubscriptionApi._drainScheduledForTesting();

    const delta = h
      .ofType('mql-subscription-delta')
      .find((d) => d.subscriptionId === instanceId)!;
    const changes = delta.changes as {
      op: string;
      key: string;
      fields?: Record<string, unknown>;
    }[];
    /*
     * ⭐ An `update`, because the subject's IDENTITY did not change —
     * which is the whole point of binding to a subject.
     *
     * ⚠ The identity-CHANGE path (`remove` + `replace`) is what a
     * relative subscription produces, and it is still real: the shelf's
     * `self` subscription rides it. It shipped as a lone `replace`
     * under a key no consumer had seen, so every consumer missed and
     * APPENDED — the defect that made a card render the room you left.
     */
    expect(changes.map((c) => c.op)).toEqual(['update']);

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
      if (idx >= 0) records[idx] = { ...records[idx], ...record };
      else records.push(record);
    }

    // ⚠ ONE record, still the room this card is about.
    expect(records.length).toBe(1);
    expect(records[0]!.displayName).toBe('the lounge');
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

    CardApi.push(h.interactive, 'subject', { subjectId: lounge.stuffId });
    ContainmentApi.move(h.avatar, yard);
    await MqlSubscriptionApi._drainScheduledForTesting();

    /*
     * ⚠ Live cards STACK now, so a repeat `look` never touches one. The
     * rule is still real — `CardApi.touch` reaches it, the sweep's
     * bookkeeping uses it — so drive it directly rather than through a
     * dedup that no longer happens.
     */
    CardApi.touch(h.interactive, CARDS.subject.command);

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
    const instanceId = CardApi.push(h.interactive, 'subject', { subjectId: room.stuffId });
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
