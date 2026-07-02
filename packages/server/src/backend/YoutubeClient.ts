/**
 * YoutubeClient — the backend YouTube live-chat integration substrate
 * (read-only this cycle). The YouTube sibling of {@link TwitchClient}, but
 * the transport genuinely differs: there is no one multiplexed session —
 * each `liveChatId` is its own long-lived read (the `list`-poll path, wired
 * day one behind the transport seam; `streamList` is a later optimization).
 *
 * Responsibilities:
 *   - **Reader auth** — a single operator reader account supplies the read
 *     credential via env (`YOUTUBE_READER_CLIENT_ID` / `_SECRET` /
 *     `_REFRESH_TOKEN`), refreshed against Google's token endpoint. NO
 *     `GoogleProfile`, no per-player tokens — posting is deferred.
 *   - **Resolution** — `@handle` → channelId (`channels.list?forHandle`, 1
 *     quota unit, memoized — the single home for handle→channelId consumed
 *     by both `tune` and `watch`); channel/video → the current live
 *     broadcast's `activeLiveChatId`.
 *   - **Streaming** — open / close a per-`liveChatId` read; each delivered
 *     line and the stream-end signal ride the injected transport so tests
 *     drive synthetic chat with no live YouTube dependency.
 *
 * Layer: backend/ infrastructure, peer to `TwitchClient`. It reaches mud/
 * only for the pure `StreamerTarget` classifier (a value-object, no backend
 * dep). Tokens are never logged.
 */

import { StreamerTarget } from '../mud/lib/streaming/StreamerTarget';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

/** One normalized inbound live-chat line (pre-relay). */
export interface YoutubeInboundMessage {
  authorChannelId: string;
  authorName: string;
  text: string;
}

/** A handle on an open per-liveChatId read; `close()` aborts it. */
export interface LiveChatStreamHandle {
  close(): void;
}

/**
 * Injected transport: raw `fetch` + the higher-level per-liveChatId read
 * loop (the `openWebSocket` analogue). The real impl polls
 * `liveChatMessages.list`; the test impl drives `onMessage` / `onEnd`
 * synchronously.
 */
export interface YoutubeTransport {
  fetch: typeof fetch;
  openLiveChatStream(opts: {
    liveChatId: string;
    token: string;
    pollIntervalMs: number;
    onMessage: (m: YoutubeInboundMessage) => void;
    onEnd: () => void;
  }): LiveChatStreamHandle;
}

/** Result of resolving a channel/video ref to its live chat. */
export type LiveChatResolution =
  | { liveChatId: string }
  | 'not-live'
  | 'unknown';

function realTransport(): YoutubeTransport {
  const openLiveChatStream = (opts: {
    liveChatId: string;
    token: string;
    pollIntervalMs: number;
    onMessage: (m: YoutubeInboundMessage) => void;
    onEnd: () => void;
  }): LiveChatStreamHandle => {
    let aborted = false;
    let pageToken: string | undefined;
    const run = async (): Promise<void> => {
      while (!aborted) {
        const url = new URL(`${YOUTUBE_API_BASE}/liveChatMessages`);
        url.searchParams.set('part', 'snippet,authorDetails');
        url.searchParams.set('liveChatId', opts.liveChatId);
        if (pageToken) url.searchParams.set('pageToken', pageToken);
        let waitMs = opts.pollIntervalMs;
        try {
          const res = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${opts.token}` },
          });
          if (!res.ok) {
            // 403/404 = the chat ended (or the token lapsed) — signal end.
            opts.onEnd();
            return;
          }
          const json = (await res.json()) as YoutubeListResponse;
          for (const item of json.items ?? []) {
            const msg = normalizeItem(item);
            if (msg) opts.onMessage(msg);
          }
          pageToken = json.nextPageToken;
          waitMs = Math.max(
            opts.pollIntervalMs,
            json.pollingIntervalMillis ?? 0,
          );
          if (json.offlineAt) {
            opts.onEnd();
            return;
          }
        } catch {
          // Transient error — back off one interval and retry.
        }
        if (aborted) return;
        await delay(waitMs);
      }
    };
    void run();
    return {
      close() {
        aborted = true;
      },
    };
  };
  return { fetch, openLiveChatStream };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class YoutubeClient {
  private static instance: YoutubeClient;

  private readonly transport: YoutubeTransport;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly refreshToken: string;

  private token: { value: string; expiresAt: number } | null = null;
  /** handle → channelId (stable; memoized so repeat resolves cost nothing). */
  private readonly handleCache = new Map<string, string>();
  private readonly streams = new Map<string, LiveChatStreamHandle>();

  private constructor(opts?: { transport?: YoutubeTransport }) {
    this.transport = opts?.transport ?? realTransport();
    this.clientId = process.env.YOUTUBE_READER_CLIENT_ID ?? '';
    this.clientSecret = process.env.YOUTUBE_READER_CLIENT_SECRET ?? '';
    this.refreshToken = process.env.YOUTUBE_READER_REFRESH_TOKEN ?? '';
  }

  public static get(): YoutubeClient {
    if (!this.instance) this.instance = new YoutubeClient();
    return this.instance;
  }

  /** Test-only factory over an injected transport. */
  public static forTest(transport: YoutubeTransport): YoutubeClient {
    return new YoutubeClient({ transport });
  }

  /** Whether a reader account is configured (env credential present). */
  public isConfigured(): boolean {
    return (
      this.clientId !== '' &&
      this.clientSecret !== '' &&
      this.refreshToken !== ''
    );
  }

  /**
   * A live reader access token — refreshed against Google's token endpoint
   * with the env reader credential (cached until near expiry). No
   * `GoogleProfile`; the `channels.list` resolve reuses this too, so no
   * separate `YOUTUBE_API_KEY`.
   */
  public async readerToken(): Promise<string | null> {
    if (!this.isConfigured()) return null;
    if (this.token && this.token.expiresAt > Date.now() + 60_000) {
      return this.token.value;
    }
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });
    const res = await this.transport.fetch(GOOGLE_TOKEN_URL, {
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
   * Resolve an `@handle` / bare handle to a `UC…` channelId
   * (`channels.list?forHandle`, 1 quota unit, memoized). A `UC…` ref passes
   * through unchanged. `'unknown'` on any failure. The single home for
   * handle→channelId — consumed by both `tune` and `watch`.
   */
  public async resolveChannelId(ref: string): Promise<string | 'unknown'> {
    const id = ref.trim();
    if (StreamerTarget.classifyYoutubeRef(id) === 'channelId') return id;
    const handle = id.startsWith('@') ? id : `@${id}`;
    const cached = this.handleCache.get(handle.toLowerCase());
    if (cached) return cached;
    const token = await this.readerToken();
    if (!token) return 'unknown';
    const url = new URL(`${YOUTUBE_API_BASE}/channels`);
    url.searchParams.set('part', 'id');
    url.searchParams.set('forHandle', handle);
    const res = await this.transport.fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return 'unknown';
    const json = (await res.json()) as { items?: Array<{ id?: string }> };
    const channelId = json.items?.[0]?.id;
    if (!channelId) return 'unknown';
    this.handleCache.set(handle.toLowerCase(), channelId);
    return channelId;
  }

  /**
   * Resolve a channel/video ref to its currently-live `activeLiveChatId`.
   * A videoId resolves directly; a channelId / `@handle` finds the channel's
   * current live broadcast first. `'not-live'` when nothing is streaming.
   */
  public async resolveLiveChatId(ref: string): Promise<LiveChatResolution> {
    const kind = StreamerTarget.classifyYoutubeRef(ref);
    const token = await this.readerToken();
    if (!token) return 'unknown';
    let videoId: string | null;
    if (kind === 'videoId') {
      videoId = ref.trim();
    } else {
      const channelId =
        kind === 'channelId' ? ref.trim() : await this.resolveChannelId(ref);
      if (channelId === 'unknown') return 'unknown';
      videoId = await this.liveVideoOf(channelId, token);
      if (!videoId) return 'not-live';
    }
    return this.liveChatIdOfVideo(videoId, token);
  }

  /** Open a per-liveChatId read; delivered lines + end ride the transport. */
  public async openStream(
    liveChatId: string,
    handlers: {
      onMessage: (m: YoutubeInboundMessage) => void;
      onEnd: () => void;
    },
    pollIntervalMs: number,
  ): Promise<boolean> {
    if (this.streams.has(liveChatId)) return true;
    const token = await this.readerToken();
    if (!token) return false;
    const handle = this.transport.openLiveChatStream({
      liveChatId,
      token,
      pollIntervalMs,
      onMessage: handlers.onMessage,
      onEnd: handlers.onEnd,
    });
    this.streams.set(liveChatId, handle);
    return true;
  }

  /** Close a per-liveChatId read (idempotent). */
  public closeStream(liveChatId: string): void {
    const handle = this.streams.get(liveChatId);
    if (!handle) return;
    handle.close();
    this.streams.delete(liveChatId);
  }

  // ---- resolution helpers (private) --------------------------------------

  /** The current live videoId of a channel (`search.list?eventType=live`). */
  private async liveVideoOf(
    channelId: string,
    token: string,
  ): Promise<string | null> {
    const url = new URL(`${YOUTUBE_API_BASE}/search`);
    url.searchParams.set('part', 'id');
    url.searchParams.set('channelId', channelId);
    url.searchParams.set('eventType', 'live');
    url.searchParams.set('type', 'video');
    const res = await this.transport.fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      items?: Array<{ id?: { videoId?: string } }>;
    };
    return json.items?.[0]?.id?.videoId ?? null;
  }

  /** A video's `activeLiveChatId` (`videos.list?part=liveStreamingDetails`). */
  private async liveChatIdOfVideo(
    videoId: string,
    token: string,
  ): Promise<LiveChatResolution> {
    const url = new URL(`${YOUTUBE_API_BASE}/videos`);
    url.searchParams.set('part', 'liveStreamingDetails');
    url.searchParams.set('id', videoId);
    const res = await this.transport.fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return 'unknown';
    const json = (await res.json()) as {
      items?: Array<{
        liveStreamingDetails?: { activeLiveChatId?: string };
      }>;
    };
    const liveChatId =
      json.items?.[0]?.liveStreamingDetails?.activeLiveChatId ?? null;
    return liveChatId ? { liveChatId } : 'not-live';
  }
}

interface YoutubeListResponse {
  items?: YoutubeListItem[];
  nextPageToken?: string;
  pollingIntervalMillis?: number;
  offlineAt?: string;
}

interface YoutubeListItem {
  snippet?: { displayMessage?: string };
  authorDetails?: { channelId?: string; displayName?: string };
}

function normalizeItem(item: YoutubeListItem): YoutubeInboundMessage | null {
  const text = item.snippet?.displayMessage ?? '';
  const authorChannelId = item.authorDetails?.channelId ?? '';
  const authorName = item.authorDetails?.displayName ?? 'someone';
  if (!text) return null;
  return { authorChannelId, authorName, text };
}
