/**
 * Escape battery — SUBSCRIPTIONS: live MQL subscriptions capture birth
 * scope; a circle's subscriptions are cancelled at reap while
 * field-born subscriptions survive a crossing unpoisoned. Fails
 * without the `birthScope` capture + `cancelAllForScope` on the
 * MqlSubscriptionRegistry.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MqlSubscriptionApi } from '../../../../api/mql-subscription';
import { StuffApi } from '../../../../api/stuff';
import { ShadowApi } from '../../../../api/shadow';
import { EventApi } from '../../../../api/event';
import { Stuff } from '../../../stuff/Stuff';
import {
  ExecutionContextApi,
} from '../../../../api/execution-context';
import EventRegistry from '../../../../platform/idea/EventRegistry';
import Interactive from '../../../../platform/idea/Interactive';
import Avatar from '../../../../platform/agent/Avatar';

/*
 * ⚠⚠ **A 20 s timeout, and the number is a MEASUREMENT rather than a
 * guess.** Every test in this file drives a whole session ceremony —
 * mint a vessel, move the sockets, run `Avatar.enter`, auto-sense the
 * circle — which costs 2–3.2 s each on an idle box against vitest's
 * 5 s default. That is under one contention spike of failing, and on a
 * loaded full-suite run it duly did: three to five `Test timed out in
 * 5000ms` in the sandbox files, every one of them green in isolation.
 *
 * ⚠ The card-surface build made it worse and the cost was measured, not
 * assumed: arrival auto-senses, `sense` now opens a card, and a card
 * open resolves + subscribes. Removing `opens_card` from `sense.yaml`
 * and re-running took this file from 19.3 s to 17.5 s — **~10%**, or
 * ~100 ms per arrival. That is the feature costing what the feature
 * costs, not a regression to chase; it is recorded here so the next
 * person to see these files time out knows what is in them.
 *
 * ⚠ Raised per FILE, deliberately. A global `testTimeout` bump would
 * buy this file's honesty at the price of every genuine hang in the
 * suite taking four times as long to report.
 */
vi.setConfig({ testTimeout: 20_000 });


const SCOPE = '/home/escape-tester';

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

async function makeAvatarInteractive(
  tag: string
): Promise<{ interactive: Interactive; avatar: Avatar }> {
  const avatar = await StuffApi.create(() => new Avatar());
  const interactive = await StuffApi.create(
    () => new Interactive(`sock-${tag}`, `sess-${tag}`, { _id: 'u1' } as never)
  );
  interactive.transferTo(avatar);
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

    // Field subscription (ordinary client card).
    const field = await makeAvatarInteractive('field');
    MqlSubscriptionApi.handleSubscribe({
      interactive: field.interactive,
      subscriptionId: 'field-sub',
      query: 'me',
      cardinality: 'one',
    });

    // Circle subscription: registered from a circle-scoped context —
    // the whole holder rig is minted in-scope, the way a wire body's
    // cards would be.
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
