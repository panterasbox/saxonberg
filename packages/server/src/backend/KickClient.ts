/**
 * KickClient — the backend HTTP half of the Kick transport (read-only
 * relay v1). Owns the app access token (client-credentials grant), the
 * slug → broadcaster-id resolve, `chat.message.sent` webhook-subscription
 * create/delete, and the webhook public-key fetch. There is no socket:
 * inbound chat arrives at `KickWebhookRoutes` (Kick pushes signed HTTP
 * POSTs), so this client is outbound-only.
 *
 * Backend infra (the `YoutubeClient` shape): private-ctor singleton with
 * a `forTest(transport)` injection seam; env credential read in the
 * ctor; token cached until near-expiry; TTL-memoized resolve cache.
 * Tokens and the client secret are never logged.
 */

const KICK_TOKEN_URL = 'https://id.kick.com/oauth/token';
const KICK_API_BASE = 'https://api.kick.com/public/v1';

/** The injectable HTTP transport (tests capture requests through it). */
export interface KickTransport {
  fetch: typeof fetch;
}

function realTransport(): KickTransport {
  return { fetch: (...args) => fetch(...args) };
}

export class KickClient {
  private static instance: KickClient;

  private readonly transport: KickTransport;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly webhookUrl: string;

  private token: { value: string; expiresAt: number } | null = null;
  /** slug → { broadcasterId, canonical slug } with a TTL (see resolveSlug). */
  private readonly slugCache = new Map<
    string,
    { broadcasterId: string; slug: string; expiresAt: number }
  >();

  private constructor(opts?: { transport?: KickTransport }) {
    this.transport = opts?.transport ?? realTransport();
    this.clientId = process.env.KICK_CLIENT_ID ?? '';
    this.clientSecret = process.env.KICK_CLIENT_SECRET ?? '';
    this.webhookUrl = process.env.KICK_WEBHOOK_URL ?? '';
  }

  public static get(): KickClient {
    if (!this.instance) this.instance = new KickClient();
    return this.instance;
  }

  /** Test-only factory over an injected transport. */
  public static forTest(transport: KickTransport): KickClient {
    return new KickClient({ transport });
  }

  /**
   * Whether the transport is configured: app credentials AND the public
   * webhook URL (the delivery target registered in the Kick dev app).
   * Absent any of the three, the whole Kick relay is dormant.
   */
  public isConfigured(): boolean {
    return (
      this.clientId !== '' &&
      this.clientSecret !== '' &&
      this.webhookUrl !== ''
    );
  }

  /**
   * A live app access token — the client-credentials grant (cached until
   * near expiry). Kick allows app-token event subscriptions with an
   * explicit `broadcaster_user_id`, so the read path needs no user token
   * at all. `null` on failure; never throws, never logs the secret.
   */
  public async appToken(): Promise<string | null> {
    if (!this.isConfigured()) return null;
    if (this.token && this.token.expiresAt > Date.now() + 60_000) {
      return this.token.value;
    }
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });
    const res = await this.transport.fetch(KICK_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!json.access_token) return null;
    this.token = {
      value: json.access_token,
      expiresAt: Date.now() + (json.expires_in ?? 0) * 1000,
    };
    return this.token.value;
  }

  /**
   * Resolve a channel slug to its broadcaster id (`GET /channels?slug=`),
   * TTL-cached. Returns the canonical `{ broadcasterId, slug }` or
   * `'unknown'` on any failure (bad slug, unconfigured, network error).
   */
  public async resolveSlug(
    slug: string,
    cacheTtlMs: number
  ): Promise<{ broadcasterId: string; slug: string } | 'unknown'> {
    const lower = slug.trim().toLowerCase();
    if (!lower) return 'unknown';
    const cached = this.slugCache.get(lower);
    if (cached && cached.expiresAt > Date.now()) {
      return { broadcasterId: cached.broadcasterId, slug: cached.slug };
    }
    const token = await this.appToken();
    if (!token) return 'unknown';
    const url = new URL(`${KICK_API_BASE}/channels`);
    url.searchParams.set('slug', lower);
    let res: Response;
    try {
      res = await this.transport.fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      return 'unknown';
    }
    if (!res.ok) return 'unknown';
    const json = (await res.json()) as {
      data?: Array<Record<string, unknown>>;
    };
    const ch = json.data?.[0];
    const rawId = ch?.broadcaster_user_id;
    if (
      !ch ||
      (typeof rawId !== 'string' && typeof rawId !== 'number')
    ) {
      return 'unknown';
    }
    const broadcasterId = String(rawId);
    const canonical =
      typeof ch.slug === 'string' && ch.slug !== ''
        ? ch.slug.toLowerCase()
        : lower;
    this.slugCache.set(lower, {
      broadcasterId,
      slug: canonical,
      expiresAt: Date.now() + cacheTtlMs,
    });
    return { broadcasterId, slug: canonical };
  }

  /**
   * Create a `chat.message.sent` webhook subscription for one broadcaster
   * (app token, explicit `broadcaster_user_id`). Returns the subscription
   * id (the DELETE key). Throws on failure — the reader catches + logs
   * (the `TwitchRelayReader.doSubscribe` precedent).
   */
  public async createChatSubscription(
    broadcasterId: string
  ): Promise<{ id: string }> {
    const token = await this.appToken();
    if (!token) throw new Error('KickClient: no app token');
    const res = await this.transport.fetch(
      `${KICK_API_BASE}/events/subscriptions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          broadcaster_user_id: Number(broadcasterId),
          events: [{ name: 'chat.message.sent', version: 1 }],
          method: 'webhook',
        }),
      }
    );
    if (!res.ok) {
      throw new Error(`KickClient: subscription create failed (${res.status})`);
    }
    const json = (await res.json()) as {
      data?: Array<Record<string, unknown>>;
    };
    const row = json.data?.[0];
    const id = row?.subscription_id ?? row?.id;
    if (typeof id !== 'string' && typeof id !== 'number') {
      throw new Error('KickClient: subscription create returned no id');
    }
    return { id: String(id) };
  }

  /**
   * Delete webhook subscriptions by id (`DELETE /events/subscriptions
   * ?id=…&id=…`). 404s are ignored (already gone is the desired state).
   */
  public async deleteSubscriptions(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const token = await this.appToken();
    if (!token) return;
    const url = new URL(`${KICK_API_BASE}/events/subscriptions`);
    for (const id of ids) url.searchParams.append('id', id);
    try {
      await this.transport.fetch(url.toString(), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Best-effort: a failed delete leaves an orphan subscription whose
      // deliveries drop at the relay's channel-miss (harmless).
    }
  }

  /**
   * Fetch Kick's webhook-signing public key (PEM) — no auth required.
   * `null` on failure. The verifier caches it and re-fetches once on a
   * verification failure (the key-rotation hedge).
   */
  public async fetchPublicKey(): Promise<string | null> {
    let res: Response;
    try {
      res = await this.transport.fetch(`${KICK_API_BASE}/public-key`);
    } catch {
      return null;
    }
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { public_key?: string };
    };
    const pem = json.data?.public_key;
    return typeof pem === 'string' && pem !== '' ? pem : null;
  }
}
