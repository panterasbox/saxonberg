/**
 * TwitchRelay - the relay's in-memory state singleton.
 *
 * Channels are **player-initiated and memory-resident**: there is no
 * registry collection. A player tunes in by Twitch login; `TwitchLogic`
 * resolves the login to a broadcaster id (via the backend reader) and
 * calls `addTuned` with the resolved id, which lazily creates a channel
 * entry. All of it lives only in memory and evaporates on reboot; the next
 * login + tune re-initializes lazily.
 *
 * This singleton is **pure mudlib state**: no backend import, no events.
 * Its mutators (`addTuned` / `removeTuned` / `dropPlayer`) return the
 * presence **edges** (0->1 / 1->0); the Api bridge (`TwitchLogic`) reads
 * those edges and drives the backend reader's subscribe/unsubscribe
 * directly. Holds: the channel table (broadcasterId -> login + tuned
 * playerIds), a login->id resolution cache, the per-channel history ring,
 * the outbound echo-tag store, and the per-player + global send throttles.
 *
 * Delivery reuses the lone `MessageApi.sendMessage` chokepoint with a
 * hand-built frame on the relay's own `world.twitch.message` topic and a
 * Stuff-less / external-linked speaker in the payload (never `MessageApi.
 * scene`, which requires a Stuff actor). Frames carry no `modality`, so
 * the relay is **subscription-gated, not implant-gated**.
 */

import { Idea } from '../lib/stuff/Idea';
import { PostRegistrationMixin } from '../lib/stuff/PostRegistration';
import { MessageApi } from '../api/message';
import { SecurityApi } from '../api/security';
import { PlayerApi } from '../api/player';
import { Mml } from '../api/mml';
import type {
  MessageFrame,
  RelaySpeaker,
  TwitchMessagePayload,
} from '@saxonberg/types';

// Dials - candidates for `twitch.*` AppSettings (kept as constants in v1;
// see the app-settings constant-sweep pattern).
const HISTORY_CAP = 200;
const ECHO_TTL_MS = 15_000;
const PLAYER_BURST = 5; // tokens
const PLAYER_REFILL_PER_SEC = 1;
const GLOBAL_BURST = 20;
const GLOBAL_REFILL_PER_SEC = 10;

interface Bucket {
  tokens: number;
  last: number;
}

interface ChannelEntry {
  broadcasterLogin: string;
  tuned: Set<string>; // playerIds
}

const TwitchRelayBase = PostRegistrationMixin(Idea);

export default class TwitchRelay extends TwitchRelayBase {
  /** broadcasterId -> { login, tuned playerIds }. Memory-only. */
  private channels = new Map<string, ChannelEntry>();
  /** lowercased login -> broadcasterId (resolution cache). */
  private loginToId = new Map<string, string>();

  private history = new Map<string, MessageFrame[]>();
  private echoTags = new Map<string, number>();
  private playerBuckets = new Map<string, Bucket>();
  private globalBucket: Bucket = { tokens: GLOBAL_BURST, last: Date.now() };

  // ---- tune / untune (pure mutators; return the presence edges) ----------

  /** Cached broadcaster id for an already-resolved (lowercased) login. */
  public cachedId(loginLower: string): string | undefined {
    return this.loginToId.get(loginLower);
  }

  /**
   * Add a player to a channel by ALREADY-RESOLVED broadcaster id, caching
   * the login and creating the channel entry lazily. Returns true on the
   * 0->1 edge — the Api bridge then tells the reader to subscribe.
   */
  public addTuned(
    playerId: string,
    broadcasterId: string,
    login: string
  ): boolean {
    const lower = login.trim().toLowerCase();
    this.loginToId.set(lower, broadcasterId);
    let entry = this.channels.get(broadcasterId);
    if (!entry) {
      entry = { broadcasterLogin: lower, tuned: new Set() };
      this.channels.set(broadcasterId, entry);
    }
    const prev = entry.tuned.size;
    entry.tuned.add(playerId);
    return prev === 0 && entry.tuned.size > 0;
  }

  /**
   * Remove a player from a channel by login. `emptied` is the 1->0 edge —
   * the Api bridge then tells the reader to unsubscribe.
   */
  public removeTuned(
    playerId: string,
    loginLower: string
  ): { ok: boolean; broadcasterId?: string; emptied: boolean } {
    const broadcasterId = this.loginToId.get(loginLower);
    const entry = broadcasterId ? this.channels.get(broadcasterId) : undefined;
    if (!broadcasterId || !entry) return { ok: false, emptied: false };
    const prev = entry.tuned.size;
    entry.tuned.delete(playerId);
    const emptied = prev > 0 && entry.tuned.size === 0;
    return { ok: true, broadcasterId, emptied };
  }

  /**
   * Remove a player from every channel (logout). Returns the broadcaster
   * ids that hit 0 — the Api bridge unsubscribes each.
   */
  public dropPlayer(playerId: string): string[] {
    const emptied: string[] = [];
    for (const [broadcasterId, entry] of this.channels) {
      if (!entry.tuned.has(playerId)) continue;
      const prev = entry.tuned.size;
      entry.tuned.delete(playerId);
      if (prev > 0 && entry.tuned.size === 0) emptied.push(broadcasterId);
    }
    return emptied;
  }

  // ---- resolution / queries ---------------------------------------------

  public tunedLoginsFor(playerId: string): string[] {
    const out: string[] = [];
    for (const entry of this.channels.values()) {
      if (entry.tuned.has(playerId)) out.push(entry.broadcasterLogin);
    }
    return out;
  }

  /** Tuned-in playerIds for a channel. */
  public whoTuned(broadcasterId: string): string[] {
    return [...(this.channels.get(broadcasterId)?.tuned ?? [])];
  }

  /** Cache-only login -> channel resolve (no port call). */
  public resolveByLogin(
    loginLower: string
  ): { broadcasterId: string; login: string } | null {
    const broadcasterId = this.loginToId.get(loginLower);
    if (!broadcasterId) return null;
    const entry = this.channels.get(broadcasterId);
    if (!entry) return null;
    return { broadcasterId, login: entry.broadcasterLogin };
  }

  public channelById(
    broadcasterId: string
  ): { broadcasterLogin: string } | null {
    const entry = this.channels.get(broadcasterId);
    return entry ? { broadcasterLogin: entry.broadcasterLogin } : null;
  }

  // ---- echo tag-and-suppress --------------------------------------------

  public noteEcho(twitchUserId: string, text: string): void {
    this.echoTags.set(this.echoKey(twitchUserId, text), Date.now() + ECHO_TTL_MS);
  }

  /** Consume a pending echo tag; true if this (user, text) was our own send. */
  public isEcho(twitchUserId: string, text: string): boolean {
    const key = this.echoKey(twitchUserId, text);
    const exp = this.echoTags.get(key);
    if (exp === undefined) return false;
    this.echoTags.delete(key);
    return exp >= Date.now();
  }

  private echoKey(twitchUserId: string, text: string): string {
    return `${twitchUserId} ${text}`;
  }

  // ---- throttle (per-player + global token buckets) ----------------------

  /** Acquire a send slot; false = throttled (shaped, not thrown). */
  public tryAcquireSend(playerId: string): boolean {
    if (!this.consume(this.globalBucket, GLOBAL_BURST, GLOBAL_REFILL_PER_SEC)) {
      return false;
    }
    let bucket = this.playerBuckets.get(playerId);
    if (!bucket) {
      bucket = { tokens: PLAYER_BURST, last: Date.now() };
      this.playerBuckets.set(playerId, bucket);
    }
    return this.consume(bucket, PLAYER_BURST, PLAYER_REFILL_PER_SEC);
  }

  private consume(bucket: Bucket, burst: number, refillPerSec: number): boolean {
    const now = Date.now();
    const elapsed = (now - bucket.last) / 1000;
    bucket.tokens = Math.min(burst, bucket.tokens + elapsed * refillPerSec);
    bucket.last = now;
    if (bucket.tokens < 1) return false;
    bucket.tokens -= 1;
    return true;
  }

  // ---- delivery (inbound + outbound mirror share this) -------------------

  /**
   * Deliver one relay message to every tuned-in (and online) player on
   * `world.twitch.message` and append it to the channel's history ring.
   * `egress` marks the mirror of a local player's outbound post.
   */
  public deliver(
    broadcasterId: string,
    broadcasterLogin: string,
    speaker: RelaySpeaker,
    text: string,
    egress: boolean
  ): void {
    const name =
      speaker.kind === 'in-game'
        ? speaker.ref.displayName ?? 'someone'
        : speaker.externalName;
    const marker = egress ? 'twitch->' : 'twitch';
    const body = Mml.compose`[${marker} #${broadcasterLogin}] ${name}: ${text}`.toString();
    const payload: TwitchMessagePayload = {
      broadcasterId,
      broadcasterLogin,
      speaker,
      text,
      egress,
    };
    const meta = { timestamp: Date.now(), channelId: broadcasterId };

    for (const playerId of this.whoTuned(broadcasterId)) {
      const avatar = PlayerApi.findAvatarByPlayerId(playerId);
      if (!avatar) continue; // offline - skip
      MessageApi.sendMessage(avatar, {
        id: SecurityApi.uuid(),
        topic: 'world.twitch.message',
        tags: ['audience:witness'],
        body,
        meta: { ...meta },
        payload,
      });
    }
    this.appendToHistory(broadcasterId, {
      id: SecurityApi.uuid(),
      topic: 'world.twitch.message',
      tags: ['audience:witness'],
      body,
      meta: { ...meta },
      payload,
    });
  }

  // ---- history ring ------------------------------------------------------

  public appendToHistory(broadcasterId: string, frame: MessageFrame): void {
    let ring = this.history.get(broadcasterId);
    if (!ring) {
      ring = [];
      this.history.set(broadcasterId, ring);
    }
    ring.push(frame);
    if (ring.length > HISTORY_CAP) ring.shift();
  }

  public historyFor(broadcasterId: string): readonly MessageFrame[] {
    return this.history.get(broadcasterId) ?? [];
  }
}
