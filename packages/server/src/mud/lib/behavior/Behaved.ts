/**
 * BehavedMixin — the automation layer behind authored (non-player)
 * Stuff. The **first real consumer** of the shipped-but-inert activity
 * substrate (see activity.md).
 *
 * A host carries a declarative `behaviors:` data list — each entry a
 * `{ brain, trigger, config }` spec. At spawn (`onCreate`) the mixin
 * reads the list, **path-resolves each brain** (warming the hot-reload
 * registry), and **wires** each spec to its trigger:
 *
 * - **cadence** (`cadence:Ns`) → a jittered `ScheduleApi` timer so a
 *   room of NPCs never ticks in lockstep; presence-gated (skip when no
 *   player is watching — an empty bar sleeps).
 * - **witness** (`arrival`/`departure`/`emote`/`speech`) → the host's
 *   own `SensorMixin.handleMessage` perception stream. No global event
 *   is emitted or subscribed: the NPC reacts only to frames it already
 *   perceives.
 *
 * Each fire **re-resolves** the brain by path (`resolveExportSync`) and
 * calls its static `act(ctx)` — so editing a brain hot-reloads into a
 * live NPC's next action with no re-spawn. The mixin **never captures**
 * a brain reference. Live wiring (timers, the seen-set) is
 * runtime-only; `onCreate` re-installs it from the persisted
 * `behaviors:` data on every clone/reboot.
 *
 * **Slot contention** rides the shared `EngagedMixin` map: a brain
 * declares `claims` + `requiresFree`; a cadence brain yields a tick if
 * one of its `requiresFree` slots is occupied; a witness brain that
 * `claims` a slot holds it briefly via a {@link BehaviorBeat}, so the
 * cadence brain yields — "wandering stops while the NPC greets you" —
 * and resumes on its next tick once the beat completes.
 *
 * Branch-agnostic: composed on a thin `NPC` class (Character + Behaved)
 * in Wave 1, but usable on any Stuff (reactive scenery later). Verbs /
 * engagement contention only engage when the host actually composes the
 * relevant mixins (`Sensor` for witness triggers, `Engaged` for slots).
 */

import type { AbortReason, MessageFrame } from '@saxonberg/types';
import type { MixinConstructor, FieldMeta } from '../mixin';
import { Mixins } from '../mixin';
import type { Stuff, EvictionContext } from '../stuff/Stuff';
import type { VetoResult } from '../errors';
import { StuffApi } from '../../api/stuff';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import { ScheduleApi, type ScheduleHandle } from '../../api/schedule';
import { SchedulerApi } from '../../api/scheduler';
import { MixinApi } from '../../api/mixin';
import type { CommandContributions } from '../../api/command';
import { ReactionApi } from '../../api/reaction';
import { SoulApi } from '../../api/soul';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import type { ClaimSeed } from '../trait/Dispositioned';
import type { Container } from '../spatial/Container';
import type { Containable } from '../spatial/Containable';
import type { Engaged, EngagementSlot } from '../activity/Engaged';
import {
  type BehaviorSpec,
  type BrainContext,
  type BrainStatics,
  type ParsedTrigger,
  type WitnessKind,
  WITNESS_TOPIC,
  BRAIN_EXPORT,
} from './brain';
import { BehaviorBeat, BEHAVIOR_BEAT_TYPE } from './BehaviorBeat';
import { Urgency, URGENCY_BANDS, type TaskKind } from './Urgency';

/** Code defaults for the beat dials — identity when app-settings is unwarmed. */
const DEFAULT_BEAT_MS = 20_000;
const DEFAULT_BEAT_NIGHTLY_MS = 120_000;
const DEFAULT_BEAT_MIN_GAP_MS = 3_000;

/** ± jitter applied to every cadence interval (anti-lockstep). */
const JITTER_FRACTION = 0.25;
/** How long a witness brain's slot `claims` are held (ms). */
const BEAT_MS = 2500;

/**
 * What the agent decided it is doing, and why. ⭐ Runtime only — a reboot
 * re-decides at the first beat, which is honest, and a host with no prior
 * intention narrates no switch, so a reboot produces no spurious act.
 */
export interface Intention {
  /** The winning brain's path. */
  readonly brain: string;
  readonly band: string;
  /** The sentence a watcher read when this became the intention. */
  readonly because: string;
  /** `Date.now()` when it became the intention. */
  readonly since: number;
}

/** One candidate's answer, with the wiring that produced it. */
interface Candidate {
  wiring: BehaviorWiring;
  descriptor: BrainStatics;
  urgency: Urgency;
  kind: TaskKind;
}

interface BehaviorWiring {
  spec: BehaviorSpec;
  parsed: ParsedTrigger;
  /** Per-(host, spec) runtime scratch — patrol index, etc. Not persisted. */
  state: Record<string, unknown>;
  handle?: ScheduleHandle;
  live: boolean;
  /**
   * Whether this brain's cadence is ambient chatter (subject to the global
   * pacing dial) — captured once from the brain's `static ambient` at wire
   * time (a structural flag, not per-fire; the HMR per-fire re-resolve is
   * for `act`, not pacing). Absent/true = ambient; `false` = functional
   * poller (exact interval).
   */
  ambient: boolean;
}

/**
 * Public shape contributed by BehavedMixin.
 */
export interface Behaved {
  getBehaviors(): readonly BehaviorSpec[];
  /**
   * Fire the cadence beat wired for `brainPath` NOW — the author's seam
   * (a wizard `eval`, a drive) onto the same beat the timer runs, gates
   * and all. False when no live wiring names that brain.
   */
  fireBeat(brainPath: string): Promise<boolean>;
  /** What this agent decided it is doing, and why. Null before its first beat. */
  getIntention(): Intention | null;
  /**
   * ⭐ Pull the next deliberation beat forward — because something was
   * perceived, or because somebody called. Debounced to
   * `behavior.beatMinGapMs`: a noisy room must not be an unbounded
   * deliberation loop.
   */
  requestBeat(): void;
  /**
   * ⭐⭐ Cut whatever this agent is doing that yields to `reason`, and say
   * whether anything was actually cut.
   *
   * This is the **first consumer of `interruptibleBy`** in the engine's
   * history: every engagement in the tree declared a set and nothing ever
   * read one. A beat that declares neither `called` nor `outranked`
   * genuinely cannot be interrupted by either now.
   */
  preemptFor(reason: AbortReason): boolean;
}

export function BehavedMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase
) {
  class BehavedMixin extends Base implements Behaved {
    static _mixinName = 'BehavedMixin';

    /**
     * Residency veto: authored NPC cast (carrying a behavior spec) is
     * never culled — re-cloning would erase it. Falls through to `super`
     * when spec-less so other composed vetoes still apply.
     */
    public canEvict(context: EvictionContext): VetoResult {
      if (this.getBehaviors().length > 0) {
        return { ok: false, reason: 'active NPC behavior spec' };
      }
      return super.canEvict(context);
    }

    /** The declarative spec list — pure data, persisted as-is. */
    static fieldMeta: FieldMeta = {
      behaviors: { persistent: true, authorable: true },
      dispositions: { persistent: true, authorable: true },
    };
    public behaviors: BehaviorSpec[] = [];

    /**
     * An authored host's established character, as disposition `claim`
     * seeds — pure data, persisted as-is. Seeded into the trait ledger
     * once at spawn (`onCreate`) so derive-on-read yields the host's
     * defining traits immediately, while keeping personality
     * derive-don't-track (it came from a seeded history, not a stat). The
     * behavior→trait edge this introduces is the same one the trait-aware
     * brains already establish.
     */
    public dispositions: ClaimSeed[] = [];

    // ───────── runtime-only live wiring ─────────
    private _wiring: BehaviorWiring[] = [];
    /** Players currently in the room (movement delta baseline). */
    private _seenPlayers: Set<string> = new Set();
    private _behaviorsLive = false;
    /** The ONE beat handle — per agent, not per spec. */
    private _beatHandle?: ScheduleHandle;
    private _intention: Intention | null = null;
    private _lastBeatAt = 0;
    private _beatPending = false;

    public getIntention(): Intention | null {
      return this._intention;
    }

    public getBehaviors(): readonly BehaviorSpec[] {
      return this.behaviors;
    }

    /**
     * See the interface: one beat, on demand, through the timer's own
     * path. ⚠ Scheduled, never inline: a beat is a ROOT of its own (the
     * cadence timer's callback runs under `ScheduleApi`'s root wrapper),
     * and a caller's context — a governed `eval`, bound to a parcel —
     * must not leak into it, or the hand's read of its outfit's roster
     * dies at the sandbox boundary. The promise still resolves when the
     * beat is done, so a caller can wait on it.
     */
    public fireBeat(brainPath: string): Promise<boolean> {
      const wiring = this._wiring.find(
        (w) => w.live && w.spec.brain === brainPath
      );
      if (!wiring) return Promise.resolve(false);
      // ⭐ A candidate brain has no beat of its own — firing it means
      // running the agent's DELIBERATION, which is the honest seam: a
      // drive that could run one candidate's act directly would be
      // testing something the world never does.
      const run =
        wiring.parsed.source === 'candidate'
          ? () => this._deliberate()
          : () => this._fireCadence(wiring);
      return new Promise<boolean>((resolve) => {
        ScheduleApi.schedule(1, () => {
          run().then(
            () => resolve(true),
            () => resolve(true)
          );
        });
      });
    }

    /**
     * ⭐ **`talk` is afforded by being a Behaved host, full stop.** It
     * used to be conditional — the per-instance hook offered `talk` only
     * when the host carried an `engage`-triggered dialogue spec, so a
     * silent NPC was not addressable. That was a second record of verb
     * affordances beside this static, and the condition is the
     * controller's job anyway: `TalkController` declines diegetically
     * when there is nothing to say, exactly as a broken tool keeps
     * affording its verb and the controller declines on the capability.
     *
     * Afford statically, decline diegetically. A verb that appears and
     * disappears with authored data is a verb the client cannot reason
     * about.
     */
    static commandContributions: CommandContributions = {
      peers: ['platform/cmd/social/talk.yaml'],
    };

    // ───────── lifecycle ─────────

    public async onCreate(context?: unknown): Promise<void> {
      await super.onCreate(context);
      // Idempotent re-wire: cancel any prior wiring (CMS go-live
      // re-hydrate / re-clone) before installing fresh.
      this._teardownBehaviors();
      await this._wireBehaviors();
      await this._seedDispositions();
    }

    /**
     * Seed the host's authored `dispositions:` into the trait ledger as
     * `claim` evidence — once. Idempotent across re-clone / reboot: skips
     * if any `claim` row already exists for this host (claims persist).
     */
    private async _seedDispositions(): Promise<void> {
      const seeds = this.dispositions ?? [];
      if (!seeds.length) return;
      const host = this as unknown as Stuff;
      if (!MixinApi.isDispositioned(host)) return;
      const existing = await host.dispositionEntries();
      if (existing.some((e) => e.kind === 'claim')) return;
      await host.seedTraitClaims(seeds);
    }

    public onDestruct(): void {
      this._teardownBehaviors();
      const sup = (Base.prototype as { onDestruct?: () => void }).onDestruct;
      if (typeof sup === 'function') sup.call(this);
    }

    // ───────── wiring ─────────

    private async _wireBehaviors(): Promise<void> {
      this._behaviorsLive = true;
      // Seed the movement baseline so spawning doesn't "greet" everyone
      // already present.
      this._seenPlayers = new Set(
        this._currentPlayers().map((p) => p.stuffId)
      );
      for (const spec of this.behaviors ?? []) {
        let parsed: ParsedTrigger;
        try {
          parsed = this._parseTrigger(spec.trigger);
        } catch (e) {
          this._warn(`bad trigger '${spec.trigger}': ${asMsg(e)}`);
          continue;
        }
        // Warm the brain path (lazy reload). Unresolvable → skip the
        // spec; the NPC still runs its other behaviors.
        const warm = await StuffApi.resolveExport(spec.brain, BRAIN_EXPORT);
        if (!warm) {
          this._warn(`unresolvable brain '${spec.brain}' — skipping`);
          continue;
        }
        // ⚠ A brain wired onto a host that cannot run it is a spec that
        // does nothing, forever, with nothing anywhere to say so — the
        // same shape as the five trigger-less specs `lint:idle-cadence`
        // found. Fail at wire time like a bad trigger does.
        const needs = (warm as BrainStatics).requires?.mixins ?? [];
        const missing = needs.filter(
          (m) => !MixinApi.hasMixin(this.constructor as never, m as never)
        );
        if (missing.length) {
          this._warn(
            `brain '${spec.brain}' requires ${missing.join(', ')}, which ` +
              `this host does not compose — skipping`
          );
          continue;
        }
        const wiring: BehaviorWiring = {
          spec,
          parsed,
          state: {},
          live: true,
          // Structural pacing flag off the brain statics (default ambient).
          ambient: (warm as { ambient?: boolean }).ambient !== false,
        };
        this._wiring.push(wiring);
        if (parsed.source === 'cadence') {
          this._scheduleJittered(wiring, parsed.intervalMs);
        }
        // ⭐ A `candidate` wiring gets NO timer of its own — see below.
        // Witness wirings need no schedule — handleMessage dispatches.
      }
      // ⭐⭐ ONE beat for the whole agent, armed once, however many
      // candidates it has to choose between. This is the line that turns
      // N timers per NPC into one.
      if (this._candidates().length) this._scheduleBeat();
    }

    private _teardownBehaviors(): void {
      if (this._beatHandle) {
        ScheduleApi.cancel(this._beatHandle);
        this._beatHandle = undefined;
      }
      this._intention = null;
      for (const w of this._wiring) {
        w.live = false;
        if (w.handle) {
          ScheduleApi.cancel(w.handle);
          w.handle = undefined;
        }
      }
      this._wiring = [];
      this._behaviorsLive = false;
    }

    // ───────── cadence ─────────

    /**
     * The global ambient-chatter pacing dial: scale the authored interval
     * and clamp it up to the anti-spam floor. Ambient cadence only — a
     * functional poller (`ambient === false`) keeps its interval exact.
     * Read per re-arm (a synchronous cached lookup) so a live
     * `config`-verb change takes effect on the next beat. Defaults are
     * identity (scale 1, no floor) so an unwarmed app-settings — unit
     * tests — leaves fast cadences untouched.
     */
    private _effectiveCadence(baseMs: number, ambient: boolean): number {
      if (!ambient) return baseMs;
      let scale = 1;
      let floor = 0;
      try {
        const s = Number(
          AppApi.setting(AppSettingKeys.behaviorAmbientCadenceScale)
        );
        if (Number.isFinite(s) && s > 0) scale = s;
        const f = Number(
          AppApi.setting(AppSettingKeys.behaviorAmbientCadenceFloorMs)
        );
        if (Number.isFinite(f) && f > 0) floor = f;
      } catch {
        // app-settings unwarmed (tests) — identity pacing.
      }
      return Math.max(floor, Math.round(baseMs * scale));
    }

    private _scheduleJittered(wiring: BehaviorWiring, baseMs: number): void {
      if (!wiring.live || !this._behaviorsLive) return;
      const base = this._effectiveCadence(baseMs, wiring.ambient);
      const jitter = 1 + (Math.random() * 2 - 1) * JITTER_FRACTION;
      const delay = Math.max(1, Math.round(base * jitter));
      wiring.handle = ScheduleApi.schedule(delay, () => {
        wiring.handle = undefined;
        if (!wiring.live || !this._behaviorsLive) return;
        void this._fireCadence(wiring);
        // Re-arm with fresh jitter (per-fire, so no lockstep).
        this._scheduleJittered(wiring, baseMs);
      });
    }

    private async _fireCadence(wiring: BehaviorWiring): Promise<void> {
      const descriptor = this._resolveBrain(wiring.spec.brain);
      if (!descriptor) return;
      if (descriptor.presenceGated !== false && !this._hasAudience()) return;
      if (this._blocked(descriptor.requiresFree)) return;
      await this._runAct(descriptor, wiring, undefined, 'cadence');
    }

    // ───────── the deliberation beat ─────────

    /** The live `candidate` wirings, in declaration order. */
    private _candidates(): BehaviorWiring[] {
      return this._wiring.filter(
        (w) => w.live && w.parsed.source === 'candidate'
      );
    }

    /** One of the three beat dials, with its code default. */
    private _beatSetting(key: string, fallback: number): number {
      try {
        const v = Number(AppApi.setting(key));
        if (Number.isFinite(v) && v > 0) return v;
      } catch {
        // app-settings unwarmed (tests) — the code default.
      }
      return fallback;
    }

    /**
     * The beat period right now: the watched dial when somebody is here,
     * the nightly one when nobody is. ⭐ The ambient pacing dial still
     * applies when the agent's current intention is ambient chatter, so
     * the documented "nothing unprompted faster than the floor" budget
     * survives the move from N cadences to one beat.
     */
    private _beatPeriod(): number {
      const base = this._hasAudience()
        ? this._beatSetting(AppSettingKeys.behaviorBeatMs, DEFAULT_BEAT_MS)
        : this._beatSetting(
            AppSettingKeys.behaviorBeatNightlyMs,
            DEFAULT_BEAT_NIGHTLY_MS
          );
      const current = this._intention
        ? this._wiring.find((w) => w.spec.brain === this._intention?.brain)
        : undefined;
      return this._effectiveCadence(base, current?.ambient ?? false);
    }

    private _scheduleBeat(): void {
      if (!this._behaviorsLive) return;
      if (this._beatHandle) return;
      const base = this._beatPeriod();
      const jitter = 1 + (Math.random() * 2 - 1) * JITTER_FRACTION;
      const delay = Math.max(1, Math.round(base * jitter));
      this._beatHandle = ScheduleApi.schedule(delay, () => {
        this._beatHandle = undefined;
        if (!this._behaviorsLive) return;
        void this._deliberate().finally(() => this._scheduleBeat());
      });
    }

    public requestBeat(): void {
      if (!this._behaviorsLive || this._beatPending) return;
      if (!this._candidates().length) return;
      const gap = this._beatSetting(
        AppSettingKeys.behaviorBeatMinGapMs,
        DEFAULT_BEAT_MIN_GAP_MS
      );
      if (Date.now() - this._lastBeatAt < gap) return;
      this._beatPending = true;
      ScheduleApi.schedule(1, () => {
        this._beatPending = false;
        if (!this._behaviorsLive) return;
        void this._deliberate();
      });
    }

    public preemptFor(reason: AbortReason): boolean {
      const host = this as unknown as Stuff;
      if (!MixinApi.isEngaged(host)) return false;
      const engaged = host as Stuff & Engaged;
      const doomed = engaged
        .getEngagements()
        .filter((e) => e.interruptibleBy.has(reason));
      if (!doomed.length) return false;
      SchedulerApi.cancelByPredicate(
        engaged,
        (e) => e.interruptibleBy.has(reason),
        reason
      );
      // The intention died with its beat — say nothing; the next beat
      // decides, and a switch from nothing narrates nothing.
      if (
        this._intention &&
        doomed.some((e) => e.type === BEHAVIOR_BEAT_TYPE)
      ) {
        this._intention = null;
      }
      return true;
    }

    /**
     * ⭐⭐⭐ **One beat, one decision, one act.**
     *
     * Ask every candidate how much it wants this beat, run exactly one
     * winner, and — only when the winner CHANGES — say why out loud. The
     * prose is the brain's own `because`; there is no second string
     * anywhere, which is what keeps the 38 sentences honest.
     */
    private async _deliberate(): Promise<void> {
      if (!AppApi.isWorldOpen()) return;
      this._lastBeatAt = Date.now();
      const candidates = this._candidates();
      if (!candidates.length) return;
      const watched = this._hasAudience();

      // ⭐ Unwatched, only the brains that declare they run unwatched are
      // even CONSULTED — so an agent whose whole candidate list is ambient
      // costs one timer and nothing else while the room is empty.
      const asked: Candidate[] = [];
      for (const wiring of candidates) {
        const descriptor = this._resolveBrain(wiring.spec.brain);
        if (!descriptor) continue;
        if (descriptor.presenceGated !== false && !watched) continue;
        if (typeof descriptor.urgency !== 'function') continue;
        if (this._blocked(descriptor.requiresFree)) continue;
        const ctx = this._context(wiring, undefined, 'candidate');
        let urgency: Urgency;
        try {
          urgency = await descriptor.urgency(ctx);
        } catch (e) {
          this._warn(`brain '${wiring.spec.brain}' urgency threw: ${asMsg(e)}`);
          continue;
        }
        if (!urgency || !urgency.isCandidate()) continue;
        asked.push({
          wiring,
          descriptor,
          urgency,
          kind: descriptor.kind ?? 'filler',
        });
      }
      if (!asked.length) return;

      // ⚠ Hysteresis before declaration order: an exact tie is broken by
      // *what the agent was already doing*, never by which row came first.
      // Ordering on authored position is the defect `resolveMaker` shipped.
      const current = this._intention;
      const winner = asked.reduce((best, c) => {
        if (c.urgency.outranks(best.urgency, c.kind, best.kind)) return c;
        if (best.urgency.outranks(c.urgency, best.kind, c.kind)) return best;
        if (current?.brain === c.wiring.spec.brain) return c;
        return best;
      });

      const changed = current?.brain !== winner.wiring.spec.brain;
      if (changed) {
        // `critical` preempts; a merely higher band waits for the slot to
        // free on its own (the beat is 2.5 s, so it will).
        if (
          winner.urgency.band === 'critical' ||
          (current &&
            winner.urgency.rank() >
              URGENCY_BANDS.indexOf(current.band as never))
        ) {
          this.preemptFor('outranked');
        }
        if (watched && winner.urgency.because) {
          this._context(winner.wiring, undefined, 'candidate').emoteFree(
            winner.urgency.because
          );
        }
        this._intention = {
          brain: winner.wiring.spec.brain,
          band: winner.urgency.band,
          because: winner.urgency.because,
          since: Date.now(),
        };
      }

      if (
        winner.descriptor.claims?.length &&
        MixinApi.isEngaged(this as unknown as Stuff)
      ) {
        this._startBeat(
          winner.descriptor.claims,
          winner.descriptor.interruptibleBy
        );
      }
      await this._runAct(
        winner.descriptor,
        winner.wiring,
        undefined,
        'candidate'
      );
    }

    // ───────── witness (perception) ─────────

    protected handleMessage(frame: MessageFrame): void {
      const sup = (
        Base.prototype as { handleMessage?: (f: MessageFrame) => void }
      ).handleMessage;
      if (typeof sup === 'function') sup.call(this, frame);
      if (!this._behaviorsLive) return;
      // ⭐ Early wake. A `critical` candidate can only BECOME critical
      // because of something the host perceived or something on a clock it
      // already reads — so a fight or a voice in the room is exactly when
      // re-deciding is worth it. Debounced inside `requestBeat`.
      const topicRaw = frame.topic ?? '';
      if (topicRaw.startsWith('act.combat') || topicRaw.startsWith('speech.')) {
        this.requestBeat();
      }
      const witnesses = this._wiring.filter(
        (w) => w.live && w.parsed.source === 'witness'
      );
      if (!witnesses.length) return;
      const topic = frame.topic ?? '';

      // Movement → arrival/departure via room-occupant delta.
      if (topic.startsWith(WITNESS_TOPIC.arrival)) {
        this._dispatchMovement(witnesses, frame);
        return;
      }

      // Emote / speech → recover the acting subject from the act registry.
      const selfId = (this as unknown as Stuff).stuffId;
      for (const w of witnesses) {
        const kind = (w.parsed as { kind: WitnessKind }).kind;
        if (kind !== 'emote' && kind !== 'speech') continue;
        if (!topic.startsWith(WITNESS_TOPIC[kind])) continue;
        const subject = this._recoverSubject(frame);
        if (!subject || subject.stuffId === selfId) continue;
        const descriptor = this._resolveBrain(w.spec.brain);
        if (!descriptor) continue;
        void this._runAct(descriptor, w, { frame, subject }, 'witness');
      }
    }

    private _dispatchMovement(
      witnesses: BehaviorWiring[],
      frame: MessageFrame
    ): void {
      const arrivals = witnesses.filter(
        (w) => (w.parsed as { kind: WitnessKind }).kind === 'arrival'
      );
      const departures = witnesses.filter(
        (w) => (w.parsed as { kind: WitnessKind }).kind === 'departure'
      );
      if (!arrivals.length && !departures.length) return;

      const current = this._currentPlayers();
      const currentIds = new Set(current.map((p) => p.stuffId));

      if (arrivals.length) {
        for (const p of current) {
          if (this._seenPlayers.has(p.stuffId)) continue;
          for (const w of arrivals) {
            const d = this._resolveBrain(w.spec.brain);
            if (d) {
              void this._runAct(d, w, { frame, subject: p }, 'witness');
            }
          }
        }
      }
      if (departures.length) {
        for (const id of this._seenPlayers) {
          if (currentIds.has(id)) continue;
          const subject = StuffApi.findById(id);
          for (const w of departures) {
            const d = this._resolveBrain(w.spec.brain);
            if (d) {
              void this._runAct(
                d,
                w,
                subject ? { frame, subject } : { frame },
                'witness'
              );
            }
          }
        }
      }
      this._seenPlayers = currentIds;
    }

    private _recoverSubject(frame: MessageFrame): Stuff | undefined {
      const commandId = frame.meta?.commandId;
      if (!commandId) return undefined;
      const info = ReactionApi.actInfo(commandId);
      if (!info) return undefined;
      return StuffApi.findById(info.subjectId);
    }

    // ───────── shared fire path ─────────

    private async _runAct(
      descriptor: BrainStatics,
      wiring: BehaviorWiring,
      perceived: BrainContext['perceived'],
      source: 'cadence' | 'witness' | 'candidate'
    ): Promise<void> {
      // ⭐ The cast holds still while the world is closed. Brains are
      // wired at `onCreate` — the host must exist before it can
      // behave — but their schedules are REAL-TIME, so without this they
      // start acting minutes before the subsystems they act THROUGH are
      // booted, and their failing beats starve the boot that would fix
      // them (`AppApi.isWorldOpen`). One check, at the single point
      // cadence and witness both come through.
      if (!AppApi.isWorldOpen()) return;
      // A witnessing brain that claims slots holds them briefly so a
      // concurrently-running cadence brain (requiresFree) yields.
      if (
        source === 'witness' &&
        descriptor.claims &&
        descriptor.claims.length &&
        MixinApi.isEngaged(this as unknown as Stuff)
      ) {
        this._startBeat(descriptor.claims, descriptor.interruptibleBy);
      }
      const ctx = this._context(wiring, perceived, source);
      try {
        await descriptor.act(ctx);
      } catch (e) {
        this._warn(`brain '${wiring.spec.brain}' threw: ${asMsg(e)}`);
      }
    }

    /**
     * Assemble the `BrainContext` for one wiring — shared by `_runAct`
     * and the deliberation beat, because ⭐ **a brain must be asked how
     * much it wants the beat through exactly the context it will act in.**
     * Two builders would let `urgency` read a world `act` cannot.
     */
    private _context(
      wiring: BehaviorWiring,
      perceived: BrainContext['perceived'],
      source: 'cadence' | 'witness' | 'candidate'
    ): BrainContext {
      const host = this as unknown as Stuff;
      return {
        host,
        config: wiring.spec.config ?? {},
        state: wiring.state,
        perceived,
        trigger: { source, raw: wiring.spec.trigger },
        say: (text, target) => {
          if (MixinApi.isVocal(host)) host.say(text, target);
        },
        emote: async (verb, target) => {
          if (!MixinApi.isSoul(host)) return;
          const e = await SoulApi.resolve(verb);
          if (e) host.emote(e, target ? { target } : undefined);
        },
        /*
         * ⭐⭐ **A beast has no soul, and it still makes a noise.**
         *
         * This read `if (MixinApi.isSoul(host)) host.emoteFree(...)` and
         * no-op'd otherwise — which was invisible while every brained
         * thing in the game was a `Character`. The base-class narrowing
         * put the wolf, the draft horse and the pit pony on `Beast`,
         * which composes no `Soul`, and all three of their idle pools
         * are `kind: free` (`idles.ts:41` routes them here). Without
         * this branch **every idle beat in three rows goes silent the
         * day the animal rung lands** — no error, no log, just a horse
         * that never shifts its foot again. The fail-closed-and-silent
         * class, arriving through a mixin nobody thought about.
         *
         * ⭐ And the fallback is the MORE honest render, not a
         * consolation. `Soul.emoteFree` sends on `emotive-esp`
         * (`Soul.ts:302`), so today a horse shifting its weight is an
         * ESP frame that an implantless bystander drops on the floor. A
         * deed peers can SEE is what a horse actually does, and it is
         * the exact shape the pet brains already use
         * (`follows.ts:64-67`).
         */
        emoteFree: (text, target) => {
          if (MixinApi.isSoul(host)) {
            host.emoteFree(text, target);
            return;
          }
          MessageApi.scene(host)
            .topic('act.deed')
            .toPeers(Mml.compose`${Mml.actor(host)} ${text}`)
            .send();
        },
      };
    }

    private _resolveBrain(path: string): BrainStatics | null {
      const exp = StuffApi.resolveExportSync(path, BRAIN_EXPORT);
      return (exp as BrainStatics | null) ?? null;
    }

    /**
     * Parse a spec's `trigger` string into a cadence or witness selector.
     * Throws on an unrecognized form so a malformed spec fails loudly at
     * wire time. (State conditions are guards in brain code, never a
     * trigger source.)
     */
    private _parseTrigger(raw: string): ParsedTrigger {
      const m = /^cadence:(\d+)(ms|s|m)?$/.exec(raw.trim());
      if (m) {
        const n = Number(m[1]);
        const unit = m[2] ?? 's';
        const mult = unit === 'ms' ? 1 : unit === 'm' ? 60_000 : 1_000;
        return { source: 'cadence', intervalMs: n * mult };
      }
      const trimmed = raw.trim();
      // The dialogue-responder sentinel: wires nothing (no timer, no
      // witness dispatch). The spec exists to surface the tree to the
      // `talk` controller, warm the brain at wire time, and mark the host
      // conversational. The brain is reached only via `open`.
      if (trimmed === 'engage') return { source: 'engage' };
      // ⭐ `candidate` wires no timer. The brain joins the host's ONE
      // deliberation beat and is asked `urgency(ctx)` each time it runs,
      // so pacing stops being the row's business and becomes the agent's.
      if (trimmed === 'candidate') return { source: 'candidate' };
      const kind = trimmed as WitnessKind;
      if (kind in WITNESS_TOPIC) return { source: 'witness', kind };
      throw new Error(
        `unrecognized trigger '${raw}' (expected 'cadence:<N>[ms|s|m]', ` +
          `'candidate', 'engage', or one of ` +
          `${Object.keys(WITNESS_TOPIC).join('/')})`
      );
    }

    private _startBeat(
      slots: readonly EngagementSlot[],
      interruptibleBy?: readonly AbortReason[],
      durationMs: number = BEAT_MS
    ): void {
      const host = this as unknown as Stuff & Engaged;
      // StartResult on conflict is a no-op return (no throw) — a beat
      // that can't claim simply doesn't.
      SchedulerApi.start(
        new BehaviorBeat(host, slots, durationMs, interruptibleBy)
      );
    }

    // ───────── slot / presence helpers ─────────

    private _blocked(requiresFree?: readonly EngagementSlot[]): boolean {
      if (!requiresFree || !requiresFree.length) return false;
      if (!MixinApi.isEngaged(this as unknown as Stuff)) return false;
      const host = this as unknown as Stuff & Engaged;
      return requiresFree.some(
        (slot) => host.getEngagementBySlot(slot) !== undefined
      );
    }

    private _room(): (Stuff & Container) | null {
      const get = (this as unknown as Partial<Containable>).getContainer;
      return typeof get === 'function' ? (get.call(this) ?? null) : null;
    }

    /** Room occupants that look like players (Sensor, not an NPC/Behaved). */
    private _currentPlayers(): (Stuff & Containable)[] {
      const room = this._room();
      if (!room) return [];
      const selfId = (this as unknown as Stuff).stuffId;
      return room.getContents().filter(
        (c) =>
          c.stuffId !== selfId &&
          MixinApi.isSensor(c) &&
          !MixinApi.hasMixin(c, Mixins.Behaved)
      );
    }

    private _hasAudience(): boolean {
      return this._currentPlayers().length > 0;
    }

    private _warn(msg: string): void {
      const host = this as unknown as Stuff & {
        getPresentation?: () => string;
      };
      let who = host.stuffId;
      try {
        who = host.getPresentation?.() ?? host.stuffId;
      } catch {
        // getPresentation may not be composable on a generic base.
      }
      // eslint-disable-next-line no-console -- behavior wiring diagnostics
      console.warn(`[Behaved:${who}] ${msg}`);
    }
  }
  return BehavedMixin;
}

function asMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
