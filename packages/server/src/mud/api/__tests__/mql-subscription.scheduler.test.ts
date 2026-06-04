/**
 * Wave 4: setImmediate-batched dirty-set scheduler — multiple
 * events for the same target between two ticks should produce a
 * single re-resolve per affected subscription.
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

async function setup(): Promise<Interactive> {
  await bootRegistry();
  const avatar = await StuffApi.create(() => new Avatar());
  avatar.setName('Alice');
  const interactive = await StuffApi.create(
    () => new Interactive('sock-1', 'sess-1', { _id: 'u1' } as never),
  );
  ConnectionApi.transfer(interactive, avatar);
  return interactive;
}

describe('MqlSubscriptionApi — dirty scheduler', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    MqlSubscriptionApi._clearAllForTesting();
  });

  it('multiple events in one tick coalesce to one re-resolve', async () => {
    const interactive = await setup();
    const holder = interactive.getHolder()!;
    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 's1',
      query: 'me',
      cardinality: 'one',
      fields: 'ref',
    });

    const spy = vi.spyOn(MqlApi, 'resolveOne');
    // Fire three name-change events for this target in the same tick.
    const avatar = holder as unknown as { setName: (s: string) => void };
    avatar.setName('Bob');
    avatar.setName('Carol');
    avatar.setName('Dave');
    expect(spy).not.toHaveBeenCalled(); // setImmediate hasn't run yet
    await MqlSubscriptionApi._drainScheduledForTesting();
    // One re-resolve for the lone subscription, regardless of three fires.
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
