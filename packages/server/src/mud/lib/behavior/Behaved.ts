/**
 * BehavedMixin — the automation layer behind authored (non-player)
 * Stuff. The **first real consumer** of the shipped-but-inert activity
 * substrate (see activity.md).
 *
 * A host carries a declarative `behaviors:` data list — each entry a
 * `{ brain, trigger, config }` spec. At spawn (`postRegister`) the mixin
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
 * runtime-only; `postRegister` re-installs it from the persisted
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

import type { MessageFrame } from '@saxonberg/types';
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
import { TraitApi, type ClaimSeed } from '../../api/trait';
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
import { BehaviorBeat } from './BehaviorBeat';

/** ± jitter applied to every cadence interval (anti-lockstep). */
const JITTER_FRACTION = 0.25;
/** How long a witness brain's slot `claims` are held (ms). */
const BEAT_MS = 2500;

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
     * once at spawn (`postRegister`) so derive-on-read yields the host's
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

    public getBehaviors(): readonly BehaviorSpec[] {
      return this.behaviors;
    }

    /**
     * Per-instance dynamic command contributions, merged with the static
     * `commandContributions` by the containment-delta machinery (the
     * `InstanceContributor` seam). A Behaved host affords `talk` to
     * nearby givers **exactly when** it carries an `engage`-triggered
     * (dialogue-responder) spec — so a conversational NPC is
     * discoverable and a silent one is not, with no subclass and no
     * manual push/pop. Reads the persisted `behaviors:` (hydrated before
     * placement, so it is live at containment-delta time), independent of
     * brain wiring. The framework's pop-on-departure / reset-on-move
     * handles teardown; adding/removing a tree on an already-placed host
     * settles on its next (re)placement.
     */
    public getInstanceContributions(): CommandContributions {
      // Merge any inner contributor's buckets (CasterMixin sits under
      // this on the NPC chain) — a shadowing implementation must not
      // silently drop a sibling seam's affordances.
      const inner =
        (
          Base.prototype as {
            getInstanceContributions?: () => CommandContributions;
          }
        ).getInstanceContributions?.call(this) ?? {};
      const conversational = (this.behaviors ?? []).some(
        (s) => s.trigger === 'engage'
      );
      if (!conversational) return inner;
      // `talk` reaches whoever shares the room with this NPC — one
      // bucket now, since `peers` is the sideways one. (It was listed on
      // both `environment` and `peers` before the rename, which were two
      // names for the same sibling fan-out.)
      return {
        ...inner,
        peers: [...(inner.peers ?? []), 'social/talk.yaml'],
      };
    }

    // ───────── lifecycle ─────────

    public async postRegister(context?: unknown): Promise<void> {
      const sup = (
        Base.prototype as {
          postRegister?: (c?: unknown) => unknown | Promise<unknown>;
        }
      ).postRegister;
      if (typeof sup === 'function') await sup.call(this, context);
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
      const existing = await TraitApi.entriesFor(host);
      if (existing.some((e) => e.kind === 'claim')) return;
      await TraitApi.seedClaims(host, seeds);
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
        // Witness wirings need no schedule — handleMessage dispatches.
      }
    }

    private _teardownBehaviors(): void {
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

    // ───────── witness (perception) ─────────

    protected handleMessage(frame: MessageFrame): void {
      const sup = (
        Base.prototype as { handleMessage?: (f: MessageFrame) => void }
      ).handleMessage;
      if (typeof sup === 'function') sup.call(this, frame);
      if (!this._behaviorsLive) return;
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
      source: 'cadence' | 'witness'
    ): Promise<void> {
      // A witnessing brain that claims slots holds them briefly so a
      // concurrently-running cadence brain (requiresFree) yields.
      if (
        source === 'witness' &&
        descriptor.claims &&
        descriptor.claims.length &&
        MixinApi.isEngaged(this as unknown as Stuff)
      ) {
        this._startBeat(descriptor.claims);
      }
      const host = this as unknown as Stuff;
      const ctx: BrainContext = {
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
        emoteFree: (text, target) => {
          if (MixinApi.isSoul(host)) host.emoteFree(text, target);
        },
      };
      try {
        await descriptor.act(ctx);
      } catch (e) {
        this._warn(`brain '${wiring.spec.brain}' threw: ${asMsg(e)}`);
      }
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
      const kind = trimmed as WitnessKind;
      if (kind in WITNESS_TOPIC) return { source: 'witness', kind };
      throw new Error(
        `unrecognized trigger '${raw}' (expected 'cadence:<N>[ms|s|m]', ` +
          `'engage', or one of ${Object.keys(WITNESS_TOPIC).join('/')})`
      );
    }

    private _startBeat(slots: readonly EngagementSlot[]): void {
      const host = this as unknown as Stuff & Engaged;
      // StartResult on conflict is a no-op return (no throw) — a beat
      // that can't claim simply doesn't.
      SchedulerApi.start(new BehaviorBeat(host, slots, BEAT_MS));
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
