/**
 * TwitchRelay - the relay's in-memory state singleton.
 *
 * Channels are **player-initiated and memory-resident**: there is no
 * registry collection. A player tunes in by Twitch login; the login is
 * resolved to a broadcaster id once (via the outbound DI port's Helix
 * lookup), cached, and a lightweight channel entry is created on demand.
 * All of it lives only in memory and evaporates on reboot; the next login
 * + tune re-initializes lazily. Players are dropped from every channel on
 * logout.
 *
 * Holds: the channel table (broadcasterId -> login + tuned playerIds), a
 * login->id resolution cache, the per-channel history ring, the outbound
 * echo-tag store, the per-player + global send throttles, and the
 * installed outbound DI port. Pure state + delivery; the gated
 * orchestration lives in `TwitchLogic`, this singleton's only caller.
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
import { EventApi } from '../api/event';
import { Mml } from '../api/mml';
import { Events } from '../lib/events';
import type { TwitchRelayPort } from '../api/twitch';
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

  private outboundPort: TwitchRelayPort | null = null;

  public override async postRegister(_context?: unknown): Promise<void> {
    // Drop a player from every channel they were tuned to when they go
    // offline (frees the channel on the 1->0 edge so the reader unsubscribes).
    EventApi.on<{ playerId: string; userId: string }>(
      Events.PlayerLoggedOut,
      (p) => this.dropPlayer(p.playerId)
    );
  }

  // ---- outbound port -----------------------------------------------------

  public setOutboundPort(port: TwitchRelayPort | null): void {
    this.outboundPort = port;
  }
  public getOutboundPort(): TwitchRelayPort | null {
    return this.outboundPort;
  }

  // ---- tune / untune (player-initiated, lazy) ----------------------------

  /**
   * Tune a player into a Twitch channel by login. Resolves the login to a
   * broadcaster id (cache -> port's Helix lookup), creates the channel entry
   * lazily, and fires the presence 0->1 edge so the reader subscribes.
   */
  public async tuneByLogin(
    playerId: string,
    login: string
  ): Promise<{
    ok: boolean;
    broadcasterId?: string;
    login?: string;
    reason?: 'no-relay' | 'unknown-login';
  }> {
    const lower = login.trim().toLowerCase();
    let broadcasterId = this.loginToId.get(lower);
    let resolvedLogin = lower;

    if (!broadcasterId) {
      const port = this.outboundPort;
      if (!port) return { ok: false, reason: 'no-relay' };
      const resolved = await port.resolveLogin(lower);
      if (!resolved) return { ok: false, reason: 'unknown-login' };
      broadcasterId = resolved.broadcasterId;
      resolvedLogin = resolved.login.toLowerCase();
      this.loginToId.set(lower, broadcasterId);
      this.loginToId.set(resolvedLogin, broadcasterId);
    }

    let entry = this.channels.get(broadcasterId);
    if (!entry) {
      entry = { broadcasterLogin: resolvedLogin, tuned: new Set() };
      this.channels.set(broadcasterId, entry);
    }
    const prev = entry.tuned.size;
    entry.tuned.add(playerId);
    const count = entry.tuned.size;
    if (prev === 0 && count > 0) this.emitPresence(broadcasterId, count, prev);
    return { ok: true, broadcasterId, login: entry.broadcasterLogin };
  }

  /** Tune a player out by login; fires the presence 1->0 edge. */
  public untune(
    playerId: string,
    login: string
  ): { ok: boolean; login?: string; reason?: 'unknown-login' } {
    const lower = login.trim().toLowerCase();
    const broadcasterId = this.loginToId.get(lower);
    const entry = broadcasterId
      ? this.channels.get(broadcasterId)
      : undefined;
    if (!broadcasterId || !entry) return { ok: false, reason: 'unknown-login' };
    const prev = entry.tuned.size;
    entry.tuned.delete(playerId);
    const count = entry.tuned.size;
    if (prev > 0 && count === 0) this.emitPresence(broadcasterId, count, prev);
    return { ok: true, login: entry.broadcasterLogin };
  }

  /** Remove a player from every channel (logout); fire each 1->0 edge. */
  public dropPlayer(playerId: string): void {
    for (const [broadcasterId, entry] of this.channels) {
      if (!entry.tuned.has(playerId)) continue;
      const prev = entry.tuned.size;
      entry.tuned.delete(playerId);
      const count = entry.tuned.size;
      if (prev > 0 && count === 0) this.emitPresence(broadcasterId, count, prev);
    }
  }

  private emitPresence(broadcasterId: string, count: number, prev: number): void {
    EventApi.emit(Events.TwitchPresenceChanged, { broadcasterId, count, prev });
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
