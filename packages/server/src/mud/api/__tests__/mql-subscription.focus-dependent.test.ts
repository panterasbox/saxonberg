/**
 * ⭐ The `focusDependent` flag is SUBSUMED (crowded-rooms D1): every
 * query-bound subscription installs a dependency on its HOLDER, any field —
 * every relative seed and every shell variable (`$focus`) answers from the
 * asker — so `setFocus` / `clearFocus` wake it whether or not it asked. The
 * flag is accepted and adds nothing; it stays in the wire type until
 * navigation-server's `params` retires it.
 *
 * The inspection card's `$focus` subscription is the canonical
 * consumer; this file exercises the substrate behavior directly.
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
import Avatar from '../../platform/agent/PrimaryAvatar';

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

async function setup(): Promise<{
  interactive: Interactive;
  avatar: Avatar;
  envelopes: Array<{ type: string; [k: string]: unknown }>;
}> {
  await bootRegistry();
  const avatar = await StuffApi.create(() => new Avatar());
  avatar.setName('Alice');
  const interactive = await StuffApi.create(
    () => new Interactive('sock-1', 'sess-1', { _id: 'u1' } as never),
  );
  interactive.transferTo(avatar);
  const envelopes: Array<{ type: string; [k: string]: unknown }> = [];
  vi.spyOn(avatar, 'onEnvelope').mockImplementation((tpl) => {
    envelopes.push(tpl as unknown as { type: string });
  });
  return { interactive, avatar, envelopes };
}

describe('MqlSubscriptionApi — focusDependent flag', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    MqlSubscriptionApi._clearAllForTesting();
  });

  it('focusDependent: true adds nothing over the baseline (the holder entry subsumes it)', async () => {
    const { interactive } = await setup();
    // Baseline: subscribe without focusDependent.
    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 'baseline',
      query: 'me',
      cardinality: 'one',
      fields: ['displayName'],
    });
    const baselineCount =
      MqlSubscriptionApi._getDependencyIndexEntryCountForTesting();

    // Same shape, but focusDependent: true. Expect exactly one
    // additional entry for the holder-level focus dep.
    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 'focusDep',
      query: 'me',
      cardinality: 'one',
      fields: ['displayName'],
      focusDependent: true,
    });
    const withFocusDepCount =
      MqlSubscriptionApi._getDependencyIndexEntryCountForTesting();

    // The flag adds nothing: the holder entry is installed either way.
    expect(withFocusDepCount).toBe(2 * baselineCount);
  });

  it('setFocus triggers re-resolve for focusDependent subscriptions', async () => {
    const { interactive, avatar } = await setup();
    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 's1',
      query: 'me',
      cardinality: 'one',
      fields: ['displayName'],
      focusDependent: true,
    });

    const spy = vi.spyOn(MqlApi, 'resolveMany');
    avatar.setFocus('apple');
    expect(spy).not.toHaveBeenCalled(); // setImmediate hasn't fired yet.
    await MqlSubscriptionApi._drainScheduledForTesting();
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('multiple setFocus calls in one tick coalesce to one re-resolve', async () => {
    const { interactive, avatar } = await setup();
    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 's1',
      query: 'me',
      cardinality: 'one',
      fields: ['displayName'],
      focusDependent: true,
    });

    const spy = vi.spyOn(MqlApi, 'resolveMany');
    avatar.setFocus('apple');
    avatar.setFocus('banana');
    avatar.setFocus('cherry');
    expect(spy).not.toHaveBeenCalled();
    await MqlSubscriptionApi._drainScheduledForTesting();
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('teardown drops the holder-level focus dep along with the rest', async () => {
    const { interactive } = await setup();
    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 's1',
      query: 'me',
      cardinality: 'one',
      fields: ['displayName'],
      focusDependent: true,
    });
    expect(
      MqlSubscriptionApi._getDependencyIndexEntryCountForTesting(),
    ).toBeGreaterThan(0);
    interactive.cancelMqlSubscription('s1');
    expect(
      MqlSubscriptionApi._getDependencyIndexEntryCountForTesting(),
    ).toBe(0);
  });

  it('a query-bound subscription wakes on its holder’s focus without the flag', async () => {
    const { interactive, avatar } = await setup();
    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 's1',
      query: 'me',
      // 'displayName' only, no flag: the holder entry still wakes it.
      cardinality: 'one',
      fields: ['displayName'],
    });
    const spy = vi.spyOn(MqlApi, 'resolveMany');
    avatar.setFocus('apple');
    await MqlSubscriptionApi._drainScheduledForTesting();
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
