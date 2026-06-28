/**
 * TwitchClient — the shared backend Twitch integration substrate.
 *
 * Encapsulates the three pieces every Twitch integration needs: an
 * EventSub websocket *session* (welcome → session_id → keepalive →
 * reconnect), Helix REST calls (subscription create/delete, Send Chat
 * Message), and token resolution from a `TwitchProfile` (decrypt →
 * refresh-if-expired → write-back). It is **event-type-parameterized** and
 * carries no chat-relay assumption: `createSubscription` takes the EventSub
 * `type`, so the Phase-4 payment-intake build can subscribe
 * `channel.subscribe` / `channel.cheer` through the *same* client and
 * session.
 *
 * Layer: backend/ infrastructure, modeled on `BroadcastFeed` (singleton,
 * lazy boot, reconnect/backoff). It reaches mud/ only for `TwitchProfile`
 * (a Document) — never the relay surface. Tokens are read via the profile
 * load path (auto-decrypted) and never logged.
 *
 * The transport (`fetch` + websocket) is injected, defaulting to the real
 * `fetch`/`ws`; tests pass a mock to drive synthetic EventSub frames with
 * no live Twitch dependency.
 */

import { WebSocket } from 'ws';
import { TwitchProfile } from '../mud/lib/identity/TwitchProfile';

const EVENTSUB_WS_URL = 'wss://eventsub.wss.twitch.tv/ws';
const HELIX_EVENTSUB_URL = 'https://api.twitch.tv/helix/eventsub/subscriptions';
const HELIX_CHAT_MESSAGES_URL = 'https://api.twitch.tv/helix/chat/messages';
const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';

/**
 * A minimal websocket the client drives — the test seam. The `'message'`
 * handler receives the frame text; `'close'`/`'error'` handlers ignore the
 * argument (a single signature keeps the interface trivially implementable
 * by the real `ws` adapter and the test mock).
 */
export interface TwitchSocket {
  on(event: 'message' | 'close' | 'error', cb: (data: string) => void): void;
  close(): void;
}

/** Injected transport: HTTP + websocket. Real impl wraps `fetch`/`ws`. */
export interface TwitchTransport {
  fetch: typeof fetch;
  openWebSocket(url: string): TwitchSocket;
}

/** A decoded EventSub notification handed to consumers. */
export interface TwitchNotification {
  subscriptionType: string;
  event: Record<string, unknown>;
}

type NotificationHandler = (n: TwitchNotification) => void;
type ResetHandler = () => void;

function realTransport(): TwitchTransport {
  return {
    fetch,
    openWebSocket(url: string): TwitchSocket {
      const ws = new WebSocket(url);
      return {
        on(event: 'message' | 'close' | 'error', cb: (data: string) => void) {
          if (event === 'message') {
            ws.on('message', (data: Buffer) => cb(data.toString()));
          } else {
            ws.on(event, () => cb(''));
          }
        },
        close() {
          ws.close();
        },
      };
    },
  };
}

function normalizeScope(scope: unknown): string[] {
  if (Array.isArray(scope)) {
    return scope.filter((s): s is string => typeof s === 'string');
  }
  if (typeof scope === 'string') return scope.split(' ').filter(Boolean);
  return [];
}

/**
 * One EventSub websocket session. Owns the socket, keepalive watchdog, and
 * reconnect. Fires `notify` on each notification; fires `reset` when the
 * session is re-established *fresh* (a new session_id whose prior
 * subscriptions are gone), so consumers re-create their subscriptions. A
 * graceful `session_reconnect` (URL handoff) carries subscriptions over and
 * does NOT fire reset.
 */
class TwitchEventSubSession {
  public sessionId: string | null = null;
  private socket: TwitchSocket | null = null;
  private readyPromise: Promise<string> | null = null;
  private resolveReady: ((id: string) => void) | null = null;
  private keepaliveTimer: ReturnType<typeof setTimeout> | null = null;
  private keepaliveSec = 30;
  private disposed = false;

  constructor(
    private readonly transport: TwitchTransport,
    private readonly notify: Set<NotificationHandler>,
    private readonly reset: Set<ResetHandler>,
    private readonly reconnectDelayMs: number
  ) {}

  public ready(): Promise<string> {
    if (!this.readyPromise) {
      this.readyPromise = new Promise<string>((resolve) => {
        this.resolveReady = resolve;
      });
      this.open(EVENTSUB_WS_URL, false);
    }
    return this.readyPromise;
  }

  public dispose(): void {
    this.disposed = true;
    this.disarmKeepalive();
    this.socket?.close();
  }

  private open(url: string, fresh: boolean): void {
    const socket = this.transport.openWebSocket(url);
    this.socket = socket;
    socket.on('message', (data: string) => this.onMessage(data, fresh));
    socket.on('close', () => {
      this.disarmKeepalive();
      if (!this.disposed) this.scheduleReconnect();
    });
    socket.on('error', () => {
      // Let the close handler drive reconnect.
    });
  }

  private onMessage(data: string, fresh: boolean): void {
    let msg: TwitchWsMessage;
    try {
      msg = JSON.parse(data) as TwitchWsMessage;
    } catch {
      return;
    }
    const type = msg.metadata?.message_type;
    switch (type) {
      case 'session_welcome': {
        const session = msg.payload?.session;
        this.sessionId = session?.id ?? null;
        this.keepaliveSec = session?.keepalive_timeout_seconds ?? 30;
        this.armKeepalive();
        if (this.sessionId && this.resolveReady) {
          this.resolveReady(this.sessionId);
          this.resolveReady = null;
        }
        // A fresh re-establish invalidates prior subscriptions.
        if (fresh) this.reset.forEach((h) => h());
        break;
      }
      case 'session_keepalive':
        this.armKeepalive();
        break;
      case 'notification': {
        this.armKeepalive();
        const subType =
          msg.payload?.subscription?.type ??
          msg.metadata?.subscription_type ??
          '';
        const event = msg.payload?.event ?? {};
        this.notify.forEach((h) => h({ subscriptionType: subType, event }));
        break;
      }
      case 'session_reconnect': {
        // Graceful handoff: subscriptions carry to the new URL — no reset.
        const url = msg.payload?.session?.reconnect_url;
        if (url) {
          this.socket?.close();
          this.open(url, false);
        }
        break;
      }
      case 'revocation':
        // A subscription was dropped server-side — re-create on reset.
        this.reset.forEach((h) => h());
        break;
      default:
        break;
    }
  }

  private scheduleReconnect(): void {
    setTimeout(() => {
      if (!this.disposed) this.open(EVENTSUB_WS_URL, true);
    }, this.reconnectDelayMs);
  }

  private armKeepalive(): void {
    this.disarmKeepalive();
    // Twitch sends keepalives every keepaliveSec; allow 2x + slack before
    // assuming a dead connection and forcing a reconnect.
    this.keepaliveTimer = setTimeout(
      () => this.socket?.close(),
      this.keepaliveSec * 2000 + 5000
    );
  }

  private disarmKeepalive(): void {
    if (this.keepaliveTimer) {
      clearTimeout(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
  }
}

/** Shape of an EventSub websocket message (the fields we read). */
interface TwitchWsMessage {
  metadata?: { message_type?: string; subscription_type?: string };
  payload?: {
    session?: {
      id?: string;
      keepalive_timeout_seconds?: number;
      reconnect_url?: string;
    };
    subscription?: { type?: string };
    event?: Record<string, unknown>;
  };
}

export class TwitchClient {
  private static instance: TwitchClient;

  private readonly transport: TwitchTransport;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly reconnectDelayMs: number;

  private session: TwitchEventSubSession | null = null;
  private readonly notificationHandlers = new Set<NotificationHandler>();
  private readonly resetHandlers = new Set<ResetHandler>();

  private constructor(opts?: {
    transport?: TwitchTransport;
    reconnectDelayMs?: number;
  }) {
    this.transport = opts?.transport ?? realTransport();
    this.clientId = process.env.TWITCH_CLIENT_ID ?? '';
    this.clientSecret = process.env.TWITCH_CLIENT_SECRET ?? '';
    this.reconnectDelayMs = opts?.reconnectDelayMs ?? 2000;
  }

  public static get(): TwitchClient {
    if (!this.instance) this.instance = new TwitchClient();
    return this.instance;
  }

  /**
   * Test-only factory: a fresh client over an injected transport with no
   * reconnect delay. Not used in production (the singleton `get()` is).
   */
  public static forTest(
    transport: TwitchTransport,
    reconnectDelayMs = 0
  ): TwitchClient {
    return new TwitchClient({ transport, reconnectDelayMs });
  }

  /** Tear down the session (and its keepalive watchdog). */
  public dispose(): void {
    this.session?.dispose();
    this.session = null;
  }

  /** Register a notification handler (e.g. the relay reader's dispatch). */
  public onNotification(handler: NotificationHandler): void {
    this.notificationHandlers.add(handler);
  }

  /** Register a session-reset handler (re-create subscriptions). */
  public onSessionReset(handler: ResetHandler): void {
    this.resetHandlers.add(handler);
  }

  /** Open (lazily) the EventSub session and resolve its current id. */
  public async getSessionId(): Promise<string> {
    if (!this.session) {
      this.session = new TwitchEventSubSession(
        this.transport,
        this.notificationHandlers,
        this.resetHandlers,
        this.reconnectDelayMs
      );
    }
    return this.session.ready();
  }

  /**
   * Create an EventSub websocket subscription of an arbitrary `type` (the
   * no-chat-assumption seam). `token` is a user token bearing the required
   * scope (the reader's `user:read:chat` for `channel.chat.message`).
   */
  public async createSubscription(opts: {
    type: string;
    version: string;
    condition: Record<string, string>;
    token: string;
  }): Promise<{ id: string }> {
    const sessionId = await this.getSessionId();
    const res = await this.transport.fetch(HELIX_EVENTSUB_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${opts.token}`,
        'Client-Id': this.clientId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: opts.type,
        version: opts.version,
        condition: opts.condition,
        transport: { method: 'websocket', session_id: sessionId },
      }),
    });
    if (!res.ok) {
      throw new Error(`TwitchClient: subscription create failed (${res.status})`);
    }
    const json = (await res.json()) as { data?: Array<{ id?: string }> };
    const id = json.data?.[0]?.id;
    if (!id) {
      throw new Error('TwitchClient: subscription create returned no id');
    }
    return { id };
  }

  /** Delete an EventSub subscription by id. */
  public async deleteSubscription(id: string, token: string): Promise<void> {
    await this.transport.fetch(
      `${HELIX_EVENTSUB_URL}?id=${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Client-Id': this.clientId,
        },
      }
    );
  }

  /**
   * Send a chat message to a broadcaster's channel as `senderId`, using
   * `senderId`'s `user:write:chat` token. Stateless — no socket.
   */
  public async sendChatMessage(opts: {
    broadcasterId: string;
    senderId: string;
    token: string;
    text: string;
  }): Promise<{ ok: boolean; messageId?: string; error?: string }> {
    const res = await this.transport.fetch(HELIX_CHAT_MESSAGES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${opts.token}`,
        'Client-Id': this.clientId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        broadcaster_id: opts.broadcasterId,
        sender_id: opts.senderId,
        message: opts.text,
      }),
    });
    if (!res.ok) {
      return { ok: false, error: `helix ${res.status}` };
    }
    const json = (await res.json()) as {
      data?: Array<{ message_id?: string; is_sent?: boolean }>;
    };
    const d = json.data?.[0];
    if (d && d.is_sent === false) return { ok: false, error: 'dropped' };
    return { ok: true, messageId: d?.message_id };
  }

  /**
   * Resolve a usable access token for a profile, refreshing (and writing
   * back) if it is at/near expiry. Callers always get a live token.
   */
  public async tokenFor(profile: TwitchProfile): Promise<string> {
    const skewMs = 60_000;
    if (profile.accessToken && profile.expiresAt > Date.now() + skewMs) {
      return profile.accessToken;
    }
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: profile.refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });
    const res = await this.transport.fetch(TWITCH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      throw new Error(`TwitchClient: token refresh failed (${res.status})`);
    }
    const json = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: unknown;
    };
    if (!json.access_token || !json.refresh_token) {
      throw new Error('TwitchClient: token refresh returned no token');
    }
    await profile.applyRefreshedToken({
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresAt: Date.now() + (json.expires_in ?? 0) * 1000,
      scopes: normalizeScope(json.scope),
    });
    return json.access_token;
  }
}
