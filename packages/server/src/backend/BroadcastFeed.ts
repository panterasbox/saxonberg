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

import type { StreamStateSnapshot, StreamStateEnvelope } from '@saxonberg/types';
import { Backend } from './Backend';
import { EventApi } from '../mud/api/event';
import { Events } from '../mud/lib/events';
import { StuffApi } from '../mud/api/stuff';
import StreamState from '../mud/obj/StreamState';

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

  /**
   * Register a broadcast connection and push the current snapshot.
   * Idempotent for a given socketId.
   */
  public addConnection(socketId: string): void {
    this.ensureSubscribed();
    this.connections.add(socketId);
    this.frameCounters.set(socketId, 0);
    console.info(
      `BroadcastFeed: connection added - socketId=${socketId}, total=${this.connections.size}`,
    );
    this.pushTo(socketId, this.currentSnapshot());
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
  }

  public getConnectionCount(): number {
    return this.connections.size;
  }

  /** Install the StreamState change listener exactly once. */
  private ensureSubscribed(): void {
    if (this.subscribed) return;
    EventApi.on<StreamStateSnapshot>(Events.StreamStateChanged, (snapshot) => {
      this.pushToAll(snapshot);
    });
    this.subscribed = true;
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
