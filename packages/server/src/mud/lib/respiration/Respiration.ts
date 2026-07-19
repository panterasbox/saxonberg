/**
 * RespirationMixin — the body's air-exchange driver and the acute crisis
 * when exchange stops (asphyxiation: drowning, vacuum). It is the vitals
 * driver that finally **drives `spo2`** — a live, banded vital sign that
 * already gates consciousness but had no driver, exactly as
 * `coreTemperature` waits on thermal.
 *
 * Unlike the lazy reconcile-on-read drivers (metabolism, thermal),
 * respiration is an **event-triggered scheduled-engagement crisis
 * driver**: benign ambient runs *nothing* (no scheduler, no `spo2`
 * movement, zero reconcile — the idle case is provably zero-cost); a
 * hostile-medium event engages one bounded, cancellable
 * `RespirationDrain` that self-terminates the instant air exchange
 * resumes (cancel + a brief `RespirationRecovery`).
 *
 * **Compose, don't absorb.** Respiration owns only no-oxygen → `spo2`.
 * Cold → thermal; pressure → the deferred shared layer; toxin →
 * metabolism's toxin-burden; opacity → perception. It does NOT read
 * `spo2Throttle` (that is metabolism's read of the now-driven sign).
 *
 * **Plumbing, not anatomy.** It reads channel-state (exchanging or not),
 * never orifices. No modeled lung/throat part; the `respires` opt-out on
 * the body plan opts a body out entirely.
 *
 * Mirrors two merged precedents — `MetabolicMixin` for the death seam,
 * the cascade-spawns-conditions pattern, the `*_DEFAULTS` const-object,
 * the host-intersection cast, the linkdead/far-past presence freeze, and
 * the `*NowSeconds()` world-clock-presence guard; and the activity
 * framework for the bounded crisis drain.
 *
 * Operational reference (graduated at sweep):
 * `docs/subsystems/respiration.md`.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { Quantity } from '../quantity';
import type { Vitals } from '../vitals/Vitals';
import type { Organism } from '../species/Organism';
import type { Engaged } from '../activity/Engaged';
import type Exit from '../boundary/Exit';
import type { AfflictionRecord } from '../vitals/Condition';
import type { BulkSlot } from '../bulk/Bulkable';
import { MixinApi } from '../../api/mixin';
import { SchedulerApi } from '../../api/scheduler';
import { BiomeApi } from '../../api/biome';
import { WorldClockApi } from '../../api/worldclock';
import { StuffApi } from '../../api/stuff';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import { TemplatePaths } from '../paths';
import type { CommandContributions } from '../../api/command';
import type { RespirationCause } from './RespirationDrain';
import { RespirationDrain, RespirationRecovery } from './RespirationDrain';

/**
 * Every respiration dial as a module const-object (the
 * `METABOLIC_DEFAULTS` precedent). All magnitudes are defensible
 * playtest defaults — the structure is the deliverable, the rates are
 * tuned. Times are GAME-seconds; `*_PER_SEC` are `%`-points per
 * game-second. **Rates are playtest-tuned, not plan decisions.**
 */
export const RESPIRATION_DEFAULTS = {
  /** Game-ms per drain/recovery emission tick (→ `WorldClockApi.every`). */
  EMISSION_INTERVAL_MS: 2000,
  /**
   * `spo2` drain rate per game-second by cause. Vacuum-vs-water tuning
   * (a per-medium split) would live here later; v1 keys by cause.
   */
  DRAIN_PER_SEC_BY_CAUSE: {
    medium: 1.5,
    supply: 1.5,
    channel: 2.0,
  } as Record<RespirationCause, number>,
  /** Automatic breath-hold grace on first submersion (game-seconds). */
  UNPREPARED_GRACE_SEC: 15,
  /** Voluntary breath-hold extension set by `inhale` (game-seconds). */
  INHALE_HOLD_SEC: 45,
  /** `spo2` recovery rate per game-second on return to breathable air. */
  RECOVER_PER_SEC: 4.0,
  /** Lethal floor: dwell at/below this `spo2` accrues toward death. */
  ANOXIA_FLOOR_PCT: 5,
  /** Dwell at/below the floor before the death seam fires (game-seconds). */
  ANOXIA_LETHAL_SEC: 30,
  /** Far-past guard (reuse metabolism's 4h) — a gap this long = absence. */
  MAX_REASONABLE_GAP_SEC: 4 * 3600,
  /** W2: litres of air a worn tank yields per game-second under supply. */
  TANK_TAP_PER_SEC: 0.5,
  /** Cause-of-death string by cause (the death seam's `causeOfDeath`). */
  DEATH_CAUSE_BY_CAUSE: {
    medium: 'asphyxiation',
    supply: 'asphyxiation',
    channel: 'strangulation',
  } as Record<RespirationCause, string>,
};

/** Numeric AppSetting read, falling back to the seeded literal (test-safe). */
function respirationDial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/**
 * The inner-mixin surface a respiring body composes over — the host cast
 * idiom (the `MetabolicHost` precedent). The `Engaged` / `Mobile` /
 * `Sensor` / `HasInteractive` surfaces are Character-tier / optional, so
 * they are runtime-narrowed (`MixinApi.isEngaged` / `isMobile` / …) where
 * used, NOT folded into the host type.
 */
type RespirationHost = Stuff & Vitals & Organism;

export interface Respiration {
  /** Game-time (seconds) of the last drain/recovery tick; 0 = unseeded. */
  respirationClockStamp: number;
  setRespirationClockStamp(value: number): void;

  /** The species breathable set (default `['air']`; water-breaters `['water']`). */
  getBreathableMedia(): readonly string[];
  /** Whether this body respires at all (the `respires` opt-out). */
  isRespiring(): boolean;
  /** Whether a voluntary/automatic breath-hold is currently active. */
  isHoldingBreath(): boolean;

  /** The central event-driven re-resolve: engage/cancel the crisis drain. */
  reassess(): Promise<void>;
  /** The traverse hook (the `Mobile.onTraversed` shape) — fires `reassess` on every move. */
  onTraversed(via: Exit): void;

  /** Emission body of the drain engagement (delegated from `RespirationDrain`). */
  respirationDrainTick(drain: RespirationDrain): void;
  /** Emission body of the recovery engagement. */
  respirationRecoverTick(recovery: RespirationRecovery): void;

  /** Take and hold a breath — extend the breath-hold grace (free-diving). */
  inhale(): void;
  /** Let the held breath out — clear the grace. */
  exhale(): void;
}

export function RespirationMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class RespirationMixin extends Base implements Respiration {
    static _mixinName = 'RespirationMixin';

    static persistentFields = ['respirationClockStamp'];

    /**
     * Contextual affordances — surface `inhale` / `exhale` on the self
     * affordance surface (the `EngagedMixin.commandContributions`
     * precedent) so the water's edge offers them.
     */
    static commandContributions: CommandContributions = {
      self: ['posture/inhale.yaml', 'posture/exhale.yaml'],
      environment: [],
      inventory: [],
      peers: [],
    };

    /**
     * The only persisted field — the drain's elapsed anchor.
     * @runtimeState
     */
    public respirationClockStamp = 0;

    /**
     * Runtime-only: the `inhale` grace deadline (game-seconds). Not
     * persisted — a reloaded body isn't mid-hold. TypeScript `private`
     * (not `#`): mixin instance state lives on the proxy target.
     */
    private _heldBreathUntil: number | null = null;

    /** Runtime debounce for the one-shot blackout cue. */
    private _blackoutCued = false;

    /** Runtime debounce for the one-shot drain-begin cue. */
    private _drainCued = false;

    public setRespirationClockStamp(value: number): void {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        throw new RangeError(
          `RespirationMixin.setRespirationClockStamp: must be a finite ` +
            `number >= 0, got ${String(value)}`,
        );
      }
      this.respirationClockStamp = value;
    }

    /* ──────────────────── species config reads ──────────────────── */

    public getBreathableMedia(): readonly string[] {
      const self = this as unknown as Stuff;
      if (!MixinApi.isOrganism(self)) return ['air'];
      return self.getSpecies()?.getBodyPlan()?.getBreathableMedia() ?? ['air'];
    }

    public isRespiring(): boolean {
      const self = this as unknown as Stuff;
      if (!MixinApi.isOrganism(self)) return true;
      return self.getSpecies()?.getBodyPlan()?.isRespiring() ?? true;
    }

    /* ──────────────────── medium / supply resolution ──────────────────── */

    /**
     * The surrounding-medium tag. While swimming you are *in* the medium
     * you swim through (the engaged-mode `medium` wins); otherwise the
     * atmosphere resolved outward from the body's containment chain.
     */
    private async resolveCurrentMedium(): Promise<string> {
      const self = this as unknown as Stuff;
      if (MixinApi.isMobile(self)) {
        const m = self.getEngagedMode()?.getMedium();
        if (m) return m;
      }
      // Not placed in a container → no environment to threaten it. A body
      // is both Containable (it has a container) and a Container (the scope
      // the atmosphere chain walks outward from) — narrow to both.
      if (!MixinApi.isContainable(self) || !self.getContainer()) return 'air';
      if (!MixinApi.isContainer(self)) return 'air';
      return BiomeApi.resolveAtmosphereFor(self);
    }

    /**
     * Whether a worn air supply is present and whether it still has air.
     * `'available'` (a tank with air — the drain taps it and pins spo2),
     * `'present-empty'` (a worn tank, but dry → the supply-exhausted
     * crisis), `'none'` (no carried supply → the medium crisis).
     */
    private currentSupply(): 'available' | 'present-empty' | 'none' {
      const slot = this.findWornAirSupply();
      if (!slot) return 'none';
      return slot.available() > 0 ? 'available' : 'present-empty';
    }

    /**
     * The body's worn air supply, if any — a worn `Bulkable` whose
     * interior material is a medium this body breathes (an air tank for
     * an air-breather). Walks the body's occupied slots (worn gear lands
     * in the body-plan slots). Returns the interior `BulkSlot` or `null`.
     */
    private findWornAirSupply(): BulkSlot | null {
      const self = this as unknown as Stuff;
      if (!MixinApi.isSlotted(self)) return null;
      const media = new Set(this.getBreathableMedia());
      for (const occupants of self.getAllOccupants().values()) {
        for (const occ of occupants) {
          if (!MixinApi.isBulkable(occ)) continue;
          const name = occ.getBulkMaterial('interior')?.getName();
          if (name && media.has(name)) return occ.getBulk('interior');
        }
      }
      return null;
    }

    /**
     * The three-trigger resolver. Exchanging iff the current medium is in
     * this body's breathable set; else a worn air supply may cover it
     * (W2); else not exchanging, with the cause that fits.
     */
    private async assessExchange(): Promise<{
      exchanging: boolean;
      cause: RespirationCause | null;
    }> {
      const medium = await this.resolveCurrentMedium();
      const set = this.getBreathableMedia();
      if (set.includes(medium)) return { exchanging: true, cause: null };

      // Medium not in this body's set. Confirm it is a *known* atmosphere
      // (`breathableOf` throws on unknown) — an unmodeled medium raises no
      // crisis. This is the engine's read of the biome breathable column.
      let known = true;
      try {
        BiomeApi.breathableOf(medium);
      } catch {
        known = false;
      }
      if (!known) return { exchanging: true, cause: null };

      // Known hostile medium for this body. A worn tank (with or without
      // air) makes this a 'supply' situation: the drain runs either way —
      // the tick taps the tank while it has air (pinning spo2), then drops
      // spo2 once it runs dry. No carried tank → the bare 'medium' crisis.
      const supply = this.currentSupply();
      if (supply === 'none') return { exchanging: false, cause: 'medium' };
      return { exchanging: false, cause: 'supply' };
    }

    /* ──────────────────── the central re-resolve ──────────────────── */

    /**
     * Fold the current medium's inhaled contaminant (if any) into the body's
     * metabolism toxin burden — the biome `contaminant` seam's first consumer.
     * No-op for a clean medium or a non-Metabolic body. Bounded: one
     * increment per reassess, cleared over time by the toxin's `Condition`.
     */
    private async applyMediumContaminant(): Promise<void> {
      const self = this as unknown as Stuff;
      if (!MixinApi.isMetabolic(self)) return;
      let contaminant: string | null = null;
      try {
        const medium = await this.resolveCurrentMedium();
        contaminant = BiomeApi.contaminantOf(medium);
      } catch {
        return;
      }
      if (!contaminant) return;
      const perBreath = respirationDial(
        AppSettingKeys.respirationContaminantBurdenPerBreath,
        5,
      );
      self.addToxinBurden(contaminant, perBreath);
    }

    public async reassess(): Promise<void> {
      const self = this as unknown as Stuff;

      // Constructs never engage; a corpse never drowns again — tear down
      // any active engagement in both cases.
      const dead =
        MixinApi.isOrganism(self) && self.getLifecycleState() === 'dead';
      if (!this.isRespiring() || dead) {
        if (MixinApi.isEngaged(self)) {
          SchedulerApi.cancelByType(self, 'respiration-drain');
          SchedulerApi.cancelByType(self, 'respiration-recovery');
        }
        return;
      }

      // A body without an engagement slot (a bare non-Character Creature,
      // Risk #4) resolves the medium but holds no scheduled drain. Past
      // the guard the host is Engaged; it is also this Respiration mixin's
      // host, so the engagement constructors take it directly.
      if (!MixinApi.isEngaged(self)) return;
      const engaged: Stuff & Engaged & Respiration = self as Stuff &
        Engaged &
        Respiration;

      // The drain/recovery occupy the `'body'` slot. We cancel our own
      // sibling (synchronously, below) before starting, so the slot is
      // free for our `start` — respiration is the only `'body'`-slot
      // producer today. When another lands, it must declare itself
      // `replaceableBy` respiration (or this start would no-op on
      // conflict, silently suppressing the crisis).
      const { exchanging, cause } = await this.assessExchange();
      // Inhaled-contaminant fold (the fire driver's first consumer of the
      // biome `contaminant` seam): a body breathing a contaminated medium
      // (smoke → carbon monoxide) takes on the toxin as a metabolism burden,
      // whether or not it can still exchange O₂. An enclosed fire poisons as
      // well as smothers.
      await this.applyMediumContaminant();
      const drain = engaged.getEngagementByType('respiration-drain');
      const recovery = engaged.getEngagementByType('respiration-recovery');

      if (exchanging) {
        if (drain) SchedulerApi.cancelByType(engaged, 'respiration-drain');
        if (!recovery) {
          const host = this as unknown as RespirationHost;
          const baseline = host.getVitalBand('spo2').baseline;
          const spo2 = host.getVitalSign('spo2').rawValue();
          if (spo2 < baseline) {
            this.seedClock();
            SchedulerApi.start(new RespirationRecovery(engaged));
          }
        }
        return;
      }

      // Not exchanging.
      if (recovery) SchedulerApi.cancelByType(engaged, 'respiration-recovery');
      if (!drain) {
        this.armDrain();
        SchedulerApi.start(new RespirationDrain(engaged, cause ?? 'medium'));
      }
    }

    public onTraversed(via: Exit): void {
      void via;
      // Fire-and-forget — the move reassess seam (#7, Risk #1).
      void this.reassess();
    }

    /* ──────────────────── engagement tick bodies ──────────────────── */

    public respirationDrainTick(drain: RespirationDrain): void {
      const self = this as unknown as Stuff;
      const host = this as unknown as RespirationHost;
      const nowS = this.respirationNowSeconds();
      if (nowS === null) return;
      if (this.respirationClockStamp === 0) {
        this.respirationClockStamp = nowS;
        return;
      }
      // Linkdead freeze (the metabolism guard verbatim).
      if (MixinApi.isHasInteractive(self) && self.isLinkdead()) {
        this.respirationClockStamp = nowS;
        return;
      }
      const elapsed = nowS - this.respirationClockStamp;
      if (elapsed <= 0) {
        this.respirationClockStamp = nowS;
        return;
      }
      if (elapsed > RESPIRATION_DEFAULTS.MAX_REASONABLE_GAP_SEC) {
        this.respirationClockStamp = nowS;
        return;
      }
      this.respirationClockStamp = nowS;

      if (!this._drainCued) {
        this._drainCued = true;
        this.cueDrainBegin();
      }

      // Held-breath grace burns first — no `spo2` drop while holding.
      if (this._heldBreathUntil !== null && nowS < this._heldBreathUntil) {
        void this.reassess();
        return;
      }

      // Carried-supply tap (W2): a worn air tank with air left holds spo2
      // steady, depleting at the tap rate. When it runs dry this branch
      // falls through to the spo2 drop — the supply-exhausted crisis.
      if (drain.cause === 'supply') {
        const tank = this.findWornAirSupply();
        if (tank && tank.available() > 0) {
          const tap = RESPIRATION_DEFAULTS.TANK_TAP_PER_SEC * elapsed;
          tank.debit(Math.min(tank.available(), tap));
          void this.reassess();
          return;
        }
      }

      const drainPerSec = RESPIRATION_DEFAULTS.DRAIN_PER_SEC_BY_CAUSE[drain.cause];
      const cur = host.getVitalSign('spo2').rawValue();
      const next = Math.max(0, cur - drainPerSec * elapsed);
      host.setVitalSign('spo2', Quantity.of(next, '%'));

      const survivableMin = host.getVitalBand('spo2').survivableMin;
      if (next <= survivableMin && !this._blackoutCued) {
        this._blackoutCued = true;
        this._heldBreathUntil = null; // a blackout force-ends any hold
        this.cueBlackout();
      }

      const died = this.reconcileAnoxiaCascade(elapsed, drain.cause);
      if (died) {
        SchedulerApi.cancel(drain, 'preconditions-changed');
        return;
      }

      // Re-resolve so a resurface / tank-refill ends the crisis even with
      // no traverse event (the in-place trigger, Risk #1).
      void this.reassess();
    }

    public respirationRecoverTick(recovery: RespirationRecovery): void {
      const self = this as unknown as Stuff;
      const host = this as unknown as RespirationHost;
      const nowS = this.respirationNowSeconds();
      if (nowS === null) return;
      if (this.respirationClockStamp === 0) {
        this.respirationClockStamp = nowS;
        return;
      }
      if (MixinApi.isHasInteractive(self) && self.isLinkdead()) {
        this.respirationClockStamp = nowS;
        return;
      }
      const elapsed = nowS - this.respirationClockStamp;
      if (elapsed <= 0) {
        this.respirationClockStamp = nowS;
        return;
      }
      if (elapsed > RESPIRATION_DEFAULTS.MAX_REASONABLE_GAP_SEC) {
        this.respirationClockStamp = nowS;
        return;
      }
      this.respirationClockStamp = nowS;

      const baseline = host.getVitalBand('spo2').baseline;
      const survivableMin = host.getVitalBand('spo2').survivableMin;
      const cur = host.getVitalSign('spo2').rawValue();
      const next = Math.min(
        baseline,
        cur + RESPIRATION_DEFAULTS.RECOVER_PER_SEC * elapsed,
      );
      host.setVitalSign('spo2', Quantity.of(next, '%'));

      // Clear the asphyxiation affliction once back above the floor.
      const existing = this.findAffliction(TemplatePaths.respirationAsphyxiation);
      if (existing && next > RESPIRATION_DEFAULTS.ANOXIA_FLOOR_PCT) {
        host.relieve(existing);
      }

      // Regained consciousness → gasp cue, once.
      if (this._blackoutCued && next > survivableMin) {
        this._blackoutCued = false;
        this.cueRecover();
      }

      // Re-pin at baseline and self-cancel (benign steady state = nothing).
      if (next >= baseline) {
        SchedulerApi.cancel(recovery, 'preconditions-changed');
      }
    }

    /* ──────────────────── the death cascade ──────────────────── */

    /**
     * Mirror `MetabolicMixin.reconcileCascade` for the single anoxia
     * affliction: while `spo2` dwells at/below the lethal floor, accrue
     * dwell-time on the `asphyxiation` affliction and fire the death seam
     * when it exceeds the lethal dwell; clear it on recovery above the
     * floor. Returns whether death fired this tick.
     */
    protected reconcileAnoxiaCascade(
      elapsedSec: number,
      cause: RespirationCause,
    ): boolean {
      const host = this as unknown as RespirationHost;
      const path = TemplatePaths.respirationAsphyxiation;
      const spo2 = host.getVitalSign('spo2').rawValue();
      const existing = this.findAffliction(path);

      if (spo2 <= RESPIRATION_DEFAULTS.ANOXIA_FLOOR_PCT) {
        let record = existing;
        if (!record) {
          record = { kind: 'affliction', templatePath: path, stage: 0, elapsed: 0 };
          host.afflict(record);
        }
        record.elapsed += elapsedSec;
        if (record.elapsed >= RESPIRATION_DEFAULTS.ANOXIA_LETHAL_SEC) {
          this.applyDeath(RESPIRATION_DEFAULTS.DEATH_CAUSE_BY_CAUSE[cause]);
          return true;
        }
      } else if (existing) {
        host.relieve(existing);
      }
      return false;
    }

    /** Flip the death seam: cause-of-death + lifecycle, once. */
    protected applyDeath(cause: string): void {
      const host = this as unknown as RespirationHost;
      if (host.getLifecycleState() === 'dead') return;
      host.setCauseOfDeath(cause);
      host.setLifecycleState('dead');
    }

    protected findAffliction(path: string): AfflictionRecord | null {
      const host = this as unknown as RespirationHost;
      for (const c of host.getConditions()) {
        if (c.kind === 'affliction' && c.templatePath === path) return c;
      }
      return null;
    }

    /**
     * In-session game-time (seconds), or `null` when no world clock runs
     * (pre-boot, or a unit test that hasn't bootstrapped one) — the
     * metabolism presence guard verbatim, so unit tests stay idle.
     */
    protected respirationNowSeconds(): number | null {
      if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
        return null;
      }
      return WorldClockApi.getNow().rawValue();
    }

    /* ──────────────────── voluntary breath control ──────────────────── */

    public inhale(): void {
      const nowS = this.respirationNowSeconds();
      const base = nowS ?? 0;
      this._heldBreathUntil = base + RESPIRATION_DEFAULTS.INHALE_HOLD_SEC;
    }

    public exhale(): void {
      this._heldBreathUntil = null;
    }

    public isHoldingBreath(): boolean {
      const nowS = this.respirationNowSeconds();
      if (nowS === null || this._heldBreathUntil === null) return false;
      return nowS < this._heldBreathUntil;
    }

    /* ──────────────────── internals ──────────────────── */

    /** Seed/refresh the clock anchor so the next tick computes Δt cleanly. */
    private seedClock(): void {
      const nowS = this.respirationNowSeconds();
      if (nowS !== null) this.respirationClockStamp = nowS;
    }

    /** Arm a drain: seed the clock, reset cues, set the auto breath-hold. */
    private armDrain(): void {
      const nowS = this.respirationNowSeconds();
      if (nowS === null) return;
      this.respirationClockStamp = nowS;
      this._blackoutCued = false;
      this._drainCued = false;
      const auto = nowS + RESPIRATION_DEFAULTS.UNPREPARED_GRACE_SEC;
      this._heldBreathUntil = Math.max(this._heldBreathUntil ?? 0, auto);
    }

    /* ──────────────────── player cues (best-effort) ──────────────────── */

    private cue(body: ReturnType<typeof Mml.compose>): void {
      const self = this as unknown as Stuff;
      if (!MixinApi.isSensor(self)) return;
      // A cue must never throw and abort the crisis engagement — the
      // telegraph is best-effort (no message infra in a unit test, etc.).
      try {
        MessageApi.scene(self).topic('world.narration.action').toSelf(body).send();
      } catch {
        // swallow — the crisis is authoritative, the cue is decoration.
      }
    }

    private cueDrainBegin(): void {
      this.cue(Mml.compose`You can't breathe!`);
    }

    private cueBlackout(): void {
      this.cue(Mml.compose`Your vision tunnels and everything goes black.`);
    }

    private cueRecover(): void {
      this.cue(Mml.compose`You gasp, and your vision clears.`);
    }
  };
}
