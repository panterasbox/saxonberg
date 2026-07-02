/**
 * StreamRelay - the relay's in-memory state singleton (both transports).
 *
 * Channels are **player-initiated and memory-resident**: there is no
 * registry collection. A player tunes in by target; `StreamLogic` resolves
 * the target to a transport channel key (Twitch broadcasterId via the
 * backend reader, YouTube liveChatId via the live-broadcast resolve) and
 * calls `addTuned` with the resolved `(service, key, handle)`, which lazily
 * creates a channel entry. All of it lives only in memory and evaporates on
 * reboot; the next login + tune re-initializes lazily.
 *
 * The channel table is keyed by a composite `channelKey(service, key)` so
 * Twitch and YouTube channels coexist in one table read by the
 * platform-agnostic `list`/`who`/`history` surface. Each `ChannelEntry`
 * carries its `service` + display `handle`.
 *
 * This singleton is **pure mudlib state**: no backend import. Its mutators
 * (`addTuned` / `removeTuned` / `dropPlayer`) return the presence **edges**
 * (0->1 / 1->0); the Api bridge (`StreamLogic`) reads those edges and drives
 * the per-platform backend reader's subscribe/unsubscribe. The one seam to
 * the backend is `deliver`, which emits `Events.RelayMessage` per delivered
 * line (via `EventApi.emit`) so the `BroadcastFeed` can forward the overlay
 * owner's own chat — the relay never imports `backend/`.
 *
 * Delivery reuses the lone `MessageApi.sendMessage` chokepoint with a
 * hand-built frame on the relay's own `world.<service>.message` topic and a
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
import { Events } from '../lib/events';
import { Mml } from '../api/mml';
import type {
  MessageFrame,
  RelaySpeaker,
  RelayMessagePayload,
} from '@saxonberg/types';

type Service = 'twitch' | 'youtube';

// Dials - the twitch relay's grandfathered constants (candidates for
// `stream.*` AppSettings; the YouTube reader reads `youtube.*` instead).
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
  service: Service;
  key: string; // broadcasterId | liveChatId
  handle: string; // display handle (login / channel handle), lowercased
  tuned: Set<string>; // playerIds (may include the overlay sentinel)
}

/** A resolved channel handle (composite-keyed, service-tagged). */
export interface RelayChannelRef {
  service: Service;
  key: string;
  handle: string;
}

const StreamRelayBase = PostRegistrationMixin(Idea);

export default class StreamRelay extends StreamRelayBase {
  /**
   * The overlay-owner sentinel "player" — `addTuned`ed to the `OVERLAY_*`
   * channels so the reader opens (reusing the presence edge) without any
   * real player tuned. Guarded out of `whoTuned` / `tunedChannelsFor` (it
   * isn't an Avatar); it still counts toward the presence edge + keeps the
   * channel entry alive so `deliver` fans + emits.
   */
  static readonly OVERLAY_SENTINEL = 'overlay:broadcast';

  /** composite `channelKey(service,key)` -> ChannelEntry. Memory-only. */
  private channels = new Map<string, ChannelEntry>();
  /** `${service}:${handleLower}` -> composite channelKey (resolution cache). */
  private handleToKey = new Map<string, string>();

  private history = new Map<string, MessageFrame[]>();
  private echoTags = new Map<string, number>();
  private playerBuckets = new Map<string, Bucket>();
  private globalBucket: Bucket = { tokens: GLOBAL_BURST, last: Date.now() };

  /** Composite table key for a `(service, key)` channel. */
  static channelKey(service: Service, key: string): string {
    return `${service}:${key}`;
  }

  private handleKey(service: Service, handleLower: string): string {
    return `${service}:${handleLower}`;
  }

  // ---- tune / untune (pure mutators; return the presence edges) ----------

  /** Cached channel key for an already-resolved (lowercased) handle. */
  public cachedKey(service: Service, handleLower: string): string | undefined {
    return this.handleToKey.get(this.handleKey(service, handleLower));
  }

  /**
   * Add a player to a channel by ALREADY-RESOLVED transport key, caching the
   * handle and creating the channel entry lazily. Returns true on the 0->1
   * edge — the Api bridge then tells the reader to subscribe.
   */
  public addTuned(
    playerId: string,
    service: Service,
    key: string,
    handle: string,
  ): boolean {
    const lower = handle.trim().toLowerCase();
    const composite = StreamRelay.channelKey(service, key);
    this.handleToKey.set(this.handleKey(service, lower), composite);
    let entry = this.channels.get(composite);
    if (!entry) {
      entry = { service, key, handle: lower, tuned: new Set() };
      this.channels.set(composite, entry);
    }
    const prev = entry.tuned.size;
    entry.tuned.add(playerId);
    return prev === 0 && entry.tuned.size > 0;
  }

  /**
   * Remove a player from a channel by handle. `emptied` is the 1->0 edge —
   * the Api bridge then tells the reader to unsubscribe.
   */
  public removeTuned(
    playerId: string,
    service: Service,
    handleLower: string,
  ): { ok: boolean; service?: Service; key?: string; emptied: boolean } {
    const composite = this.handleToKey.get(this.handleKey(service, handleLower));
    const entry = composite ? this.channels.get(composite) : undefined;
    if (!composite || !entry) return { ok: false, emptied: false };
    const prev = entry.tuned.size;
    entry.tuned.delete(playerId);
    const emptied = prev > 0 && entry.tuned.size === 0;
    return { ok: true, service: entry.service, key: entry.key, emptied };
  }

  /**
   * Remove a player from a channel addressed by its exact transport key
   * (not its handle) — used when the overlay poll re-tunes the sentinel to a
   * restarted YouTube stream (the handle→key cache has already moved on).
   */
  public removeTunedByKey(
    playerId: string,
    service: Service,
    key: string,
  ): { ok: boolean; emptied: boolean } {
    const entry = this.channels.get(StreamRelay.channelKey(service, key));
    if (!entry) return { ok: false, emptied: false };
    const prev = entry.tuned.size;
    entry.tuned.delete(playerId);
    return { ok: true, emptied: prev > 0 && entry.tuned.size === 0 };
  }

  /**
   * Remove a player from every channel (logout). Returns the channels that
   * hit 0 — the Api bridge unsubscribes each on its transport.
   */
  public dropPlayer(playerId: string): RelayChannelRef[] {
    const emptied: RelayChannelRef[] = [];
    for (const entry of this.channels.values()) {
      if (!entry.tuned.has(playerId)) continue;
      const prev = entry.tuned.size;
      entry.tuned.delete(playerId);
      if (prev > 0 && entry.tuned.size === 0) {
        emptied.push({
          service: entry.service,
          key: entry.key,
          handle: entry.handle,
        });
      }
    }
    return emptied;
  }

  // ---- resolution / queries ---------------------------------------------

  /** The channels a player is tuned in to (overlay sentinel excluded). */
  public tunedChannelsFor(playerId: string): RelayChannelRef[] {
    if (playerId === StreamRelay.OVERLAY_SENTINEL) return [];
    const out: RelayChannelRef[] = [];
    for (const entry of this.channels.values()) {
      if (entry.tuned.has(playerId)) {
        out.push({
          service: entry.service,
          key: entry.key,
          handle: entry.handle,
        });
      }
    }
    return out;
  }

  /** Tuned-in playerIds for a channel — the overlay sentinel excluded. */
  public whoTuned(service: Service, key: string): string[] {
    const entry = this.channels.get(StreamRelay.channelKey(service, key));
    if (!entry) return [];
    return [...entry.tuned].filter((p) => p !== StreamRelay.OVERLAY_SENTINEL);
  }

  /**
   * Drop an entire channel (a YouTube stream ended). Returns the tuned-in
   * playerIds (overlay sentinel excluded) so the reader can notify them,
   * and removes the channel entry + its handle cache + history ring.
   */
  public dropChannel(service: Service, key: string): string[] {
    const composite = StreamRelay.channelKey(service, key);
    const entry = this.channels.get(composite);
    if (!entry) return [];
    const players = [...entry.tuned].filter(
      (p) => p !== StreamRelay.OVERLAY_SENTINEL,
    );
    this.channels.delete(composite);
    this.handleToKey.delete(this.handleKey(service, entry.handle));
    this.history.delete(composite);
    return players;
  }

  /** Cache-only handle -> channel resolve (no port call). */
  public resolveByHandle(
    service: Service,
    handleLower: string,
  ): RelayChannelRef | null {
    const composite = this.handleToKey.get(this.handleKey(service, handleLower));
    const entry = composite ? this.channels.get(composite) : undefined;
    if (!entry) return null;
    return { service: entry.service, key: entry.key, handle: entry.handle };
  }

  public channelByKey(
    service: Service,
    key: string,
  ): { handle: string } | null {
    const entry = this.channels.get(StreamRelay.channelKey(service, key));
    return entry ? { handle: entry.handle } : null;
  }

  // ---- echo tag-and-suppress --------------------------------------------

  public noteEcho(senderUserId: string, text: string): void {
    this.echoTags.set(
      this.echoKey(senderUserId, text),
      Date.now() + ECHO_TTL_MS,
    );
  }

  /** Consume a pending echo tag; true if this (user, text) was our own send. */
  public isEcho(senderUserId: string, text: string): boolean {
    const key = this.echoKey(senderUserId, text);
    const exp = this.echoTags.get(key);
    if (exp === undefined) return false;
    this.echoTags.delete(key);
    return exp >= Date.now();
  }

  private echoKey(senderUserId: string, text: string): string {
    return `${senderUserId} ${text}`;
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
   * `world.<service>.message` and append it to the channel's history ring.
   * `egress` marks the mirror of a local player's outbound post. Always
   * emits `Events.RelayMessage` (independent of the Avatar fanout) so the
   * overlay-owner forwarding can pick delivered lines off the event bus.
   */
  public deliver(
    service: Service,
    key: string,
    handle: string,
    speaker: RelaySpeaker,
    text: string,
    egress: boolean,
  ): void {
    const name =
      speaker.kind === 'in-game'
        ? speaker.ref.displayName ?? 'someone'
        : speaker.externalName;
    const marker = egress ? `${service}->` : service;
    const body = Mml.compose`[${marker} #${handle}] ${name}: ${text}`.toString();
    const topic = `world.${service}.message`;
    const payload: RelayMessagePayload = {
      service,
      channelKey: key,
      channelHandle: handle,
      speaker,
      text,
      egress,
    };
    const meta = { timestamp: Date.now(), channelId: key };

    for (const playerId of this.whoTuned(service, key)) {
      const avatar = PlayerApi.findAvatarByPlayerId(playerId);
      if (!avatar) continue; // offline - skip
      MessageApi.sendMessage(avatar, {
        id: SecurityApi.uuid(),
        topic,
        tags: ['audience:witness'],
        body,
        meta: { ...meta },
        payload,
      });
    }
    this.appendToHistory(service, key, {
      id: SecurityApi.uuid(),
      topic,
      tags: ['audience:witness'],
      body,
      meta: { ...meta },
      payload,
    });

    // Overlay-forwarding seam (D3): emit each delivered line. The backend
    // BroadcastFeed filters to the OVERLAY_* channels; nothing else consumes
    // it. Relay stays backend-free — EventApi.emit only.
    EventApi.emit(Events.RelayMessage, {
      service,
      channelKey: key,
      channelHandle: handle,
      speaker,
      text,
    });
  }

  // ---- history ring ------------------------------------------------------

  public appendToHistory(
    service: Service,
    key: string,
    frame: MessageFrame,
  ): void {
    const composite = StreamRelay.channelKey(service, key);
    let ring = this.history.get(composite);
    if (!ring) {
      ring = [];
      this.history.set(composite, ring);
    }
    ring.push(frame);
    if (ring.length > HISTORY_CAP) ring.shift();
  }

  public historyFor(service: Service, key: string): readonly MessageFrame[] {
    return this.history.get(StreamRelay.channelKey(service, key)) ?? [];
  }
}
