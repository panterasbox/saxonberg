/**
 * KickClient — the outbound half of the Kick transport over an injected
 * transport: app-token client-credentials grant (cached), slug →
 * broadcaster-id resolve (TTL-cached), webhook-subscription
 * create/delete, and the public-key fetch. Secrets never leak into
 * error messages.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { KickClient, type KickTransport } from '../KickClient';

function res(body: unknown, ok = true, status?: number): Response {
  return {
    ok,
    status: status ?? (ok ? 200 : 404),
    json: async () => body,
  } as unknown as Response;
}

const TOKEN_BODY = { access_token: 'app-tok', expires_in: 3600 };

function makeTransport(routes: (url: string, init?: RequestInit) => Response): {
  transport: KickTransport;
  fetchMock: ReturnType<typeof vi.fn>;
} {
  const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) =>
    routes(String(url), init)
  );
  return {
    transport: { fetch: fetchMock as unknown as typeof fetch },
    fetchMock,
  };
}

function defaultRoutes(url: string): Response {
  if (url.includes('id.kick.com/oauth/token')) return res(TOKEN_BODY);
  if (url.includes('/channels')) {
    return res({ data: [{ broadcaster_user_id: 123, slug: 'xqc' }] });
  }
  if (url.includes('/events/subscriptions')) {
    return res({ data: [{ subscription_id: 'sub-1' }] });
  }
  if (url.includes('/public-key')) {
    return res({ data: { public_key: '-----BEGIN PUBLIC KEY-----…' } });
  }
  return res({}, false);
}

describe('KickClient', () => {
  beforeEach(() => {
    vi.stubEnv('KICK_CLIENT_ID', 'cid');
    vi.stubEnv('KICK_CLIENT_SECRET', 'shh-secret');
    vi.stubEnv('KICK_WEBHOOK_URL', 'https://mud.example.com/webhooks/kick');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('isConfigured false when any env var is absent', () => {
    vi.stubEnv('KICK_WEBHOOK_URL', '');
    const { transport } = makeTransport(defaultRoutes);
    expect(KickClient.forTest(transport).isConfigured()).toBe(false);
  });

  it('appToken posts the client-credentials form and caches it', async () => {
    const { transport, fetchMock } = makeTransport(defaultRoutes);
    const client = KickClient.forTest(transport);

    const first = await client.appToken();
    const second = await client.appToken();

    expect(first).toBe('app-tok');
    expect(second).toBe('app-tok');
    // One token fetch — the second call hit the cache.
    const tokenCalls = fetchMock.mock.calls.filter(([u]) =>
      String(u).includes('oauth/token')
    );
    expect(tokenCalls).toHaveLength(1);
    const body = tokenCalls[0]![1]!.body as URLSearchParams;
    expect(body.get('grant_type')).toBe('client_credentials');
    expect(body.get('client_id')).toBe('cid');
  });

  it('resolveSlug GETs /channels?slug= with the app token and caches', async () => {
    const { transport, fetchMock } = makeTransport(defaultRoutes);
    const client = KickClient.forTest(transport);

    const first = await client.resolveSlug('XQC', 60_000);
    const second = await client.resolveSlug('xqc', 60_000);

    expect(first).toEqual({ broadcasterId: '123', slug: 'xqc' });
    expect(second).toEqual(first);
    const channelCalls = fetchMock.mock.calls.filter(([u]) =>
      String(u).includes('/channels')
    );
    expect(channelCalls).toHaveLength(1);
    const url = String(channelCalls[0]![0]);
    expect(url).toContain('slug=xqc');
    const headers = channelCalls[0]![1]!.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer app-tok');
  });

  it("resolveSlug returns 'unknown' on a miss / error", async () => {
    const { transport } = makeTransport((url) => {
      if (url.includes('oauth/token')) return res(TOKEN_BODY);
      return res({ data: [] });
    });
    const client = KickClient.forTest(transport);
    expect(await client.resolveSlug('nobody', 60_000)).toBe('unknown');
  });

  it('createChatSubscription sends the exact body and returns the id', async () => {
    const { transport, fetchMock } = makeTransport(defaultRoutes);
    const client = KickClient.forTest(transport);

    const created = await client.createChatSubscription('123');

    expect(created).toEqual({ id: 'sub-1' });
    const call = fetchMock.mock.calls.find(([u]) =>
      String(u).includes('/events/subscriptions')
    )!;
    expect(call[1]!.method).toBe('POST');
    const body = JSON.parse(String(call[1]!.body)) as Record<string, unknown>;
    expect(body).toEqual({
      broadcaster_user_id: 123,
      events: [{ name: 'chat.message.sent', version: 1 }],
      method: 'webhook',
    });
  });

  it('createChatSubscription throws on non-2xx without leaking the secret', async () => {
    const { transport } = makeTransport((url) => {
      if (url.includes('oauth/token')) return res(TOKEN_BODY);
      return res({}, false, 429);
    });
    const client = KickClient.forTest(transport);
    await expect(client.createChatSubscription('123')).rejects.toThrow(
      /429/
    );
    await expect(
      client.createChatSubscription('123')
    ).rejects.not.toThrow(/shh-secret/);
  });

  it('deleteSubscriptions builds the multi-id query (DELETE)', async () => {
    const { transport, fetchMock } = makeTransport(defaultRoutes);
    const client = KickClient.forTest(transport);

    await client.deleteSubscriptions(['sub-1', 'sub-2']);

    const call = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'DELETE'
    )!;
    const url = String(call[0]);
    expect(url).toContain('id=sub-1');
    expect(url).toContain('id=sub-2');
  });

  it('fetchPublicKey returns the PEM (no auth header)', async () => {
    const { transport, fetchMock } = makeTransport(defaultRoutes);
    const client = KickClient.forTest(transport);

    const pem = await client.fetchPublicKey();

    expect(pem).toContain('BEGIN PUBLIC KEY');
    const call = fetchMock.mock.calls.find(([u]) =>
      String(u).includes('/public-key')
    )!;
    expect(call[1]).toBeUndefined();
  });
});
