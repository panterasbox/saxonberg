/**
 * TwitchRelayReader — the presence-gated inbound worker + the backend half
 * of the relay. Backend infrastructure, modeled on `BroadcastFeed`
 * (singleton, lazy boot). It owns the set of active EventSub
 * `channel.chat.message` subscriptions and exposes the backend operations
 * the Api bridge (`StreamLogic`) calls **directly** (no DI port):
 *
 *  - `resolveLogin` — Helix login→broadcaster-id (tune by handle).
 *  - `subscribe` / `unsubscribe` — manage a channel's chat subscription,
 *    debounced per channel; driven by the relay's presence edges.
 *  - `send` — the stateless Helix Send Chat Message (outbound).
 *  - `isConfigured` — whether a reader account is set.
 *
 * Inbound notifications are normalized and handed to
 * `StreamApi.dispatchInbound('twitch', …)` (a down-call into mudlib). On
 * logout it observes `PlayerLoggedOut` (a real lifecycle broadcast) and
 * unsubscribes any Twitch channels that emptied.
 *
 * One operator reader account (env `TWITCH_READER_USER_ID`) holds
 * `user:read:chat` and is the `user_id` condition on every subscription —
 * Twitch lets a single user read any public channel's chat.
 */

import { TwitchClient } from './TwitchClient';
import { StreamApi } from '../mud/api/stream';
import { EventApi } from '../mud/api/event';
import { Events } from '../mud/lib/events';
import { ExecutionContextApi } from '../mud/api/execution-context';
import { TwitchProfile } from '../mud/lib/identity/TwitchProfile';
import type { NormalizedInbound } from '../mud/api/stream';

const DEBOUNCE_MS = 1500;

export class TwitchRelayReader {
  private static instance: TwitchRelayReader;

  private booted = false;
  /** broadcasterId → active subscription id. */
  private subs = new Map<string, string>();
  /** broadcasterId → pending debounce timer. */
  private pending = new Map<string, ReturnType<typeof setTimeout>>();

  private constructor() {}

  public static get(): TwitchRelayReader {
    if (!this.instance) this.instance = new TwitchRelayReader();
    return this.instance;
  }

  /** Wire the client + logout listeners. Idempotent. */
  public boot(): void {
    if (this.booted) return;
    this.booted = true;

    TwitchClient.get().onNotification((n) => {
      if (n.subscriptionType !== 'channel.chat.message') return;
      const norm = normalize(n.event);
      if (!norm) return;
      void ExecutionContextApi.runRoot(null, 'twitch.inbound', () =>
        StreamApi.dispatchInbound('twitch', norm)
      );
    });

    // A fresh EventSub session invalidates prior subscriptions — re-create.
    TwitchClient.get().onSessionReset(() => {
      const ids = [...this.subs.keys()];
      this.subs.clear();
      for (const b of ids) void this.doSubscribe(b);
    });

    // Backend observing the real lifecycle broadcast: when a player logs
    // out, `StreamApi.dropPlayer` drops them from every channel and
    // unsubscribes each emptied channel on its transport (both readers) — so
    // this single observer covers Twitch AND YouTube.
    EventApi.on<{ playerId: string; userId: string }>(
      Events.PlayerLoggedOut,
      async ({ playerId }) => {
        await StreamApi.dropPlayer(playerId);
      }
    );

    console.info('TwitchRelayReader: booted (presence-gated EventSub reader).');
  }

  // ---- backend operations the Api bridge calls directly ------------------

  /** Whether a reader account is configured (`TWITCH_READER_USER_ID`). */
  public isConfigured(): boolean {
    return readerUserId() !== '';
  }

  /** Helix login → broadcaster id (the tune-by-handle lookup). */
  public async resolveLogin(
    login: string
  ): Promise<{ broadcasterId: string; login: string } | null> {
    const token = await this.readerToken();
    if (!token) return null;
    const u = await TwitchClient.get().resolveUser(login, token);
    return u ? { broadcasterId: u.id, login: u.login } : null;
  }

  /** Stateless Helix Send Chat Message as the poster. */
  public async send(opts: {
    broadcasterId: string;
    profile: TwitchProfile;
    text: string;
  }): Promise<{ ok: boolean; error?: string }> {
    try {
      const token = await TwitchClient.get().tokenFor(opts.profile);
      return await TwitchClient.get().sendChatMessage({
        broadcasterId: opts.broadcasterId,
        senderId: opts.profile.twitchUserId,
        token,
        text: opts.text,
      });
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  /** Subscribe to a channel's chat (debounced). Driven by the 0->1 edge. */
  public subscribe(broadcasterId: string): void {
    this.debounce(broadcasterId, 'sub');
  }

  /** Unsubscribe from a channel's chat (debounced). Driven by the 1->0 edge. */
  public unsubscribe(broadcasterId: string): void {
    this.debounce(broadcasterId, 'unsub');
  }

  // ---- subscription lifecycle (private) ----------------------------------

  private debounce(broadcasterId: string, action: 'sub' | 'unsub'): void {
    const existing = this.pending.get(broadcasterId);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      this.pending.delete(broadcasterId);
      if (action === 'sub') void this.doSubscribe(broadcasterId);
      else void this.doUnsubscribe(broadcasterId);
    }, DEBOUNCE_MS);
    this.pending.set(broadcasterId, t);
  }

  private async doSubscribe(broadcasterId: string): Promise<void> {
    if (this.subs.has(broadcasterId)) return;
    const token = await this.readerToken();
    const readerId = readerUserId();
    if (!token || !readerId) {
      console.warn(
        'TwitchRelayReader: no reader token/id (TWITCH_READER_USER_ID) — ' +
          'cannot subscribe to chat.'
      );
      return;
    }
    try {
      const { id } = await TwitchClient.get().createSubscription({
        type: 'channel.chat.message',
        version: '1',
        condition: { broadcaster_user_id: broadcasterId, user_id: readerId },
        token,
      });
      this.subs.set(broadcasterId, id);
    } catch (err) {
      console.error(`TwitchRelayReader: subscribe ${broadcasterId} failed:`, err);
    }
  }

  private async doUnsubscribe(broadcasterId: string): Promise<void> {
    const id = this.subs.get(broadcasterId);
    if (!id) return;
    this.subs.delete(broadcasterId);
    const token = await this.readerToken();
    if (!token) return;
    try {
      await TwitchClient.get().deleteSubscription(id, token);
    } catch (err) {
      console.error(`TwitchRelayReader: unsubscribe ${broadcasterId} failed:`, err);
    }
  }

  private async readerToken(): Promise<string | null> {
    const id = readerUserId();
    if (!id) return null;
    const profile = await TwitchProfile.findByTwitchUserId(id);
    if (!profile) return null;
    return TwitchClient.get().tokenFor(profile);
  }
}

function readerUserId(): string {
  return process.env.TWITCH_READER_USER_ID ?? '';
}

/** Normalize a `channel.chat.message` EventSub event payload. */
function normalize(ev: Record<string, unknown>): NormalizedInbound | null {
  const channelKey = String(ev.broadcaster_user_id ?? '');
  const senderUserId = String(ev.chatter_user_id ?? '');
  const senderLogin = String(ev.chatter_user_login ?? '');
  const senderDisplay = String(
    ev.chatter_user_name ?? ev.chatter_user_login ?? ''
  );
  const message = ev.message as { text?: string } | undefined;
  const text = String(message?.text ?? '');
  if (!channelKey || !text) return null;
  return {
    channelKey,
    senderUserId,
    senderLogin,
    senderDisplay,
    text,
  };
}
