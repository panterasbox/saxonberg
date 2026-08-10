/**
 * Wave 4: registry + handleSubscribe / handleUnsubscribe /
 * cancelAllForInteractive surface tests. Builds a synthetic
 * Interactive whose holder composes Avatar (CommandGiver + Sensor).
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { MqlSubscriptionApi } from '../mql-subscription';
import { MqlSubscriptionLogic } from '../../obj/api/MqlSubscriptionLogic';
import { SecurityError } from '../../lib/security/errors';
import { EventApi } from '../event';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { Stuff } from '../../lib/stuff/Stuff';
import EventRegistry from '../../obj/EventRegistry';
import Interactive from '../../obj/Interactive';
import Avatar from '../../obj/Avatar';
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
  const interactive = await StuffApi.create(
    () => new Interactive('sock-1', 'sess-1', { _id: 'u1' } as never),
  );
  ConnectionApi.transfer(interactive, avatar);
  return { interactive, avatar };
}

describe('MqlSubscriptionApi — registry surface', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    MqlSubscriptionApi._clearAllForTesting();
  });

  it('handleSubscribe with a "me" query registers state', async () => {
    await bootRegistry();
    const { interactive, avatar } = await makeAvatarInteractive();
    avatar.setName('Alice');
    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 's1',
      query: 'me',
      cardinality: 'one',
      fields: 'ref',
    });
    expect(MqlSubscriptionApi._getRegistrySizeForTesting()).toBe(1);
  });

  it('duplicate subscriptionId is rejected with no second registration', async () => {
    await bootRegistry();
    const { interactive } = await makeAvatarInteractive();
    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 's1',
      query: 'me',
      cardinality: 'one',
    });
    expect(MqlSubscriptionApi._getRegistrySizeForTesting()).toBe(1);
    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 's1',
      query: 'me',
      cardinality: 'one',
    });
    expect(MqlSubscriptionApi._getRegistrySizeForTesting()).toBe(1);
  });

  it('handleUnsubscribe drops the subscription and silently no-ops on unknown ids', async () => {
    await bootRegistry();
    const { interactive } = await makeAvatarInteractive();
    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 's1',
      query: 'me',
      cardinality: 'one',
    });
    expect(MqlSubscriptionApi._getRegistrySizeForTesting()).toBe(1);
    MqlSubscriptionApi.handleUnsubscribe(interactive, 's-nope');
    expect(MqlSubscriptionApi._getRegistrySizeForTesting()).toBe(1);
    MqlSubscriptionApi.handleUnsubscribe(interactive, 's1');
    expect(MqlSubscriptionApi._getRegistrySizeForTesting()).toBe(0);
    expect(MqlSubscriptionApi._getDependencyIndexEntryCountForTesting()).toBe(0);
  });

  it('cancelAllForInteractive removes every subscription for that interactive', async () => {
    await bootRegistry();
    const { interactive } = await makeAvatarInteractive();
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

  it('detailKey with cardinality: many is rejected without registering', async () => {
    await bootRegistry();
    const { interactive } = await makeAvatarInteractive();
    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 's-bad',
      query: 'me',
      cardinality: 'many',
      detailKey: 'foo',
    });
    expect(MqlSubscriptionApi._getRegistrySizeForTesting()).toBe(0);
  });
});

describe('MqlSubscriptionLogic singleton encapsulation', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  it('lives at /obj/api/mql-subscription once the facade has materialized it', () => {
    // A facade call lazily creates the logic singleton.
    MqlSubscriptionApi._getRegistrySizeForTesting();
    const logic = StuffApi.findByTemplatePath('/obj/api/mql-subscription');
    expect(logic).toBeDefined();
    expect(StuffApi.findByPathGlob('/obj/api/*')).toContain(logic);
  });

  it('denies a direct logic-method call from a non-MqlSubscriptionApi caller', () => {
    MqlSubscriptionApi._getRegistrySizeForTesting();
    const logic = StuffApi.findByTemplatePath<MqlSubscriptionLogic>(
      '/obj/api/mql-subscription'
    );
    expect(logic).toBeDefined();
    // The test module is not `mud/api/mql-subscription#MqlSubscriptionApi`,
    // so the FromModule gate on the logic's own methods denies the call.
    expect(() => logic!._getRegistrySize()).toThrow(SecurityError);
  });
});
