/**
 * Wave 4: error envelope reasons — parse / resolve / permission /
 * (closed reserved). Verifies the reason channel is wired and the
 * substrate doesn't register on a failed subscribe.
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

async function makeAvatarInteractive(): Promise<{
  interactive: Interactive;
  avatar: Avatar;
}> {
  const avatar = await StuffApi.create(() => new Avatar());
  avatar.setName('Alice');
  const interactive = await StuffApi.create(
    () => new Interactive('sock-1', 'sess-1', { _id: 'u1' } as never),
  );
  ConnectionApi.transfer(interactive, avatar);
  return { interactive, avatar };
}

/**
 * Capture envelopes pushed through Avatar.onEnvelope (the
 * dispatch path MessageApi.sendEnvelope uses). Returns the
 * collected list so tests can assert envelope shape without
 * spinning up a real Backend.
 */
function captureEnvelopes(avatar: Avatar): Array<{ type: string; [k: string]: unknown }> {
  const collected: Array<{ type: string; [k: string]: unknown }> = [];
  vi.spyOn(avatar, 'onEnvelope').mockImplementation((tpl) => {
    collected.push(tpl as unknown as { type: string });
  });
  return collected;
}

describe('MqlSubscriptionApi — error envelopes', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    MqlSubscriptionApi._clearAllForTesting();
  });

  it('duplicate id → reason: parse, second registration is rejected', async () => {
    await bootRegistry();
    const { interactive, avatar } = await makeAvatarInteractive();
    const envelopes = captureEnvelopes(avatar);
    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 's1',
      query: 'me',
      cardinality: 'one',
    });
    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 's1',
      query: 'me',
      cardinality: 'one',
    });
    const errors = envelopes.filter((e) => e.type === 'mql-subscription-error');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      type: 'mql-subscription-error',
      subscriptionId: 's1',
      reason: 'parse',
    });
    expect(MqlSubscriptionApi._getRegistrySizeForTesting()).toBe(1);
  });

  it('detailKey with cardinality: many → reason: parse, no registration', async () => {
    await bootRegistry();
    const { interactive, avatar } = await makeAvatarInteractive();
    const envelopes = captureEnvelopes(avatar);
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

  it('malformed MQL query → reason: parse, no registration', async () => {
    await bootRegistry();
    const { interactive, avatar } = await makeAvatarInteractive();
    const envelopes = captureEnvelopes(avatar);
    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 's2',
      query: ':::',
      cardinality: 'one',
    });
    const errors = envelopes.filter((e) => e.type === 'mql-subscription-error');
    expect(errors.length).toBeGreaterThan(0);
    expect(['parse', 'resolve']).toContain(errors[0]!.reason);
    expect(MqlSubscriptionApi._getRegistrySizeForTesting()).toBe(0);
  });
});
