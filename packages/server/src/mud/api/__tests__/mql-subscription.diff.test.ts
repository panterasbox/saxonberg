/**
 * Wave 4: diff algorithm — single-cardinality replace/update/remove,
 * collection cardinality add/remove/update.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MqlSubscriptionApi } from '../mql-subscription';
import { EventApi } from '../event';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { Stuff } from '../../lib/stuff/Stuff';
import EventRegistry from '../../platform/idea/EventRegistry';
import Interactive from '../../platform/idea/Interactive';
import Avatar from '../../platform/agent/Avatar';

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

async function setup(): Promise<{ interactive: Interactive; avatar: Avatar }> {
  await bootRegistry();
  const avatar = await StuffApi.create(() => new Avatar());
  avatar.setName('Alice');
  const interactive = await StuffApi.create(
    () => new Interactive('sock-1', 'sess-1', { _id: 'u1' } as never),
  );
  interactive.transferTo(avatar);
  return { interactive, avatar };
}

interface AnyEnvelope {
  type: string;
  changes?: Array<{
    op: 'replace' | 'update' | 'add' | 'remove';
    key: string;
    fields?: Record<string, unknown>;
  }>;
  result?: unknown[];
}

function captureEnvelopes(avatar: Avatar): AnyEnvelope[] {
  const collected: AnyEnvelope[] = [];
  vi.spyOn(avatar, 'onEnvelope').mockImplementation((tpl) => {
    collected.push(tpl as unknown as AnyEnvelope);
  });
  return collected;
}

describe('MqlSubscriptionApi — diff', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    MqlSubscriptionApi._clearAllForTesting();
  });

  it('single-cardinality field change produces op: update with diffed fields', async () => {
    const { interactive, avatar } = await setup();
    const envelopes = captureEnvelopes(avatar);

    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 's1',
      query: 'me',
      cardinality: 'one',
      fields: 'ref',
    });
    expect(envelopes.find((e) => e.type === 'mql-subscription-result')).toBeDefined();

    envelopes.length = 0;
    avatar.setName('Bob');
    await MqlSubscriptionApi._drainScheduledForTesting();

    const delta = envelopes.find((e) => e.type === 'mql-subscription-delta');
    expect(delta).toBeDefined();
    expect(delta!.changes).toHaveLength(1);
    expect(delta!.changes![0]).toMatchObject({
      op: 'update',
      key: avatar.stuffId,
      fields: { displayName: 'Bob' },
    });
  });

  it('a same-value mutation produces no delta (silent no-op)', async () => {
    const { interactive, avatar } = await setup();
    const envelopes = captureEnvelopes(avatar);

    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 's1',
      query: 'me',
      cardinality: 'one',
      fields: 'ref',
    });
    envelopes.length = 0;
    // setName('Alice') noop-skips at the FieldChangedEvent layer
    // because Object.is(old, new). Verifies no spurious delta.
    avatar.setName('Alice');
    await MqlSubscriptionApi._drainScheduledForTesting();
    expect(envelopes.filter((e) => e.type === 'mql-subscription-delta')).toEqual([]);
  });
});
