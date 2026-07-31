/**
 * Escape battery — SUBSCRIPTIONS: live MQL subscriptions capture birth
 * scope; a circle's subscriptions are cancelled at reap while
 * field-born subscriptions survive a crossing unpoisoned. Fails
 * without the `birthScope` capture + `cancelAllForScope` on the
 * MqlSubscriptionRegistry.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MqlSubscriptionApi } from '../../../../api/mql-subscription';
import { StuffApi } from '../../../../api/stuff';
import { ShadowApi } from '../../../../api/shadow';
import { EventApi } from '../../../../api/event';
import { Stuff } from '../../../stuff/Stuff';
import {
  ExecutionContextApi,
} from '../../../../api/execution-context';
import EventRegistry from '../../../../obj/EventRegistry';
import Interactive from '../../../../obj/Interactive';
import Avatar from '../../../../obj/Avatar';
import { ConnectionApi } from '../../../../api/connection';

const SCOPE = '/home/escape-tester';

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

async function makeAvatarInteractive(
  tag: string
): Promise<{ interactive: Interactive; avatar: Avatar }> {
  const avatar = await StuffApi.create(() => new Avatar());
  const interactive = await StuffApi.create(
    () => new Interactive(`sock-${tag}`, `sess-${tag}`, { _id: 'u1' } as never)
  );
  ConnectionApi.transfer(interactive, avatar);
  return { interactive, avatar };
}

describe('sandbox-escape: subscriptions', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    MqlSubscriptionApi._clearAllForTesting();
    ExecutionContextApi._clearForTesting();
  });

  it('a circle-born subscription dies at reap; a field-born one survives', async () => {
    await bootRegistry();

    // Field subscription (ordinary client pane).
    const field = await makeAvatarInteractive('field');
    MqlSubscriptionApi.handleSubscribe({
      interactive: field.interactive,
      subscriptionId: 'field-sub',
      query: 'me',
      cardinality: 'one',
    });

    // Circle subscription: registered from a circle-scoped context —
    // the whole holder rig is minted in-scope, the way a wire body's
    // panes would be.
    await ExecutionContextApi.runRootGuarded(
      null,
      'escape',
      async () => {
        const circle = await makeAvatarInteractive('circle');
        MqlSubscriptionApi.handleSubscribe({
          interactive: circle.interactive,
          subscriptionId: 'circle-sub',
          query: 'me',
          cardinality: 'one',
        });
      },
      'rethrow',
      { circleScope: SCOPE }
    );

    expect(MqlSubscriptionApi._getRegistrySizeForTesting()).toBe(2);

    // Reap: the circle's live queries die with its session…
    const cancelled = MqlSubscriptionApi.cancelAllForScope(SCOPE);
    expect(cancelled).toBe(1);
    // …and the field-born one keeps running, unpoisoned.
    expect(MqlSubscriptionApi._getRegistrySizeForTesting()).toBe(1);

    // Reap is idempotent.
    expect(MqlSubscriptionApi.cancelAllForScope(SCOPE)).toBe(0);
  });
});
