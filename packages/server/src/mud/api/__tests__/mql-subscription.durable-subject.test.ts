/**
 * ⭐ **The durable-subject witness** — the seam that lets a
 * ledger-derived figure re-resolve.
 *
 * ⚠ **This test exists because the first cut silently did nothing.** The
 * standing fields originally declared
 * `changes: [{ on: SomeAppendedEvent, by: 'subject' }]`, which looks
 * right and never fires: `deriveAndInstallDependencies` indexes any
 * source that isn't `'target'`/`'field'` under the value **`null`**,
 * while `routeFire` looks up `payload['subject']` — a durable key
 * string. The two can never match, so every standing subscription was
 * wired to nothing.
 *
 * The tests that shipped alongside it asserted only that a change
 * source was *declared*, which is exactly the shape of assertion that
 * cannot catch this. So these drive the real path end to end: subscribe,
 * poke, and assert a re-resolve actually happened.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MqlSubscriptionApi } from '../mql-subscription';
import { MqlApi } from '../mql';
import { EventApi } from '../event';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { Stuff } from '../../lib/stuff/Stuff';
import EventRegistry from '../../platform/idea/EventRegistry';
import Interactive from '../../platform/idea/Interactive';
import Avatar from '../../platform/agent/Avatar';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../lib/security/__tests__/test-setup';

const SUBJECT = '/platform/agent/Avatar/tester';

async function bootRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/platform/idea/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

async function subscribedInteractive(
  templatePath: string | null
): Promise<Interactive> {
  await bootRegistry();
  // Sync construction: a durable-stamped Avatar going through the
  // clone pipeline would try to materialize from `holder_snapshots`,
  // and these tests are about the dependency index, not persistence.
  const avatar = templatePath
    ? makeStuffAtPath(() => new Avatar(), templatePath)
    : makeStuff(() => new Avatar());
  avatar.setName('Tester');
  const interactive = await StuffApi.create(
    () => new Interactive('sock-1', 'sess-1', { _id: 'u1' } as never)
  );
  interactive.transferTo(avatar);
  MqlSubscriptionApi.handleSubscribe({
    interactive,
    subscriptionId: 's1',
    query: 'me',
    cardinality: 'one',
    // The standing figures — the fields that carry a durableKey.
    fields: ['renown', 'playStanding', 'practisingCompetence'],
  });
  return interactive;
}

describe('durable-subject witness', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    MqlSubscriptionApi._clearAllForTesting();
  });

  it('⭐ a poke on the durable subject re-resolves the subscription', async () => {
    await subscribedInteractive(SUBJECT);
    const spy = vi.spyOn(MqlApi, 'resolveOne');

    MqlSubscriptionApi.notifyDurableSubject(SUBJECT);
    await MqlSubscriptionApi._drainScheduledForTesting();

    // THE assertion the original wiring would have failed.
    expect(
      spy,
      'the durable-subject poke did not reach the subscription'
    ).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('a poke on a DIFFERENT subject does not re-resolve — no fan-out', async () => {
    await subscribedInteractive(SUBJECT);
    const spy = vi.spyOn(MqlApi, 'resolveOne');

    MqlSubscriptionApi.notifyDurableSubject('/platform/agent/Avatar/somebody-else');
    await MqlSubscriptionApi._drainScheduledForTesting();

    // The index matches the exact key, so one player's renown append
    // does not wake every other player's standing card.
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('coalesces many pokes in one tick into one re-resolve', async () => {
    await subscribedInteractive(SUBJECT);
    const spy = vi.spyOn(MqlApi, 'resolveOne');

    MqlSubscriptionApi.notifyDurableSubject(SUBJECT);
    MqlSubscriptionApi.notifyDurableSubject(SUBJECT);
    MqlSubscriptionApi.notifyDurableSubject(SUBJECT);
    expect(spy).not.toHaveBeenCalled(); // setImmediate hasn't run
    await MqlSubscriptionApi._drainScheduledForTesting();

    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('indexes nothing for a host with no durable identity', async () => {
    // A guest has no `/platform/agent/Avatar/<playerId>` stamp, so `durableKey`
    // returns undefined and no tuple is installed. Nothing should be
    // pokeable, and nothing should throw.
    await subscribedInteractive(null);
    const spy = vi.spyOn(MqlApi, 'resolveOne');

    MqlSubscriptionApi.notifyDurableSubject(SUBJECT);
    await MqlSubscriptionApi._drainScheduledForTesting();

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('a torn-down subscription stops receiving pokes', async () => {
    const interactive = await subscribedInteractive(SUBJECT);
    MqlSubscriptionApi.handleUnsubscribe(interactive, 's1');
    const spy = vi.spyOn(MqlApi, 'resolveOne');

    MqlSubscriptionApi.notifyDurableSubject(SUBJECT);
    await MqlSubscriptionApi._drainScheduledForTesting();

    // The synthetic kind has no bus listener to release, so teardown
    // has to remove the index entry itself — this catches that.
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
