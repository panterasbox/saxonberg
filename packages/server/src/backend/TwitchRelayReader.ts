/**
 * TwitchRelayReader — the presence-gated inbound worker + the outbound DI
 * port wiring. Backend infrastructure, modeled on `BroadcastFeed`
 * (singleton, lazy boot). It is the only place the relay surface (mud/)
 * and the integration client (backend/) meet:
 *
 *  - **Inbound:** holds one EventSub `channel.chat.message` subscription
 *    per relayed channel that has ≥1 tuned-in player. Subscriptions are
 *    created on the `TwitchPresenceChanged` 0→1 edge and deleted on 1→0,
 *    debounced per channel. Notifications are normalized and handed to
 *    `TwitchApi.dispatchInbound` (a down-call into mudlib).
 *  - **Outbound:** installs a `TwitchRelayPort` over `TwitchClient` so the
 *    mudlib post path can send as the poster without importing backend/.
 *
 * One operator reader account (env `TWITCH_READER_USER_ID`) holds
 * `user:read:chat` and is the `user_id` condition on every subscription —
 * Twitch lets a single user read any public channel's chat.
 */

import { TwitchClient } from './TwitchClient';
import { TwitchApi } from '../mud/api/twitch';
import { EventApi } from '../mud/api/event';
import { Events } from '../mud/lib/events';
import { ExecutionContextApi } from '../mud/api/execution-context';
import { TwitchProfile } from '../mud/lib/identity/TwitchProfile';
import type { NormalizedInbound, TwitchRelayPort } from '../mud/api/twitch';

const DEBOUNCE_MS = 1500;

export class TwitchRelayReader {
  private static instance: TwitchRelayReader;

  private booted = false;
  /** broadcasterId → active subscription id. */
  private subs = new Map<string, string>();
  /** broadcasterId → pending debounce timer. */
  private pending = new Map<string, ReturnType<typeof setTimeout>>();

  private readonly port: TwitchRelayPort = {
    send: async ({ broadcasterId, profile, text }) => {
      try {
        const token = await TwitchClient.get().tokenFor(profile);
        return await TwitchClient.get().sendChatMessage({
          broadcasterId,
          senderId: profile.twitchUserId,
          token,
          text,
        });
      } catch (err) {
        return { ok: false, error: String(err) };
      }
    },
  };

  private constructor() {}

  public static get(): TwitchRelayReader {
    if (!this.instance) this.instance = new TwitchRelayReader();
    return this.instance;
  }

  /** Install the port + wire the client/presence listeners. Idempotent. */
  public boot(): void {
    if (this.booted) return;
    this.booted = true;

    void TwitchApi.installRelayPort(this.port);

    TwitchClient.get().onNotification((n) => {
      if (n.subscriptionType !== 'channel.chat.message') return;
      const norm = normalize(n.event);
      if (!norm) return;
      void ExecutionContextApi.runRoot(null, 'twitch.inbound', () =>
        TwitchApi.dispatchInbound(norm)
      );
    });

    // A fresh EventSub session invalidates prior subscriptions — re-create.
    TwitchClient.get().onSessionReset(() => {
      const ids = [...this.subs.keys()];
      this.subs.clear();
      for (const b of ids) void this.subscribe(b);
    });

    EventApi.on<{ broadcasterId: string; count: number; prev: number }>(
      Events.TwitchPresenceChanged,
      ({ broadcasterId, count, prev }) => {
        if (prev === 0 && count > 0) this.debounce(broadcasterId, 'sub');
        else if (prev > 0 && count === 0) this.debounce(broadcasterId, 'unsub');
      }
    );

    console.info('TwitchRelayReader: booted (presence-gated EventSub reader).');
  }

  private debounce(broadcasterId: string, action: 'sub' | 'unsub'): void {
    const existing = this.pending.get(broadcasterId);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      this.pending.delete(broadcasterId);
      if (action === 'sub') void this.subscribe(broadcasterId);
      else void this.unsubscribe(broadcasterId);
    }, DEBOUNCE_MS);
    this.pending.set(broadcasterId, t);
  }

  private async subscribe(broadcasterId: string): Promise<void> {
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

  private async unsubscribe(broadcasterId: string): Promise<void> {
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
  const broadcasterId = String(ev.broadcaster_user_id ?? '');
  const senderTwitchUserId = String(ev.chatter_user_id ?? '');
  const senderLogin = String(ev.chatter_user_login ?? '');
  const senderDisplay = String(
    ev.chatter_user_name ?? ev.chatter_user_login ?? ''
  );
  const message = ev.message as { text?: string } | undefined;
  const text = String(message?.text ?? '');
  if (!broadcasterId || !text) return null;
  return {
    broadcasterId,
    senderTwitchUserId,
    senderLogin,
    senderDisplay,
    text,
  };
}
