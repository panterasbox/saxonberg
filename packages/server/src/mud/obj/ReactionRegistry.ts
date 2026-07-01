/**
 * ReactionRegistry — singleton Idea holding the reaction substrate's
 * runtime state: per-act tallies, the threshold/toggle logic, the
 * fixed-cadence sink-agnostic broadcaster, per-recipient sampling, and
 * the TTL GC. In-memory authority, ring-tied, GC'd — **nothing
 * persists** (the Sybil-gameable trap the reputation build avoids).
 *
 * Lives at `/obj/ReactionRegistry`. The thin {@link ReactionApi} facade
 * is the only legitimate caller — every public method carries
 * `@CallSecurity(FromModule('/api/reaction#ReactionApi'))` (plus
 * `SelfOnly` for internal `this.foo()`), so external code that grabs the
 * Stuff via `StuffApi.findByTemplatePath` cannot poke its state.
 *
 * State uses `private`, NOT `#private`: the registry is a
 * call-security-proxied Stuff host, and `this.#foo` from a method
 * dispatched through the proxy throws (see CLAUDE.md § Member Privacy).
 *
 * The crux is {@link flush}: a **fixed-cadence** `ScheduleApi.recurring`
 * tick (NOT `setImmediate`) that collapses an unbounded stream of
 * independent command dispatches into ~5–10 flushes/sec regardless of
 * throughput — per-tick wire cost is `audience × cadence`, not reaction
 * count. See docs/subsystems/reactions.md.
 */

import type {
  ReactionActState,
  ReactionBucket,
  ReactionSampleEntry,
  ReactionDeltaEnvelope,
  ReactionExpandResultEnvelope,
} from '@saxonberg/types';
import { Idea } from '../lib/stuff/Idea';
import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';
import type { Stuff } from '../lib/stuff/Stuff';
import type { Sensor } from '../lib/message/Sensor';
import type Interactive from './Interactive';
import { MixinApi } from '../api/mixin';
import { MessageApi } from '../api/message';
import { EventApi } from '../api/event';
import { AppApi } from '../api/app';
import { StuffApi } from '../api/stuff';
import { RecognitionApi } from '../api/recognition';
import { ShellApi } from '../api/shell';
import { ScheduleApi, type ScheduleHandle } from '../api/schedule';
import { AppSettingKeys } from '../lib/config/AppSettings';
import { ReactionFiredEvent } from '../lib/events/ReactionFiredEvent';
import { ReactionScopeDeltaEvent } from '../lib/events/ReactionScopeDeltaEvent';
import type {
  ScopedEmoteRequest,
  ScopedEmoteDecision,
  ReactableActRequest,
  ExpandRequest,
  ReactionSink,
} from '../api/reaction';

const ReactionApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('/api/reaction#ReactionApi'),
  SecurityPolicies.SelfOnly,
);

/** One reactor's reaction to one act. */
interface ReactorReaction {
  reactorId: string;
  emote: string;
  emoji?: string;
  tags: string[];
  customText?: string;
  present: boolean;
  /** Most-recent flip-on time, for recency-ordered sampling. */
  at: number;
}

/** One reactable act and its running tally. */
interface ActRecord {
  commandId: string;
  subjectId: string;
  scope: string;
  createdAt: number;
  reactions: Map<string, ReactorReaction>;
  aggregated: boolean;
}

/** Default knobs; overridden from AppSettings when available. */
const DEFAULTS = {
  threshold: 10,
  cadenceMs: 200,
  sampleCap: 5,
  /** TTL approximating the chat ring's 200-cap conceptual bound. */
  ttlMs: 5 * 60_000,
  /** Bounded per-Interactive gutter ring depth. */
  gutterRing: 256,
};

/**
 * Per-recipient delta-shaping preferences, resolved from the viewer's
 * `social.react.*` settings once per flush per sink. `tagGroup` chooses
 * the bucket key (tag group vs per-verb); `nameCap` (the
 * `collapseThreshold` setting) is the count below which a bucket still
 * lists its reactors by name for the chip hover — above it the chip
 * shows just the count and the full set is a pull away (`handleExpand`).
 */
interface ViewerPrefs {
  tagGroup: boolean;
  nameCap: number;
}

const DEFAULT_PREFS: ViewerPrefs = { tagGroup: true, nameCap: 25 };

/** Clamp the flush cadence to the bounded design range. */
function clampCadence(ms: number): number {
  if (!Number.isFinite(ms)) return DEFAULTS.cadenceMs;
  return Math.max(150, Math.min(250, ms));
}

/**
 * The normal per-player sink wrapping an Interactive. Sees an act iff
 * its holder is co-present (location scope) or has engaged the channel
 * scope. Delivers via `MessageApi.sendEnvelope`, which routes to the
 * holder's connected Interactives and stamps `frameId` downstream.
 */
class InteractiveReactionSink implements ReactionSink {
  readonly id: string;
  /** Channel scopes the holder has engaged (reacted on / been subscribed). */
  private channelScopes: Set<string> = new Set();

  constructor(private readonly interactive: Interactive) {
    this.id = `interactive:${interactive.stuffId}`;
  }

  get viewer(): (Stuff & Sensor) | null {
    const holder = this.interactive.getHolder();
    if (holder && MixinApi.isSensor(holder)) {
      return holder as Stuff & Sensor;
    }
    return null;
  }

  addChannelScope(scope: string): void {
    this.channelScopes.add(scope);
  }

  seesScope(scope: string): boolean {
    if (scope.startsWith('location:')) {
      const holder = this.interactive.getHolder();
      if (!holder || !MixinApi.isContainable(holder)) return false;
      const env = holder.getContainer();
      return env != null && `location:${env.stuffId}` === scope;
    }
    if (scope.startsWith('channel:')) {
      return this.channelScopes.has(scope);
    }
    return false;
  }

  emitDelta(env: Omit<ReactionDeltaEnvelope, 'frameId'>): void {
    const viewer = this.viewer;
    if (!viewer) return;
    MessageApi.sendEnvelope(viewer, env);
  }
}

export default class ReactionRegistry extends Idea {
  /* ─── state ─── */
  private acts: Map<string, ActRecord> = new Map();
  private dirty: Set<string> = new Set();
  private scopeSinks: Map<string, Set<ReactionSink>> = new Map();
  private interactiveSinks: Map<Interactive, InteractiveReactionSink> =
    new Map();
  private lastBySubject: Map<string, string> = new Map();
  private gutter: Map<Interactive, Array<{ frameId: number; commandId: string }>> =
    new Map();
  private flushHandle: ScheduleHandle | null = null;

  /** Injectable real clock; tests swap it for deterministic GC. */
  private nowMs: () => number = Date.now;
  /** Suppress the live timer; tests drive `_flushNow()` manually. */
  private testMode = false;

  /* ─── settings (read lazily, cached) ─── */
  private cfg: {
    threshold: number;
    cadenceMs: number;
    sampleCap: number;
  } | null = null;

  private config(): { threshold: number; cadenceMs: number; sampleCap: number } {
    if (this.cfg) return this.cfg;
    const num = (key: string, dflt: number): number => {
      try {
        const raw = AppApi.setting(key);
        const n = Number.parseInt(raw, 10);
        return Number.isFinite(n) ? n : dflt;
      } catch {
        return dflt;
      }
    };
    this.cfg = {
      threshold: num(AppSettingKeys.reactionsThreshold, DEFAULTS.threshold),
      cadenceMs: clampCadence(
        num(AppSettingKeys.reactionsCadenceMs, DEFAULTS.cadenceMs),
      ),
      sampleCap: num(AppSettingKeys.reactionsSampleCap, DEFAULTS.sampleCap),
    };
    return this.cfg;
  }

  /* ─── public surface ─── */

  @CallSecurity(ReactionApiCallers)
  public onScopedEmote(req: ScopedEmoteRequest): ScopedEmoteDecision {
    const act = this.acts.get(req.inReactionTo);
    if (!act) {
      // The act was never noted reactable. Defence in depth — the
      // controller validates reactability before dispatching.
      return { suppressFanOut: false, reactable: false };
    }

    // Reactions aggregate by GLYPH for now: an emote with no emoji (and
    // free-form text) isn't tallied or chipped — it just renders as its
    // diegetic line. Keeps the chip rail emoji-only and `total` == the
    // sum of the visible chips. See docs/subsystems/reactions.md.
    if (req.emoji === undefined) {
      return { suppressFanOut: false, reactable: true };
    }

    const reactorId = (req.reactor as Stuff).stuffId;
    // The reaction key is (reactorId, emote): a reactor may hold several
    // DISTINCT reactions on one act simultaneously. Reacting is
    // **add-only / idempotent** — re-firing the same emote does NOT
    // toggle it off (that surprised; removal is the explicit
    // `removeReaction` op, GUI-driven). It just re-performs the emote.
    const key = `${reactorId} ${req.verb}`;
    const existing = act.reactions.get(key);
    let flippedOn = false;

    if (existing && existing.present) {
      // Already reacted with this emote — idempotent. No tally change,
      // no renown re-fire; the diegetic line still fans out below
      // threshold (the reactor performed the emote again).
    } else if (existing) {
      // A previously-removed reaction comes back on (a fresh flip-on).
      existing.present = true;
      existing.at = this.nowMs();
      flippedOn = true;
    } else {
      act.reactions.set(key, {
        reactorId,
        emote: req.verb,
        emoji: req.emoji,
        tags: req.tags,
        customText: req.customText,
        present: true,
        at: this.nowMs(),
      });
      flippedOn = true;
    }

    if (flippedOn) {
      // Threshold: compute aggregated INCLUDING this reaction so the
      // crossing reaction suppresses its own line (no flicker). Sticky.
      const total = this.presentCount(act);
      if (total >= this.config().threshold) act.aggregated = true;
      this.markDirty(act.commandId);
      this.ensureScopeSeenByReactor(req.reactor, act.scope);
      EventApi.fire(
        new ReactionFiredEvent({
          reactorId,
          subjectId: act.subjectId,
          commandId: act.commandId,
          emote: req.verb,
          tags: req.tags,
          customText: req.customText,
          scope: act.scope,
          selfReaction: reactorId === act.subjectId,
        }),
      );
    }

    return { suppressFanOut: act.aggregated, reactable: true };
  }

  /**
   * Explicitly remove the reactor's `(reactor, emote)` reaction from an
   * act — the un-react op. No renown, no diegetic line; the count just
   * drops. Driven by the GUI (clicking an active chip); the CLI exposes
   * it via `react --remove`.
   */
  @CallSecurity(ReactionApiCallers)
  public removeReaction(req: ScopedEmoteRequest): void {
    const act = this.acts.get(req.inReactionTo);
    if (!act) return;
    const reactorId = (req.reactor as Stuff).stuffId;
    const existing = act.reactions.get(`${reactorId} ${req.verb}`);
    if (existing && existing.present) {
      existing.present = false;
      this.markDirty(act.commandId);
    }
  }

  @CallSecurity(ReactionApiCallers)
  public noteReactableAct(req: ReactableActRequest): void {
    const subjectId = (req.subject as Stuff).stuffId;
    // Always refresh the per-subject "last act" pointer.
    this.lastBySubject.set(subjectId, req.commandId);
    if (this.acts.has(req.commandId)) return; // idempotent on commandId
    this.acts.set(req.commandId, {
      commandId: req.commandId,
      subjectId,
      scope: req.scope,
      createdAt: this.nowMs(),
      reactions: new Map(),
      aggregated: false,
    });
    this.ensureTimer();
  }

  /**
   * Speaker + audience-scope of a reactable act, by `commandId`, or `null`
   * if no such act is registered (not a reactable comm act — the renown
   * reception filter). The act is registered (by `noteReactableAct`)
   * before the frame fans out, so it is present when a receiver's
   * `CommReceivedEvent` resolves it.
   */
  @CallSecurity(ReactionApiCallers)
  public actInfo(
    commandId: string,
  ): { subjectId: string; scope: string } | null {
    const act = this.acts.get(commandId);
    return act ? { subjectId: act.subjectId, scope: act.scope } : null;
  }

  @CallSecurity(ReactionApiCallers)
  public noteDeliveredFrame(
    interactive: Interactive,
    frameId: number,
    commandId: string,
  ): void {
    let ring = this.gutter.get(interactive);
    if (!ring) {
      ring = [];
      this.gutter.set(interactive, ring);
    }
    ring.push({ frameId, commandId });
    if (ring.length > DEFAULTS.gutterRing) ring.shift();
  }

  @CallSecurity(ReactionApiCallers)
  public resolveGutter(
    interactive: Interactive,
    frameId: number,
  ): string | null {
    const ring = this.gutter.get(interactive);
    if (!ring) return null;
    for (let i = ring.length - 1; i >= 0; i--) {
      if (ring[i]!.frameId === frameId) return ring[i]!.commandId;
    }
    return null;
  }

  @CallSecurity(ReactionApiCallers)
  public lastReactableActBy(subjectId: string): string | null {
    return this.lastBySubject.get(subjectId) ?? null;
  }

  /** The most-recent reactable act delivered to this Interactive. */
  @CallSecurity(ReactionApiCallers)
  public lastDeliveredActFor(interactive: Interactive): string | null {
    const ring = this.gutter.get(interactive);
    if (!ring || ring.length === 0) return null;
    return ring[ring.length - 1]!.commandId;
  }

  @CallSecurity(ReactionApiCallers)
  public isReactableAct(commandId: string): boolean {
    return this.acts.has(commandId);
  }

  @CallSecurity(ReactionApiCallers)
  public scopeOf(commandId: string): string | null {
    return this.acts.get(commandId)?.scope ?? null;
  }

  @CallSecurity(ReactionApiCallers)
  public handleExpand(req: ExpandRequest): void {
    const act = this.acts.get(req.commandId);
    const holder = req.interactive.getHolder();
    if (!holder || !MixinApi.isSensor(holder)) return;
    const viewer = holder as Stuff & Sensor;
    const reactors: ReactionSampleEntry[] = act
      ? this.entriesFor(act, viewer, Number.POSITIVE_INFINITY, false)
      : [];
    const template: Omit<ReactionExpandResultEnvelope, 'frameId'> = {
      type: 'reaction-expand-result',
      requestId: req.requestId,
      commandId: req.commandId,
      reactors,
    };
    MessageApi.sendEnvelope(viewer, template);
  }

  @CallSecurity(ReactionApiCallers)
  public registerInteractive(interactive: Interactive): void {
    if (this.interactiveSinks.has(interactive)) return;
    this.interactiveSinks.set(
      interactive,
      new InteractiveReactionSink(interactive),
    );
  }

  @CallSecurity(ReactionApiCallers)
  public cancelAllForInteractive(interactive: Interactive): void {
    this.interactiveSinks.delete(interactive);
    this.gutter.delete(interactive);
  }

  @CallSecurity(ReactionApiCallers)
  public subscribeScope(sink: ReactionSink, scope: string): void {
    let set = this.scopeSinks.get(scope);
    if (!set) {
      set = new Set();
      this.scopeSinks.set(scope, set);
    }
    set.add(sink);
  }

  @CallSecurity(ReactionApiCallers)
  public cancelSink(sink: ReactionSink): void {
    for (const [scope, set] of this.scopeSinks) {
      set.delete(sink);
      if (set.size === 0) this.scopeSinks.delete(scope);
    }
  }

  /* ─── the fixed-cadence broadcaster ─── */

  private ensureTimer(): void {
    if (this.flushHandle || this.testMode) return;
    // Never auto-arm the live flush interval under the test runner —
    // unrelated emote/speech/chat tests trigger `noteReactableAct` and
    // would otherwise leak a recurring timer. Tests drive `_flushNow`.
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) return;
    this.flushHandle = ScheduleApi.recurring(
      this.config().cadenceMs,
      () => this.flush(),
      { mode: 'fixed-rate', propagateAttribution: false },
    );
  }

  private flush(): void {
    const now = this.nowMs();
    if (this.dirty.size === 0) {
      this.gc(now);
      return;
    }
    const movedIds = [...this.dirty];
    this.dirty.clear();
    const moved = movedIds
      .map((id) => this.acts.get(id))
      .filter((a): a is ActRecord => a != null);

    // Every recipient sink (per-player + explicit/overlay).
    const sinks = new Set<ReactionSink>();
    for (const s of this.interactiveSinks.values()) sinks.add(s);
    for (const set of this.scopeSinks.values()) {
      for (const s of set) sinks.add(s);
    }

    for (const sink of sinks) {
      const visible = moved.filter((a) => sink.seesScope(a.scope));
      if (visible.length === 0) continue;
      const viewer = sink.viewer ?? null;
      // Delta-shaping prefs are per-recipient — resolve once per sink
      // (not per act). `tagGroup` picks the bucket key; the collapse
      // threshold caps how many reactor names ride the delta.
      const prefs = this.viewerPrefs(viewer);
      const acts = visible.map((a) => this.buildActState(a, viewer, prefs));
      sink.emitDelta({ type: 'reaction-delta', acts });
    }

    // Overlay-ready sink-agnostic seam: one scope event per moved scope.
    const scopes = new Set(moved.map((a) => a.scope));
    for (const scope of scopes) {
      const acts = moved
        .filter((a) => a.scope === scope)
        .map((a) => this.buildActState(a, null));
      EventApi.fire(new ReactionScopeDeltaEvent({ scope, acts }));
    }

    this.gc(now);
  }

  /* ─── projection helpers ─── */

  private presentCount(act: ActRecord): number {
    let n = 0;
    for (const r of act.reactions.values()) if (r.present) n++;
    return n;
  }

  /** Resolve a viewer's delta-shaping reaction prefs (defaults when none). */
  private viewerPrefs(viewer: (Stuff & Sensor) | null): ViewerPrefs {
    if (!viewer) return DEFAULT_PREFS;
    try {
      const tagGroup = ShellApi.resolveSetting<boolean>(
        viewer,
        'social.react.tagGroup',
      );
      const cap = ShellApi.resolveSetting<number>(
        viewer,
        'social.react.collapseThreshold',
      );
      return {
        tagGroup: tagGroup ?? DEFAULT_PREFS.tagGroup,
        nameCap:
          typeof cap === 'number' && cap > 0 ? cap : DEFAULT_PREFS.nameCap,
      };
    } catch {
      // A sink viewer that isn't a settings host — fall back to defaults.
      return DEFAULT_PREFS;
    }
  }

  private buildActState(
    act: ActRecord,
    viewer: (Stuff & Sensor) | null,
    prefs: ViewerPrefs = DEFAULT_PREFS,
  ): ReactionActState {
    const buckets = new Map<string, ReactionBucket>();
    const bucketReactorIds = new Map<string, string[]>();
    for (const r of act.reactions.values()) {
      if (!r.present) continue;
      // `tagGroup` (per-viewer) picks the bucket key: a tag group
      // (`agree`/`ok`/`nod` → one chip) or per-verb when off.
      const key =
        prefs.tagGroup && r.tags.length > 0 ? r.tags[0]! : r.emote;
      const b = buckets.get(key);
      if (b) {
        b.count += 1;
      } else {
        buckets.set(key, {
          tag: key,
          emote: r.emote,
          ...(r.emoji !== undefined ? { emoji: r.emoji } : {}),
          count: 1,
        });
      }
      const ids = bucketReactorIds.get(key);
      if (ids) ids.push(r.reactorId);
      else bucketReactorIds.set(key, [r.reactorId]);
    }
    // Per-bucket "who reacted" names for the chip hover — only when the
    // bucket is small enough to display, and only for a real viewer
    // (recognition-named, so strangers read as salient features).
    if (viewer) {
      const vid = (viewer as Stuff).stuffId;
      for (const [key, b] of buckets) {
        if (b.count > prefs.nameCap) continue;
        const names: string[] = [];
        for (const id of bucketReactorIds.get(key) ?? []) {
          const reactor = StuffApi.findById(id);
          if (!reactor) continue;
          // Self gets its own name (recognition describes *others*, so
          // it would otherwise read as salient features for an
          // unrecognized self); everyone else is recognition-named.
          names.push(
            id === vid
              ? reactor.getPresentation()
              : RecognitionApi.describe(viewer, reactor),
          );
        }
        if (names.length > 0) b.reactors = names;
      }
    }
    const cap = this.config().sampleCap;
    const sample = viewer ? this.entriesFor(act, viewer, cap, true) : [];
    // The recipient's OWN present reactions — so the client can show
    // which chips are active and send `react --remove` to toggle them
    // off (vs `react` to add). Per-recipient, like the sample.
    let mine: string[] | undefined;
    if (viewer) {
      const vid = (viewer as Stuff).stuffId;
      mine = [];
      for (const r of act.reactions.values()) {
        if (r.present && r.reactorId === vid) mine.push(r.emote);
      }
    }
    return {
      commandId: act.commandId,
      subjectId: act.subjectId,
      scope: act.scope,
      buckets: [...buckets.values()],
      sample,
      total: this.presentCount(act),
      aggregated: act.aggregated,
      ...(mine !== undefined ? { mine } : {}),
    };
  }

  /**
   * Build named sample entries for `viewer`. When `familiarOnly`, only
   * reactors the viewer recognizes / has in contacts surface (strangers
   * stay in the count, unnamed); expand passes `false` for the full set.
   * Names come from `RecognitionApi.describe` — the same late-binding
   * the prose path uses, so the pane and scrollback can't disagree.
   */
  private entriesFor(
    act: ActRecord,
    viewer: Stuff & Sensor,
    cap: number,
    familiarOnly: boolean,
  ): ReactionSampleEntry[] {
    const present = [...act.reactions.values()]
      .filter((r) => r.present)
      .sort((a, b) => b.at - a.at); // most-recent first
    const out: ReactionSampleEntry[] = [];
    for (const r of present) {
      if (out.length >= cap) break;
      const reactor = StuffApi.findById(r.reactorId);
      if (!reactor) continue;
      if (familiarOnly && !this.isFamiliar(viewer, reactor, r.reactorId)) {
        continue;
      }
      out.push({
        reactorId: r.reactorId,
        reactorName: RecognitionApi.describe(viewer, reactor),
        emote: r.emote,
        ...(r.emoji !== undefined ? { emoji: r.emoji } : {}),
        ...(r.customText !== undefined ? { customText: r.customText } : {}),
      });
    }
    return out;
  }

  /** Familiarity signal for sampling: contacts membership. */
  private isFamiliar(
    viewer: Stuff & Sensor,
    reactor: Stuff,
    reactorId: string,
  ): boolean {
    if (!MixinApi.isContacts(viewer)) return false;
    const tpath = reactor.getTemplatePath() ?? undefined;
    for (const c of viewer.allContacts()) {
      if (c.kind === 'avatar' && c.playerId === reactorId) return true;
      if (c.kind === 'npc' && tpath !== undefined && c.templatePath === tpath) {
        return true;
      }
    }
    return false;
  }

  private markDirty(commandId: string): void {
    this.dirty.add(commandId);
  }

  /** Auto-subscribe a reacting holder's channel sink so it sees the act. */
  private ensureScopeSeenByReactor(reactor: Stuff, scope: string): void {
    if (!scope.startsWith('channel:')) return; // location handled by co-presence
    if (!MixinApi.isHasInteractive(reactor)) return;
    for (const interactive of reactor.getInteractives()) {
      let sink = this.interactiveSinks.get(interactive);
      if (!sink) {
        sink = new InteractiveReactionSink(interactive);
        this.interactiveSinks.set(interactive, sink);
      }
      sink.addChannelScope(scope);
    }
  }

  /** Drop acts past their TTL; their tallies go with them. */
  private gc(now: number): void {
    const ttl = DEFAULTS.ttlMs;
    for (const [id, act] of this.acts) {
      if (now - act.createdAt > ttl) {
        this.acts.delete(id);
        this.dirty.delete(id);
        if (this.lastBySubject.get(act.subjectId) === id) {
          this.lastBySubject.delete(act.subjectId);
        }
      }
    }
  }

  /* ─── test seams ─── */

  @CallSecurity(ReactionApiCallers)
  public _flushNow(): void {
    this.flush();
  }

  @CallSecurity(ReactionApiCallers)
  public _setTestMode(on: boolean): void {
    this.testMode = on;
    if (on && this.flushHandle) {
      ScheduleApi.cancel(this.flushHandle);
      this.flushHandle = null;
    }
  }

  @CallSecurity(ReactionApiCallers)
  public _setNow(fn: () => number): void {
    this.nowMs = fn;
  }

  @CallSecurity(ReactionApiCallers)
  public _actCount(): number {
    return this.acts.size;
  }

  @CallSecurity(ReactionApiCallers)
  public _actState(commandId: string): ReactionActState | null {
    const act = this.acts.get(commandId);
    return act ? this.buildActState(act, null) : null;
  }

  @CallSecurity(ReactionApiCallers)
  public _clearAll(): void {
    if (this.flushHandle) {
      ScheduleApi.cancel(this.flushHandle);
      this.flushHandle = null;
    }
    this.acts.clear();
    this.dirty.clear();
    this.scopeSinks.clear();
    this.interactiveSinks.clear();
    this.lastBySubject.clear();
    this.gutter.clear();
    this.cfg = null;
  }
}
