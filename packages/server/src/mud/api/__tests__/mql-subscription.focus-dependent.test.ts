/**
 * ⭐ A focus change wakes every query-bound subscription (crowded-rooms
 * D1): each installs a dependency on its HOLDER, any field — every
 * relative seed and every shell variable (`$focus`) answers from the asker
 * — so `setFocus` / `clearFocus` wake it with nothing asked for. The
 * `focusDependent` / `locationDependent` flags this replaced are gone from
 * the wire (navigation-server).
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

describe('a focus change wakes a query-bound subscription (the holder entry)', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    SubscriptionApi._clearAllForTesting();
  });

  it('setFocus triggers re-resolve', async () => {
    const { interactive, avatar } = await setup();
    interactive.subscribe('s1', SUBSCRIPTION_SOURCES.mql, {
    query: 'me',
    cardinality: 'one',
    fields: ['displayName'],
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
  });
    expect(
      SubscriptionApi._getDependencyIndexEntryCountForTesting(),
    ).toBeGreaterThan(0);
    interactive.cancelSubscription('s1');
    expect(
      SubscriptionApi._getDependencyIndexEntryCountForTesting(),
    ).toBe(0);
  });

  it('a query-bound subscription wakes on its holder’s focus without the flag', async () => {
    const { interactive, avatar } = await setup();
    interactive.subscribe('s1', SUBSCRIPTION_SOURCES.mql, {
      query: 'me',
      // 'displayName' only, no flag: the holder entry still wakes it.
      cardinality: 'one',
      fields: ['displayName'],
    });
    const spy = vi.spyOn(MqlApi, 'resolveMany');
    avatar.setFocus('apple');
    await SubscriptionApi._drainScheduledForTesting();
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
