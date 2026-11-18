/**
 * Wave 4: registry + handleSubscribe / handleUnsubscribe /
 * cancelAllForInteractive surface tests. Builds a synthetic
 * Interactive whose holder composes Avatar (CommandGiver + Sensor).
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { SubscriptionApi } from '../subscription';
import { SubscriptionLogic } from '../../platform/idea/api/SubscriptionLogic';
import { SecurityError } from '../../lib/security/errors';
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

async function makeAvatarInteractive(): Promise<{
  interactive: Interactive;
  avatar: Avatar;
}> {
  const avatar = await StuffApi.create(() => new Avatar());
  const interactive = await StuffApi.create(
    () => new Interactive('sock-1', 'sess-1', { _id: 'u1' } as never),
  );
  interactive.transferTo(avatar);
  return { interactive, avatar };
}

describe('SubscriptionApi — registry surface', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    SubscriptionApi._clearAllForTesting();
  });

  it('handleSubscribe with a "me" query registers state', async () => {
    await bootRegistry();
    const { interactive, avatar } = await makeAvatarInteractive();
    avatar.setName('Alice');
    interactive.subscribe('s1', SUBSCRIPTION_SOURCES.mql, {
    query: 'me',
    cardinality: 'one',
    fields: 'ref',
  });
    expect(SubscriptionApi._getRegistrySizeForTesting()).toBe(1);
  });

  it('duplicate subscriptionId is rejected with no second registration', async () => {
    await bootRegistry();
    const { interactive } = await makeAvatarInteractive();
    interactive.subscribe('s1', SUBSCRIPTION_SOURCES.mql, {
    query: 'me',
    cardinality: 'one',
  });
    expect(SubscriptionApi._getRegistrySizeForTesting()).toBe(1);
    interactive.subscribe('s1', SUBSCRIPTION_SOURCES.mql, {
    query: 'me',
    cardinality: 'one',
  });
    expect(SubscriptionApi._getRegistrySizeForTesting()).toBe(1);
  });

  it('handleUnsubscribe drops the subscription and silently no-ops on unknown ids', async () => {
    await bootRegistry();
    const { interactive } = await makeAvatarInteractive();
    interactive.subscribe('s1', SUBSCRIPTION_SOURCES.mql, {
    query: 'me',
    cardinality: 'one',
  });
    expect(SubscriptionApi._getRegistrySizeForTesting()).toBe(1);
    interactive.cancelSubscription('s-nope');
    expect(SubscriptionApi._getRegistrySizeForTesting()).toBe(1);
    interactive.cancelSubscription('s1');
    expect(SubscriptionApi._getRegistrySizeForTesting()).toBe(0);
    expect(SubscriptionApi._getDependencyIndexEntryCountForTesting()).toBe(0);
  });

  it('cancelAllForInteractive removes every subscription for that interactive', async () => {
    await bootRegistry();
    const { interactive } = await makeAvatarInteractive();
    interactive.subscribe('s1', SUBSCRIPTION_SOURCES.mql, {
    query: 'me',
    cardinality: 'one',
  });
    interactive.subscribe('s2', SUBSCRIPTION_SOURCES.mql, {
    query: 'me',
    cardinality: 'one',
  });
    expect(SubscriptionApi._getRegistrySizeForTesting()).toBe(2);
    interactive.cancelAllSubscriptions();
    expect(SubscriptionApi._getRegistrySizeForTesting()).toBe(0);
    expect(SubscriptionApi._getDependencyIndexEntryCountForTesting()).toBe(0);
  });

  it('detailKey with cardinality: many is rejected without registering', async () => {
    await bootRegistry();
    const { interactive } = await makeAvatarInteractive();
    interactive.subscribe('s-bad', SUBSCRIPTION_SOURCES.mql, {
    query: 'me',
    cardinality: 'many',
    detailKey: 'foo',
  });
    expect(SubscriptionApi._getRegistrySizeForTesting()).toBe(0);
  });
});

describe('SubscriptionLogic singleton encapsulation', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  it('lives at /platform/idea/api/subscription once the facade has materialized it', () => {
    // A facade call lazily creates the logic singleton.
    SubscriptionApi._getRegistrySizeForTesting();
    const logic = StuffApi.findByTemplatePath('/platform/idea/api/subscription');
    expect(logic).toBeDefined();
    expect(StuffApi.findByPathGlob('/platform/idea/api/*')).toContain(logic);
  });

  it('denies a direct logic-method call from a non-SubscriptionApi caller', () => {
    SubscriptionApi._getRegistrySizeForTesting();
    const logic = StuffApi.findByTemplatePath<SubscriptionLogic>(
      '/platform/idea/api/subscription'
    );
    expect(logic).toBeDefined();
    // The test module is not `mud/api/subscription#SubscriptionApi`,
    // so the FromModule gate on the logic's own methods denies the call.
    expect(() => logic!._getRegistrySize()).toThrow(SecurityError);
  });
});
