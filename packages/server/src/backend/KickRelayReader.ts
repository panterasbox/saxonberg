/**
 * KickRelayReader — the presence-gated webhook-subscription worker + the
 * backend half of the Kick relay (read-only). The third transport
 * sibling of `TwitchRelayReader` / `YoutubeRelayReader`, with the shape
 * inverted at the transport: there is NO outbound socket or poll —
 * inbound chat arrives as signed HTTP POSTs at `KickWebhookRoutes`,
 * which verifies and hands the parsed event to `handleInbound` here.
 * This reader owns only the subscription lifecycle (create on the
 * relay's 0→1 tuned-player edge, delete on 1→0, via `KickClient`) and
 * inbound normalization → `StreamApi.dispatchInbound('kick', …)`.
 *
 * Binding is persistent (Twitch-style): no live-only bind, no
 * stream-end auto-untune — Kick chatrooms outlive broadcasts and the
 * embed renders offline channels. The `PlayerLoggedOut` drop is
 * centralized in `StreamLogic.dropPlayer` (the single observer lives in
 * `TwitchRelayReader.boot`), so this reader does not observe it.
 *
 * The `broadcasterId → subscriptionId` map is memory-only; a crashed
 * process can orphan a webhook subscription on Kick's side, which is
 * harmless — deliveries for un-tuned channels drop at the relay's
 * channel-key miss (a boot-time reconciliation sweep is a named
 * deferred seam).
 */

import { KickClient } from './KickClient';
import { StreamApi } from '../mud/api/stream';
import type { NormalizedInbound } from '../mud/api/stream';
import { AppApi } from '../mud/api/app';
import { AppSettingKeys } from '../mud/lib/config/AppSettings';
import {
  ExecutionContextApi,
  OMNI_SCOPE,
} from '../mud/api/execution-context';

export class KickRelayReader {
  private static instance: KickRelayReader;

  private booted = false;
  private readonly client: KickClient;

  /** broadcasterId → subscriptionId (the DELETE key). Memory-only. */
  private readonly subs = new Map<string, string>();

  private constructor(client?: KickClient) {
    this.client = client ?? KickClient.get();
  }

  public static get(): KickRelayReader {
    if (!this.instance) this.instance = new KickRelayReader();
    return this.instance;
  }

  /** Test-only factory over an injected client. */
  public static forTest(client: KickClient): KickRelayReader {
    return new KickRelayReader(client);
  }

  /** Wire boot state. Idempotent. No PlayerLoggedOut observer (header). */
  public boot(): void {
    if (this.booted) return;
    this.booted = true;
    console.info(
      'KickRelayReader: booted (read-only, webhook-subscription ' +
        'presence-gated).'
    );
  }

  /** Whether the transport is configured (credentials + webhook URL). */
  public isConfigured(): boolean {
    return this.client.isConfigured();
  }

  /** Slug → `{ broadcasterId, slug }` (TTL-cached), or `'unknown'`. */
  public resolveSlug(
    slug: string
  ): Promise<{ broadcasterId: string; slug: string } | 'unknown'> {
    return this.client.resolveSlug(slug, resolveCacheTtlMs());
  }

  /**
   * Create the `chat.message.sent` subscription (the 0→1 edge).
   * Idempotent per broadcaster; failures are logged, not thrown (the
   * `TwitchRelayReader.doSubscribe` posture).
   */
  public async subscribe(broadcasterId: string): Promise<void> {
    if (this.subs.has(broadcasterId)) return;
    try {
      const created = await this.client.createChatSubscription(broadcasterId);
      this.subs.set(broadcasterId, created.id);
    } catch (err) {
      console.error(
        `KickRelayReader: subscribe ${broadcasterId} failed:`,
        err
      );
    }
  }

  /** Delete the subscription (the 1→0 edge). No-op when not held. */
  public unsubscribe(broadcasterId: string): void {
    const id = this.subs.get(broadcasterId);
    if (!id) return;
    this.subs.delete(broadcasterId);
    void this.client.deleteSubscriptions([id]).catch((err) => {
      console.error(
        `KickRelayReader: unsubscribe ${broadcasterId} failed:`,
        err
      );
    });
  }

  /**
   * A verified, parsed `chat.message.sent` event from the webhook route.
   * Normalize defensively and hand to the relay; malformed events drop.
   */
  public handleInbound(event: unknown): void {
    const norm = normalizeKickChatEvent(event);
    if (!norm) return;
    void ExecutionContextApi.runRoot(
      null,
      'kick.inbound',
      () => StreamApi.dispatchInbound('kick', norm),
      { circleScope: OMNI_SCOPE }
    );
  }
}

/** Normalize a Kick `chat.message.sent` webhook payload. */
function normalizeKickChatEvent(ev: unknown): NormalizedInbound | null {
  if (typeof ev !== 'object' || ev === null) return null;
  const o = ev as Record<string, unknown>;
  const broadcaster = o.broadcaster as Record<string, unknown> | undefined;
  const sender = o.sender as Record<string, unknown> | undefined;
  const rawChannel = broadcaster?.user_id;
  const channelKey =
    typeof rawChannel === 'string' || typeof rawChannel === 'number'
      ? String(rawChannel)
      : '';
  const rawSender = sender?.user_id;
  const senderUserId =
    typeof rawSender === 'string' || typeof rawSender === 'number'
      ? String(rawSender)
      : '';
  const senderLogin =
    typeof sender?.username === 'string'
      ? sender.username
      : typeof sender?.channel_slug === 'string'
        ? sender.channel_slug
        : '';
  const senderDisplay = senderLogin;
  const text = typeof o.content === 'string' ? o.content : '';
  if (!channelKey || !text) return null;
  return { channelKey, senderUserId, senderLogin, senderDisplay, text };
}

function resolveCacheTtlMs(): number {
  try {
    const raw = AppApi.setting(AppSettingKeys.kickResolveCacheTtlMs);
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 3_600_000;
  } catch {
    return 3_600_000;
  }
}
