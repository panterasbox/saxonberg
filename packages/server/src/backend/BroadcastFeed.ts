/**
 * BroadcastFeed - the outbound, read-only livestream projection.
 *
 * Serves `service:broadcast` connections (OBS browser sources). These
 * connections never become an Interactive/Login/Avatar — they're pure
 * push targets, so by construction they can't run commands and are
 * never routed DMs or private channels. The feed is the single place
 * the broadcast principal receives data.
 *
 * Phase 1 taps exactly one source: the `/obj/StreamState` singleton.
 * On connect it sends a snapshot; on every `Events.StreamStateChanged`
 * it re-pushes the full snapshot to all broadcast connections (the
 * state is tiny — no diffing). Later phases extend this to forward
 * *public* chat and world events (always public-by-construction).
 *
 * Layer: backend/ infrastructure, peer to ConnectionManager. It reaches
 * the wire via `Backend.sendEnvelopeToSocket` directly (same layer);
 * the "game objects reach Backend only through Application" chokepoint
 * governs mud/ objects, not backend services.
 *
 * This is a singleton - only one instance exists per application.
 */

import type {
  StreamStateSnapshot,
  StreamStateEnvelope,
  ReactionDeltaEnvelope,
  RelayChatEnvelope,
} from '@saxonberg/types';
import { Backend } from './Backend';
import { EventApi } from '../mud/api/event';
import { Events } from '../mud/lib/events';
import type { RelayMessageEvent } from '../mud/lib/events';
import { StuffApi } from '../mud/api/stuff';
import { StreamApi } from '../mud/api/stream';
import StreamState from '../mud/obj/StreamState';
import {
  ReactionScopeDeltaEvent,
  type ReactionScopeDeltaPayload,
} from '../mud/lib/events/ReactionScopeDeltaEvent';

/** The overlay owner's configured Twitch login (env). */
function overlayTwitchLogin(): string {
  return (process.env.OVERLAY_TWITCH_LOGIN ?? '').trim().toLowerCase();
}

/** The overlay owner's configured YouTube channel ref (env). */
function overlayYoutubeChannel(): string {
  return (process.env.OVERLAY_YOUTUBE_CHANNEL ?? '').trim().toLowerCase();
}

/** The overlay owner's configured Kick channel slug (env). */
function overlayKickChannel(): string {
  return (process.env.OVERLAY_KICK_CHANNEL ?? '').trim().toLowerCase();
}

/**
 * Whether a relayed line belongs to the overlay owner's OWN configured
 * channel — the filter that keeps a viewer's unrelated tune off the feed.
 * Matches the configured handle (the sentinel tunes each channel by exactly
 * that handle), never a resolved transport key.
 */
function isOverlayOwnChannel(payload: RelayMessageEvent): boolean {
  const handle = payload.channelHandle.trim().toLowerCase();
  if (payload.service === 'twitch') {
    const login = overlayTwitchLogin();
    return login !== '' && handle === login;
  }
  if (payload.service === 'kick') {
    const slug = overlayKickChannel();
    return slug !== '' && handle === slug;
  }
  const chan = overlayYoutubeChannel();
  return chan !== '' && handle === chan;
}

const LIVE_DEFAULT: StreamStateSnapshot = { mode: 'live', awayUntil: null };

export class BroadcastFeed {
  private static instance: BroadcastFeed;

  /** Active broadcast socketIds. */
  private connections: Set<string> = new Set();

  /**
   * Per-socket monotonic frame counter. Broadcast connections have no
   * Interactive, so the feed owns the ordering primitive that
   * `Interactive.nextFrameId` provides for normal connections.
   */
  private frameCounters: Map<string, number> = new Map();

  /** One-shot guard for the EventApi subscription (installed lazily on
   *  first connection, well after boot — so the EventRegistry is live). */
  private subscribed = false;

  private constructor() {}

  public static get(): BroadcastFeed {
    if (!this.instance) {
      this.instance = new BroadcastFeed();
    }
    return this.instance;
  }

  /** Test seam — drop the singleton so each test starts unsubscribed. */
  public static _resetForTesting(): void {
    this.instance = new BroadcastFeed();
  }

  /**
   * Register a broadcast connection and push the current snapshot.
   * Idempotent for a given socketId.
   */
  public addConnection(socketId: string): void {
    this.ensureSubscribed();
    const wasEmpty = this.connections.size === 0;
    this.connections.add(socketId);
    this.frameCounters.set(socketId, 0);
    console.info(
      `BroadcastFeed: connection added - socketId=${socketId}, total=${this.connections.size}`,
    );
    this.pushTo(socketId, this.currentSnapshot());
    // 0→1 edge: open the overlay owner's own-channel reads (presence-gated).
    if (wasEmpty) void StreamApi.setOverlayReading(true);
  }

  /**
   * Drop a broadcast connection. No-op (cheap) when the socket isn't a
   * broadcast connection — Application calls this for every disconnect.
   */
  public removeConnection(socketId: string): void {
    if (!this.connections.delete(socketId)) return;
    this.frameCounters.delete(socketId);
    console.info(
      `BroadcastFeed: connection removed - socketId=${socketId}, total=${this.connections.size}`,
    );
    // 1→0 edge: close the overlay owner's own-channel reads.
    if (this.connections.size === 0) void StreamApi.setOverlayReading(false);
  }

  public getConnectionCount(): number {
    return this.connections.size;
  }

  /** Install the StreamState + reaction-delta listeners exactly once. */
  private ensureSubscribed(): void {
    if (this.subscribed) return;
    EventApi.on<StreamStateSnapshot>(Events.StreamStateChanged, (snapshot) => {
      this.pushToAll(snapshot);
    });
    // Overlay-ready reaction seam: the registry's fixed-cadence flush
    // fires one ReactionScopeDeltaEvent per moved scope (server-numbers
    // projection — buckets/total, no per-viewer sample). Forward each as
    // a reaction-delta to every broadcast socket. v1 forwards all scopes;
    // per-scope overlay filtering is a later refinement.
    EventApi.on<ReactionScopeDeltaPayload>(
      ReactionScopeDeltaEvent.KIND,
      (payload) => {
        this.pushReactionDeltaToAll(payload);
      },
    );
    // Overlay-owner chat: the relay emits one RelayMessage per delivered
    // line; forward ONLY the owner's own configured channels (Twitch +
    // YouTube, unified) as a relay-chat envelope. A viewer tuning some other
    // channel never matches the filter, so nothing leaks onto the feed.
    EventApi.on<RelayMessageEvent>(Events.RelayMessage, (payload) => {
      if (!isOverlayOwnChannel(payload)) return;
      this.pushRelayChatToAll(payload);
    });
    this.subscribed = true;
  }

  private pushRelayChatToAll(payload: RelayMessageEvent): void {
    if (this.connections.size === 0) return;
    for (const socketId of this.connections) {
      const frameId = (this.frameCounters.get(socketId) ?? 0) + 1;
      this.frameCounters.set(socketId, frameId);
      const envelope: RelayChatEnvelope = {
        type: 'relay-chat',
        frameId,
        service: payload.service,
        channelHandle: payload.channelHandle,
        speaker: payload.speaker,
        text: payload.text,
      };
      Backend.get().sendEnvelopeToSocket(socketId, envelope);
    }
  }

  private pushReactionDeltaToAll(payload: ReactionScopeDeltaPayload): void {
    if (this.connections.size === 0) return;
    for (const socketId of this.connections) {
      const frameId = (this.frameCounters.get(socketId) ?? 0) + 1;
      this.frameCounters.set(socketId, frameId);
      const envelope: ReactionDeltaEnvelope = {
        type: 'reaction-delta',
        frameId,
        acts: payload.acts,
      };
      Backend.get().sendEnvelopeToSocket(socketId, envelope);
    }
  }

  /** Read the live StreamState, defaulting to `live` before boot. */
  private currentSnapshot(): StreamStateSnapshot {
    const state = StuffApi.findByTemplatePath<StreamState>(
      StreamState.TEMPLATE_PATH,
    );
    return state ? state.snapshot() : LIVE_DEFAULT;
  }

  private pushToAll(snapshot: StreamStateSnapshot): void {
    for (const socketId of this.connections) {
      this.pushTo(socketId, snapshot);
    }
  }

  private pushTo(socketId: string, snapshot: StreamStateSnapshot): void {
    const frameId = (this.frameCounters.get(socketId) ?? 0) + 1;
    this.frameCounters.set(socketId, frameId);
    const envelope: StreamStateEnvelope = {
      type: 'stream-state',
      frameId,
      state: snapshot,
    };
    Backend.get().sendEnvelopeToSocket(socketId, envelope);
  }
}
