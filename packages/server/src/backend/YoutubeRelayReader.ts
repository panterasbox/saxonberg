/**
 * YoutubeRelayReader — the presence-gated per-liveChatId reader + the
 * backend half of the YouTube relay (read-only). The YouTube sibling of
 * `TwitchRelayReader`, but there is no multiplexed session: each channel is
 * its own `liveChatId` read, opened on the relay's 0→1 presence edge and
 * closed on 1→0 (driven by `StreamLogic`). It exposes the backend
 * operations the Api bridge (`StreamLogic`) calls **directly** (no DI port):
 *
 *  - `isConfigured` — whether the env reader account is set.
 *  - `resolveChannelId` — `@handle` → channelId (the `watch` embed path).
 *  - `resolveChannel` — channel/video → the current live `activeLiveChatId`
 *    (`'not-live'` when nothing is streaming; live-only bind).
 *  - `subscribe` / `unsubscribe` — open / close a `liveChatId` read.
 *
 * Inbound lines are normalized and handed to
 * `StreamApi.dispatchInbound('youtube', …)`. When a stream ends the read
 * closes and the channel **auto-untunes** (`StreamApi.dropChannel` — which
 * drops the relay entry and notices the tuned players). The
 * `PlayerLoggedOut` drop is centralized in `StreamLogic.dropPlayer` (which
 * unsubscribes both readers), so this reader does not observe it.
 */

import { YoutubeClient } from './YoutubeClient';
import type { LiveChatResolution } from './YoutubeClient';
import { StreamApi } from '../mud/api/stream';
import { AppApi } from '../mud/api/app';
import { AppSettingKeys } from '../mud/lib/config/AppSettings';
import { ExecutionContextApi } from '../mud/api/execution-context';

export class YoutubeRelayReader {
  private static instance: YoutubeRelayReader;

  private booted = false;
  private readonly client: YoutubeClient;

  private constructor(client?: YoutubeClient) {
    this.client = client ?? YoutubeClient.get();
  }

  public static get(): YoutubeRelayReader {
    if (!this.instance) this.instance = new YoutubeRelayReader();
    return this.instance;
  }

  /** Test-only factory over an injected client. */
  public static forTest(client: YoutubeClient): YoutubeRelayReader {
    return new YoutubeRelayReader(client);
  }

  /** Wire boot state. Idempotent. No PlayerLoggedOut observer (see header). */
  public boot(): void {
    if (this.booted) return;
    this.booted = true;
    console.info('YoutubeRelayReader: booted (read-only, presence-gated).');
  }

  /** Whether the env reader account is configured. */
  public isConfigured(): boolean {
    return this.client.isConfigured();
  }

  /** `@handle` / `UC…` → channelId (the durable `watch` embed target). */
  public resolveChannelId(ref: string): Promise<string | 'unknown'> {
    return this.client.resolveChannelId(ref);
  }

  /**
   * Resolve a channel/video ref to its current live `activeLiveChatId`
   * (`'not-live'` when nothing is streaming — the live-only bind).
   */
  public resolveChannel(ref: string): Promise<LiveChatResolution> {
    return this.client.resolveLiveChatId(ref);
  }

  /** Open a `liveChatId` read (the 0→1 edge). Idempotent per liveChatId. */
  public async subscribe(liveChatId: string): Promise<void> {
    await this.client.openStream(
      liveChatId,
      {
        onMessage: (m) =>
          void ExecutionContextApi.runRoot(null, 'youtube.inbound', () =>
            StreamApi.dispatchInbound('youtube', {
              channelKey: liveChatId,
              senderUserId: m.authorChannelId,
              senderLogin: m.authorName,
              senderDisplay: m.authorName,
              text: m.text,
            }),
          ),
        onEnd: () => this.onStreamEnd(liveChatId),
      },
      pollIntervalMs(),
    );
  }

  /** Close a `liveChatId` read (the 1→0 edge). */
  public unsubscribe(liveChatId: string): void {
    this.client.closeStream(liveChatId);
  }

  /** Stream ended: close the local read + auto-untune (notice the players). */
  private onStreamEnd(liveChatId: string): void {
    this.client.closeStream(liveChatId);
    void ExecutionContextApi.runRoot(null, 'youtube.streamEnd', () =>
      StreamApi.dropChannel('youtube', liveChatId),
    );
  }
}

function pollIntervalMs(): number {
  try {
    const raw = AppApi.setting(AppSettingKeys.youtubePollIntervalMs);
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 5000;
  } catch {
    return 5000;
  }
}
