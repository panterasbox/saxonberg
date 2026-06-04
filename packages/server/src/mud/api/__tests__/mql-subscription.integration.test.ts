/**
 * Wave 6: end-to-end integration loop. Subscribe → initial result
 * envelope → server-side state mutation → event fires → re-resolve
 * → delta envelope → unsubscribe → clean removal. Uses Avatar +
 * Interactive + a vi-mocked Avatar.onEnvelope to capture envelope
 * delivery without a real WebSocket.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MqlSubscriptionApi } from '../mql-subscription';
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

describe('MqlSubscriptionApi — integration loop', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    MqlSubscriptionApi._clearAllForTesting();
  });

  it('single-cardinality displayName subscription: result → setName → delta → unsubscribe', async () => {
    const { interactive, avatar, envelopes } = await setup();

    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 's1',
      query: 'me',
      cardinality: 'one',
      fields: 'ref',
    });

    const initial = envelopes.find((e) => e.type === 'mql-subscription-result');
    expect(initial).toBeDefined();
    expect(
      (initial as unknown as { result: Array<{ displayName: string }> })
        .result[0]!.displayName,
    ).toBe('Alice');

    envelopes.length = 0;
    avatar.setName('Bob');
    await MqlSubscriptionApi._drainScheduledForTesting();

    const delta = envelopes.find((e) => e.type === 'mql-subscription-delta');
    expect(delta).toBeDefined();
    type DeltaShape = { changes: Array<{ op: string; key: string; fields?: { displayName?: string } }> };
    const changes = (delta as unknown as DeltaShape).changes;
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      op: 'update',
      key: avatar.stuffId,
      fields: { displayName: 'Bob' },
    });

    MqlSubscriptionApi.handleUnsubscribe(interactive, 's1');
    expect(MqlSubscriptionApi._getRegistrySizeForTesting()).toBe(0);
    expect(MqlSubscriptionApi._getDependencyIndexEntryCountForTesting()).toBe(0);
  });

  it('disconnect cleanup: cancelAllForInteractive after multiple subscriptions', async () => {
    const { interactive } = await setup();

    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 's1',
      query: 'me',
      cardinality: 'one',
    });
    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 's2',
      query: 'me',
      cardinality: 'one',
    });
    expect(MqlSubscriptionApi._getRegistrySizeForTesting()).toBe(2);

    MqlSubscriptionApi.cancelAllForInteractive(interactive);

    expect(MqlSubscriptionApi._getRegistrySizeForTesting()).toBe(0);
    expect(MqlSubscriptionApi._getDependencyIndexEntryCountForTesting()).toBe(0);
  });

  it('focused-detail subscription rejects cardinality: many', async () => {
    const { interactive, envelopes } = await setup();
    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 's-bad',
      query: 'me',
      cardinality: 'many',
      detailKey: 'foo',
    });
    const errors = envelopes.filter((e) => e.type === 'mql-subscription-error');
    expect(errors).toHaveLength(1);
    expect(errors[0]!.reason).toBe('parse');
    expect(MqlSubscriptionApi._getRegistrySizeForTesting()).toBe(0);
  });

  it('duplicate subscriptionId is rejected; original survives', async () => {
    const { interactive, envelopes } = await setup();
    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 's1',
      query: 'me',
      cardinality: 'one',
    });
    envelopes.length = 0;
    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 's1',
      query: 'me',
      cardinality: 'one',
    });
    const errors = envelopes.filter((e) => e.type === 'mql-subscription-error');
    expect(errors).toHaveLength(1);
    expect(errors[0]!.reason).toBe('parse');
    expect(MqlSubscriptionApi._getRegistrySizeForTesting()).toBe(1);
  });
});
