/**
 * StreamState — session-wide singleton Idea holding the livestream
 * overlay state. Lives at `/obj/StreamState`, sibling to the other
 * singleton catalogues under `obj/` (the singleton-in-`obj/`
 * convention).
 *
 * Phase 1 is deliberately minimal: a `mode` (`live` / `standby`) and an
 * absolute `awayUntil` epoch-ms that drives the standby-overlay
 * countdown. Later this gains active scene, lower-third text, camera
 * focus, and the alert queue (the §4 `StreamState` of `PLAN.md`).
 *
 * Mutation flows through the typed setters, which emit
 * `Events.StreamStateChanged` carrying the whole {@link
 * StreamStateSnapshot}. The backend-layer `BroadcastFeed` is the v1
 * listener — it re-pushes the snapshot to every broadcast connection.
 * Routing the change through the event bus (rather than a direct
 * call) keeps the mutator decoupled from the feed and lets future
 * mutators (Phase 3 scene/lower-third commands) reach the feed for
 * free.
 *
 * Not a persisted record. State is in-memory for the process lifetime;
 * the seed YAML is `{ class: /obj/StreamState, data: {} }`. A reboot
 * resets to `live` — acceptable for Phase 1 (the streamer re-issues
 * `stream away` after a restart). Durable round-trip is deferred until
 * there's a reason to survive reboots mid-standby.
 */

import { Idea } from '../lib/stuff/Idea';
import { PostRegistrationMixin } from '../lib/stuff/PostRegistration';
import { EventApi } from '../api/event';
import { Events } from '../lib/events';
import type { StreamStateSnapshot } from '@saxonberg/types';
import type { VetoResult } from '../lib/errors';
import type { EvictionContext } from '../lib/stuff/Stuff';

const StreamStateBase = PostRegistrationMixin(Idea);

export default class StreamState extends StreamStateBase {

  /**
   * Residency veto - a load-bearing process-lifetime singleton is
   * never culled by the self-eviction sweep.
   */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }
  /** Fixed singleton template path. */
  public static readonly TEMPLATE_PATH = '/obj/StreamState';

  /**
   * Transient overlay mode. `'standby'` while the streamer is away
   * (countdown running), `'live'` otherwise. TypeScript `private` per
   * the domain-code default — external readers go through
   * {@link getMode} / {@link snapshot}.
   */
  private mode: 'live' | 'standby' = 'live';

  /** Absolute epoch-ms the countdown targets; `null` when live. */
  private awayUntil: number | null = null;

  public getMode(): 'live' | 'standby' {
    return this.mode;
  }

  public getAwayUntil(): number | null {
    return this.awayUntil;
  }

  /** Current state as the wire-shaped snapshot. */
  public snapshot(): StreamStateSnapshot {
    return { mode: this.mode, awayUntil: this.awayUntil };
  }

  /**
   * Enter standby with an absolute return time. Idempotent-friendly:
   * always fires a change so the feed re-pushes even if the streamer
   * extends an already-running countdown.
   */
  public setAway(awayUntil: number): void {
    this.mode = 'standby';
    this.awayUntil = awayUntil;
    this.emitChange();
  }

  /** Clear standby and go live (countdown cleared). */
  public goLive(): void {
    this.mode = 'live';
    this.awayUntil = null;
    this.emitChange();
  }

  private emitChange(): void {
    EventApi.emit<StreamStateSnapshot>(
      Events.StreamStateChanged,
      this.snapshot(),
    );
  }

  /**
   * Singleton refusal. Mirrors the other `obj/` singletons — the feed
   * and the `stream` verb resolve us lazily via `findByTemplatePath`
   * and assume we stay live for the process lifetime.
   */
  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason:
        'StreamState is a system singleton and cannot be destructed; ' +
        'use forceDestruct (admin-gated) if you really mean it',
    };
  }
}
