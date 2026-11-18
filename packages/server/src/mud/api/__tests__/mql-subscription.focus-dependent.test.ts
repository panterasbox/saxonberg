/**
 * Subscriptions flagged `focusDependent: true` install a
 * holder-level `(FieldChangedEvent.KIND, 'field', 'focus')`
 * dependency entry so the substrate marks them dirty on `setFocus`
 * / `clearFocus` — even when the natural per-result-Stuff descriptor
 * walk would not have installed a focus dep (the result set doesn't
 * include the Focused host itself).
 *
 * The inspection card's `$focus` subscription is the canonical
 * consumer; this file exercises the substrate behavior directly.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubscriptionApi } from '../subscription';
import { MqlApi } from '../mql';
import { EventApi } from '../event';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { Stuff } from '../../lib/stuff/Stuff';
import EventRegistry from '../../platform/idea/EventRegistry';
import Interactive from '../../platform/idea/Interactive';
import Avatar from '../../platform/agent/PrimaryAvatar';
import { SUBSCRIPTION_SOURCES } from '@saxonberg/types';

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
  vi.spyOn(Interactive.prototype, 'sendEnvelope').mockImplementation((tpl) => {
    envelopes.push(tpl as unknown as { type: string });
  });
  return { interactive, avatar, envelopes };
}

describe('SubscriptionApi — focusDependent flag', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    SubscriptionApi._clearAllForTesting();
  });

  it('focusDependent: true adds an additional index entry over the baseline', async () => {
    const { interactive } = await setup();
    // Baseline: subscribe without focusDependent.
    interactive.subscribe('baseline', SUBSCRIPTION_SOURCES.mql, {
    query: 'me',
    cardinality: 'one',
    fields: ['displayName'],
  });
    const baselineCount =
      SubscriptionApi._getDependencyIndexEntryCountForTesting();

    // Same shape, but focusDependent: true. Expect exactly one
    // additional entry for the holder-level focus dep.
    interactive.subscribe('focusDep', SUBSCRIPTION_SOURCES.mql, {
    query: 'me',
    cardinality: 'one',
    fields: ['displayName'],
    focusDependent: true,
  });
    const withFocusDepCount =
      SubscriptionApi._getDependencyIndexEntryCountForTesting();

    // Each subscription adds (baseline/subscription) memberships;
    // the focusDep subscription adds one more for the focus tuple.
    expect(withFocusDepCount).toBe(2 * baselineCount + 1);
  });

  it('setFocus triggers re-resolve for focusDependent subscriptions', async () => {
    const { interactive, avatar } = await setup();
    interactive.subscribe('s1', SUBSCRIPTION_SOURCES.mql, {
    query: 'me',
    cardinality: 'one',
    fields: ['displayName'],
    focusDependent: true,
  });

    const spy = vi.spyOn(MqlApi, 'resolveMany');
    avatar.setFocus('apple');
    expect(spy).not.toHaveBeenCalled(); // setImmediate hasn't fired yet.
    await SubscriptionApi._drainScheduledForTesting();
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('multiple setFocus calls in one tick coalesce to one re-resolve', async () => {
    const { interactive, avatar } = await setup();
    interactive.subscribe('s1', SUBSCRIPTION_SOURCES.mql, {
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
    await SubscriptionApi._drainScheduledForTesting();
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('teardown drops the holder-level focus dep along with the rest', async () => {
    const { interactive } = await setup();
    interactive.subscribe('s1', SUBSCRIPTION_SOURCES.mql, {
    query: 'me',
    cardinality: 'one',
    fields: ['displayName'],
    focusDependent: true,
  });
    expect(
      SubscriptionApi._getDependencyIndexEntryCountForTesting(),
    ).toBeGreaterThan(0);
    interactive.cancelSubscription('s1');
    expect(
      SubscriptionApi._getDependencyIndexEntryCountForTesting(),
    ).toBe(0);
  });

  it('non-focusDependent raw subscribe does NOT install the focus tuple', async () => {
    const { interactive, avatar } = await setup();
    interactive.subscribe('s1', SUBSCRIPTION_SOURCES.mql, {
    query: 'me',
    cardinality: 'one',
    // 'displayName' only — no Focused descriptor in the requested
    // field set, so the natural walk shouldn't install a focus dep.
    fields: ['displayName'],
  });
    const spy = vi.spyOn(MqlApi, 'resolveMany');
    avatar.setFocus('apple');
    await SubscriptionApi._drainScheduledForTesting();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
