/**
 * Subscriptions flagged `focusDependent: true` install a
 * holder-level `(FieldChangedEvent.KIND, 'field', 'focus')`
 * dependency entry so the substrate marks them dirty on `setFocus`
 * / `clearFocus` — even when the natural per-result-Stuff descriptor
 * walk would not have installed a focus dep (the result set doesn't
 * include the Focused host itself).
 *
 * The inspection pane's `$focus` subscription is the canonical
 * consumer; this file exercises the substrate behavior directly.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MqlSubscriptionApi } from '../mql-subscription';
import { MqlApi } from '../mql';
import { EventApi } from '../event';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { Stuff } from '../../lib/stuff/Stuff';
import { EventRegistry } from '../../obj/EventRegistry';
import { Interactive } from '../../obj/Interactive';
import { Avatar } from '../../obj/Avatar';
import { ConnectionApi } from '../connection';

async function bootRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/obj/EventRegistry');
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
  ConnectionApi.transfer(interactive, avatar);
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

  it('focusDependent: true adds an additional index entry over the baseline', async () => {
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

    // Each subscription adds (baseline/subscription) memberships;
    // the focusDep subscription adds one more for the focus tuple.
    expect(withFocusDepCount).toBe(2 * baselineCount + 1);
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

    const spy = vi.spyOn(MqlApi, 'resolveOne');
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

    const spy = vi.spyOn(MqlApi, 'resolveOne');
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
    MqlSubscriptionApi.handleUnsubscribe(interactive, 's1');
    expect(
      MqlSubscriptionApi._getDependencyIndexEntryCountForTesting(),
    ).toBe(0);
  });

  it('non-focusDependent raw subscribe does NOT install the focus tuple', async () => {
    const { interactive, avatar } = await setup();
    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 's1',
      query: 'me',
      // 'displayName' only — no Focused descriptor in the requested
      // field set, so the natural walk shouldn't install a focus dep.
      cardinality: 'one',
      fields: ['displayName'],
    });
    const spy = vi.spyOn(MqlApi, 'resolveOne');
    avatar.setFocus('apple');
    await MqlSubscriptionApi._drainScheduledForTesting();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
