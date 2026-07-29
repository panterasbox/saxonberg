/**
 * KickRelayReader — the presence-gated webhook-subscription worker, over
 * an injected mock `KickClient`. Covers the subscribe/unsubscribe edges
 * (idempotency + the broadcasterId→subscriptionId map), the verified-
 * inbound normalization down-call (`StreamApi.dispatchInbound('kick', …)`),
 * malformed-payload drops, and the resolve/isConfigured forwards.
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type MockInstance,
} from 'vitest';
import { KickRelayReader } from '../KickRelayReader';
import type { KickClient } from '../KickClient';
import { StreamApi } from '../../mud/api/stream';

function makeMockClient(over?: Partial<{
  isConfigured: boolean;
  resolveSlug: (s: string) => Promise<unknown>;
  createFails: boolean;
}>): {
  client: KickClient;
  created: string[];
  deleted: string[][];
} {
  const created: string[] = [];
  const deleted: string[][] = [];
  let counter = 0;
  const client = {
    isConfigured: () => over?.isConfigured ?? true,
    resolveSlug:
      over?.resolveSlug ??
      (async () => ({ broadcasterId: '123', slug: 'xqc' })),
    createChatSubscription: async (broadcasterId: string) => {
      if (over?.createFails) throw new Error('create failed');
      created.push(broadcasterId);
      return { id: `sub-${++counter}` };
    },
    deleteSubscriptions: async (ids: string[]) => {
      deleted.push(ids);
    },
  } as unknown as KickClient;
  return { client, created, deleted };
}

function chatEvent(over?: Record<string, unknown>): Record<string, unknown> {
  return {
    broadcaster: { user_id: 123 },
    sender: { user_id: 456, username: 'fan' },
    content: 'nice',
    ...over,
  };
}

describe('KickRelayReader', () => {
  let dispatch: MockInstance<typeof StreamApi.dispatchInbound>;

  beforeEach(() => {
    dispatch = vi
      .spyOn(StreamApi, 'dispatchInbound')
      .mockResolvedValue(undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('isConfigured + resolveSlug forward to the client', async () => {
    const { client } = makeMockClient();
    const reader = KickRelayReader.forTest(client);
    expect(reader.isConfigured()).toBe(true);
    expect(await reader.resolveSlug('xqc')).toEqual({
      broadcasterId: '123',
      slug: 'xqc',
    });
  });

  it('subscribe creates once (idempotent) and stashes the id', async () => {
    const { client, created } = makeMockClient();
    const reader = KickRelayReader.forTest(client);
    await reader.subscribe('123');
    await reader.subscribe('123');
    expect(created).toEqual(['123']);
  });

  it('unsubscribe deletes by the stashed id; repeat is a no-op', async () => {
    const { client, deleted } = makeMockClient();
    const reader = KickRelayReader.forTest(client);
    await reader.subscribe('123');
    reader.unsubscribe('123');
    reader.unsubscribe('123');
    expect(deleted).toEqual([['sub-1']]);
    // The map entry is gone — a re-subscribe creates a fresh one.
    await reader.subscribe('123');
    reader.unsubscribe('123');
    expect(deleted).toEqual([['sub-1'], ['sub-2']]);
  });

  it('a create failure is logged, not thrown; no id stashed', async () => {
    const { client, deleted } = makeMockClient({ createFails: true });
    const reader = KickRelayReader.forTest(client);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await reader.subscribe('123');
    expect(err).toHaveBeenCalled();
    reader.unsubscribe('123');
    expect(deleted).toEqual([]);
  });

  it('handleInbound normalizes a chat event → dispatchInbound', () => {
    const { client } = makeMockClient();
    const reader = KickRelayReader.forTest(client);
    reader.handleInbound(chatEvent());
    expect(dispatch).toHaveBeenCalledWith('kick', {
      channelKey: '123',
      senderUserId: '456',
      senderLogin: 'fan',
      senderDisplay: 'fan',
      text: 'nice',
    });
  });

  it('handleInbound falls back to channel_slug for the sender name', () => {
    const { client } = makeMockClient();
    const reader = KickRelayReader.forTest(client);
    reader.handleInbound(
      chatEvent({ sender: { user_id: 456, channel_slug: 'fan-slug' } })
    );
    expect(dispatch).toHaveBeenCalledWith(
      'kick',
      expect.objectContaining({ senderLogin: 'fan-slug' })
    );
  });

  it('malformed payloads drop without dispatch', () => {
    const { client } = makeMockClient();
    const reader = KickRelayReader.forTest(client);
    reader.handleInbound(null);
    reader.handleInbound('nope');
    reader.handleInbound(chatEvent({ content: '' }));
    reader.handleInbound(chatEvent({ broadcaster: {} }));
    expect(dispatch).not.toHaveBeenCalled();
  });
});
