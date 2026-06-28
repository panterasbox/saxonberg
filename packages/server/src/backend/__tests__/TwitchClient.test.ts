/**
 * TwitchClient — the shared integration substrate, driven over a mocked
 * transport (no live Twitch). Covers: EventSub session welcome →
 * session_id; subscription create issuing the right Helix POST with the
 * session id; notification fan-out; reset on a fresh reconnect;
 * stateless Helix Send Chat Message; and token refresh + write-back.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TwitchClient,
  type TwitchSocket,
  type TwitchTransport,
} from '../TwitchClient';
import type { TwitchProfile } from '../../mud/lib/identity/TwitchProfile';

class MockSocket implements TwitchSocket {
  public closed = false;
  private msgCb: ((d: string) => void) | null = null;
  private closeCb: ((d: string) => void) | null = null;

  on(event: 'message' | 'close' | 'error', cb: (data: string) => void): void {
    if (event === 'message') this.msgCb = cb;
    else if (event === 'close') this.closeCb = cb;
  }
  close(): void {
    this.closed = true;
    this.closeCb?.('');
  }
  emit(obj: unknown): void {
    this.msgCb?.(JSON.stringify(obj));
  }
}

function okJson(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as unknown as Response;
}

function welcome(id = 'sess-1') {
  return {
    metadata: { message_type: 'session_welcome' },
    payload: { session: { id, keepalive_timeout_seconds: 10 } },
  };
}

describe('TwitchClient', () => {
  let sockets: MockSocket[];
  let fetchMock: ReturnType<typeof vi.fn>;
  let transport: TwitchTransport;
  let client: TwitchClient;

  beforeEach(() => {
    process.env.TWITCH_CLIENT_ID = 'cid';
    process.env.TWITCH_CLIENT_SECRET = 'secret';
    sockets = [];
    fetchMock = vi.fn();
    transport = {
      fetch: fetchMock as unknown as typeof fetch,
      openWebSocket: () => {
        const s = new MockSocket();
        sockets.push(s);
        return s;
      },
    };
    client = TwitchClient.forTest(transport, 0);
  });
  afterEach(() => {
    client.dispose();
    vi.restoreAllMocks();
  });

  it('resolves session id after session_welcome', async () => {
    const idP = client.getSessionId();
    sockets[0]!.emit(welcome('sess-1'));
    await expect(idP).resolves.toBe('sess-1');
  });

  it('createSubscription posts the type + condition + session id', async () => {
    const idP = client.getSessionId();
    sockets[0]!.emit(welcome('sess-1'));
    await idP;
    fetchMock.mockResolvedValueOnce(okJson({ data: [{ id: 'sub-1' }] }));

    const { id } = await client.createSubscription({
      type: 'channel.chat.message',
      version: '1',
      condition: { broadcaster_user_id: 'b1', user_id: 'reader' },
      token: 'reader-tok',
    });

    expect(id).toBe('sub-1');
    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.type).toBe('channel.chat.message');
    expect(body.condition).toEqual({
      broadcaster_user_id: 'b1',
      user_id: 'reader',
    });
    expect(body.transport).toEqual({
      method: 'websocket',
      session_id: 'sess-1',
    });
  });

  it('fans out notifications to handlers', async () => {
    const seen: unknown[] = [];
    client.onNotification((n) => seen.push(n));
    const idP = client.getSessionId();
    sockets[0]!.emit(welcome());
    await idP;

    sockets[0]!.emit({
      metadata: { message_type: 'notification' },
      payload: {
        subscription: { type: 'channel.chat.message' },
        event: { chatter_user_login: 'viewer', message: { text: 'hi' } },
      },
    });

    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({
      subscriptionType: 'channel.chat.message',
      event: { chatter_user_login: 'viewer' },
    });
  });

  it('fires reset when the session re-establishes fresh after a close', async () => {
    let resets = 0;
    client.onSessionReset(() => (resets += 1));
    const idP = client.getSessionId();
    sockets[0]!.emit(welcome('sess-1'));
    await idP;
    expect(resets).toBe(0);

    // Socket drops → client reconnects (delay 0) and gets a fresh welcome.
    sockets[0]!.close();
    await new Promise((r) => setTimeout(r, 0));
    expect(sockets.length).toBe(2);
    sockets[1]!.emit(welcome('sess-2'));
    expect(resets).toBe(1);
  });

  it('sendChatMessage posts to Helix and reports ok', async () => {
    fetchMock.mockResolvedValueOnce(
      okJson({ data: [{ message_id: 'm1', is_sent: true }] })
    );
    const r = await client.sendChatMessage({
      broadcasterId: 'b1',
      senderId: 'u1',
      token: 'write-tok',
      text: 'hello twitch',
    });
    expect(r).toEqual({ ok: true, messageId: 'm1' });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain('/helix/chat/messages');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toEqual({
      broadcaster_id: 'b1',
      sender_id: 'u1',
      message: 'hello twitch',
    });
  });

  it('tokenFor refreshes an expired token and writes it back', async () => {
    const applied: unknown[] = [];
    const profile = {
      accessToken: 'old',
      refreshToken: 'rt',
      expiresAt: 0, // expired
      scopes: ['user:read:chat'],
      applyRefreshedToken: vi.fn(async (t: unknown) => {
        applied.push(t);
      }),
    } as unknown as TwitchProfile;

    fetchMock.mockResolvedValueOnce(
      okJson({
        access_token: 'new',
        refresh_token: 'rt2',
        expires_in: 3600,
        scope: 'user:read:chat',
      })
    );

    const tok = await client.tokenFor(profile);
    expect(tok).toBe('new');
    expect(profile.applyRefreshedToken).toHaveBeenCalledTimes(1);
    expect(applied[0]).toMatchObject({
      accessToken: 'new',
      refreshToken: 'rt2',
      scopes: ['user:read:chat'],
    });
  });

  it('tokenFor returns a live token without refreshing', async () => {
    const profile = {
      accessToken: 'live',
      refreshToken: 'rt',
      expiresAt: Date.now() + 3_600_000,
      scopes: [],
      applyRefreshedToken: vi.fn(),
    } as unknown as TwitchProfile;
    const tok = await client.tokenFor(profile);
    expect(tok).toBe('live');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
