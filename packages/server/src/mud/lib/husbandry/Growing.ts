/**
 * GrowingMixin — the living-world growth model (husbandry phase 1).
 *
 * A growing host's condition is a pure function of
 * `(profile, clock stamp, water, light, root room, interventions)`,
 * reconciled lazily on read over elapsed **game-time** — no tick, no
 * scheduler, no presence gate. Three inputs each produce a satisfaction in
 * `[0, 1]` and growth runs at the **minimum** of them (Liebig's law):
 *
 *   - **water** — the host's root-zone `moisture` reserve (a `Reserved`
 *     reserve the host's template authors), drained by evapotranspiration
 *     and refilled by `waterPlant`;
 *   - **light** — the lux where the host sits, integrated as a segmented
 *     window (`_lastLux` holds the window's level; `reconcileGrowth`
 *     re-samples at the end, and the host's move hook closes the window at
 *     the moment of a move);
 *   - **root room** — the host seam `rootRoom()` (soil litres, or `null`
 *     for an unpotted plant), against the profile's per-stage demand. The
 *     ratio is **floored**, so a root-bound plant holds at a visible band
 *     and stalls but never dies of it.
 *
 * Vigor relaxes exponentially toward the limiting satisfaction; maturity
 * accrues only in good condition, advancing the four growth stages;
 * flowering latches at `mature` in thriving condition and sets one seed per
 * episode via the `onFloweringLatched` host hook.
 *
 * ### The clock rule — deliberately NOT `Wet.ts`'s
 *
 * This mixin copies `Wet.ts`'s skeleton (decomposed scalar persistence, a
 * reentry guard, dial-driven rates, banded presentation) but **excludes its
 * far-past guard and its linkdead freeze**. A plant is not a body: owned
 * things integrate the full absence — that is the entire point of the
 * family clock. Long gaps are bounded by a **step cap** (`ceil(elapsed /
 * step)` capped at `husbandry.maxSteps`, `dt` growing to compensate), never
 * a time cap. See docs/subsystems/husbandry.md.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import { AppApi } from '../../api/app';
import { PerceptionApi } from '../../api/perception';
import { AppSettingKeys } from '../config/AppSettings';
import { TemplatePaths } from '../paths';
import { Quantity } from '../quantity';
import type { Light } from '../perception/Light';
import type { MarkupAugmenter } from '../../api/mml';

/** The four growth stages, in order. */
export const GROWTH_STAGES = [
  'seedling',
  'young',
  'established',
  'mature',
] as const;

/** A growth stage — one of {@link GROWTH_STAGES}. */
export type GrowthStage = (typeof GROWTH_STAGES)[number];

/** The player-facing condition band (presentation, never a raw number). */
export type ConditionBand =
  | 'thriving'
  | 'healthy'
  | 'stressed'
  | 'failing'
  | 'dead';

/** The named limiting factor, or null when nothing is limiting. */
export type LimitingFactor = 'water' | 'light' | 'root' | null;

/**
 * The authored reaction norm — how THIS plant responds to the three
 * inputs. Lives on the plant template's `data` (phase 5 migrates it onto
 * `Species`). All plain scalars, so it round-trips as a default fields
 * slice with no marshaller.
 */
export interface GrowthProfileData {
  /** Root-zone moisture fraction at/above which water satisfaction is 1. */
  moistureHappyAt: number;
  /** Moisture fraction at/below which water satisfaction is 0. */
  moistureWiltAt: number;
  /** Litres transpired per game-day at neutral warmth (the ET rate). */
  litresPerGameDay: number;
  /** Lux at/above which light satisfaction is 1. */
  luxHappyAt: number;
  /** Lux at/below which light satisfaction is 0. */
  luxDarkAt: number;
  /** Litres of soil each stage's roots demand (the pot ceiling). */
  rootDemand: Record<GrowthStage, number>;
  /** Cumulative well-kept game-days to reach each post-seedling stage. */
  daysToStage: { young: number; established: number; mature: number };
}

/** The host's root-zone moisture reserve key (theme `cultivation`). */
export const MOISTURE_RESERVE_KEY = 'moisture';

const SECONDS_PER_GAME_DAY = 86_400;
/** Containment hops the light sample climbs before giving up. */
const MAX_LIGHT_HOPS = 8;

/** Numeric AppSetting read, falling back to the seeded literal. */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** Linear ramp: 0 at/below `lo`, 1 at/above `hi`. */
function ramp(x: number, lo: number, hi: number): number {
  if (hi <= lo) return x >= hi ? 1 : 0;
  return clamp01((x - lo) / (hi - lo));
}

export interface Growing {
  /** Current vigor `[0, 1]` — the condition score (reconciles on read). */
  getVigor(): number;
  /** Current banded condition (presentation). */
  getConditionBand(): ConditionBand;
  /** Current growth stage (reconciles on read). */
  getGrowthStage(): GrowthStage;
  /** Whether the plant is currently flowering (reconciles on read). */
  isFlowering(): boolean;
  /** Root-zone moisture as a fraction `[0, 1]` (reconciles on read). */
  getSoilMoisture(): number;
  /**
   * Water the plant: reconcile, then credit the moisture reserve up to its
   * headroom. Returns the litres actually absorbed (0 when dead or when no
   * moisture reserve is authored).
   */
  waterPlant(litres: number): number;
  /**
   * The factor currently capping growth, or null when nothing is limiting
   * (or the plant is dead — a dead plant has no cause line).
   */
  getLimitingFactor(): LimitingFactor;
  /** Reconcile growth over elapsed game-time (sync, read-triggered). */
  reconcileGrowth(): void;
  /** The authored reaction norm (null until authored). */
  getProfile(): GrowthProfileData | null;
  setProfile(value: GrowthProfileData | null): void;

  // Public so the Hydrator can reflect into them; in-class code reads them
  // directly. Not the inter-Stuff contract (that's the method surface).
  growthClockStamp: number;
  _vigor: number;
  _maturity: number;
  growthStage: string;
  _flowering: boolean;
  _seedSet: boolean;
  _lastLux: number;
  profile: GrowthProfileData | null;
}

/** The player-facing band phrase (state, never cause). */
const CONDITION_PHRASE: Record<Exclude<ConditionBand, 'dead'>, string> = {
  thriving: 'It is thriving.',
  healthy: 'It looks healthy.',
  stressed: 'It looks stressed.',
  failing: 'It is failing.',
};

/** The plain-language cause line per limiting factor. */
const CAUSE_PHRASE: Record<Exclude<LimitingFactor, null>, string> = {
  water: 'The soil is dry.',
  light: 'It is not getting enough light.',
  root: 'It has outgrown its pot.',
};

/**
 * Append the condition band (and, when a factor is limiting, its cause) to
 * a growing host's long description — band first, cause second, both prose
 * and never a number. The band describes *state*; the cause line names the
 * inferable *reason* and is omitted when nothing is limiting. Reads through
 * the reconcile-on-read getters, so an absent owner's plant reads
 * truthfully.
 */
function conditionAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  if (!MixinApi.isGrowing(host)) return text;
  const band = host.getConditionBand();
  const lines: string[] = [];
  if (band === 'dead') {
    lines.push('It is dead.');
  } else {
    lines.push(CONDITION_PHRASE[band]);
    const limiting = host.getLimitingFactor();
    if (limiting) lines.push(CAUSE_PHRASE[limiting]);
  }
  const suffix = lines.join(' ');
  return text && text.length > 0 ? `${text}\n\n${suffix}` : suffix;
}

export function GrowingMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class GrowingMixin extends Base implements Growing {
    static _mixinName = 'GrowingMixin';

    static persistentFields = [
      'growthClockStamp',
      '_vigor',
      '_maturity',
      'growthStage',
      '_flowering',
      '_seedSet',
      '_lastLux',
      'profile',
    ];

    /** Derived condition + cause lines appended to the long description. */
    static markupAugmenters: MarkupAugmenter[] = [conditionAugmenter];

    /** Game-seconds stamp of the last reconcile; `0` = never touched. */
    public growthClockStamp = 0;
    /** Smoothed condition `[0, 1]`; a fresh plant starts `healthy`. */
    public _vigor = 0.7;
    /** Accumulated good game-seconds toward the next stage. */
    public _maturity = 0;
    /** Current stage — one of {@link GROWTH_STAGES}. */
    public growthStage: string = 'seedling';
    /** Latched at `mature` in thriving condition; cleared on falling back. */
    public _flowering = false;
    /** This flowering episode has already set its seed. */
    public _seedSet = false;
    /** The lux the open window is integrated with (segmented at moves). */
    public _lastLux = 0;
    /** The authored reaction norm (see {@link GrowthProfileData}). */
    public profile: GrowthProfileData | null = null;

    /** Reentry guard — a reconcile must never recurse through a read. */
    private _reconcilingGrowth = false;

    // ---------- reads ----------

    public getVigor(): number {
      if (!this._reconcilingGrowth) this.reconcileGrowth();
      return clamp01(this._vigor);
    }

    public getConditionBand(): ConditionBand {
      const v = this.getVigor(); // reconcile FIRST — the read may latch death
      if (this.isGrowthDead()) return 'dead';
      if (v >= dial(AppSettingKeys.husbandryBandThrivingAt, 0.8)) {
        return 'thriving';
      }
      if (v >= dial(AppSettingKeys.husbandryBandHealthyAt, 0.55)) {
        return 'healthy';
      }
      if (v >= dial(AppSettingKeys.husbandryBandStressedAt, 0.3)) {
        return 'stressed';
      }
      return 'failing';
    }

    public getGrowthStage(): GrowthStage {
      if (!this._reconcilingGrowth) this.reconcileGrowth();
      return (
        GROWTH_STAGES.includes(this.growthStage as GrowthStage)
          ? this.growthStage
          : 'seedling'
      ) as GrowthStage;
    }

    public isFlowering(): boolean {
      if (!this._reconcilingGrowth) this.reconcileGrowth();
      return this._flowering;
    }

    public getSoilMoisture(): number {
      if (!this._reconcilingGrowth) this.reconcileGrowth();
      return this.moistureFraction();
    }

    public getProfile(): GrowthProfileData | null {
      return this.profile;
    }

    public setProfile(value: GrowthProfileData | null): void {
      this.profile = value;
    }

    public getLimitingFactor(): LimitingFactor {
      if (!this._reconcilingGrowth) this.reconcileGrowth();
      if (this.isGrowthDead() || !this.profile) return null;
      const satWater = this.satWater();
      const satLight = this.satLight(this._lastLux);
      const satRoot = this.satRoot();
      const limiting = Math.min(satWater, satLight, satRoot);
      if (limiting >= dial(AppSettingKeys.husbandryGoodAt, 0.6)) return null;
      if (satWater <= satLight && satWater <= satRoot) return 'water';
      if (satLight <= satRoot) return 'light';
      return 'root';
    }

    // ---------- interventions ----------

    public waterPlant(litres: number): number {
      if (!Number.isFinite(litres) || litres <= 0) return 0;
      if (!this._reconcilingGrowth) this.reconcileGrowth();
      if (this.isGrowthDead()) return 0;
      const reserved = this.asReserved();
      const reserve = reserved.getReserve(MOISTURE_RESERVE_KEY);
      if (!reserve) return 0;
      const headroom =
        reserve.capacity.rawValue() - reserve.current.rawValue();
      const applied = Math.min(litres, Math.max(0, headroom));
      if (applied <= 0) return 0;
      reserved.adjustReserve(MOISTURE_RESERVE_KEY, Quantity.of(applied, 'L'));
      return applied;
    }

    // ---------- reconcile-on-read (the lazy integrate) ----------

    /**
     * Integrate growth over elapsed game-time since the last reconcile.
     * **No far-past guard and no linkdead branch** — an owned thing lives
     * the full absence (the family clock); long gaps are bounded by the
     * step cap, never dropped. Dead is terminal. No-op when no world clock
     * is running or no profile is authored.
     */
    public reconcileGrowth(): void {
      if (this._reconcilingGrowth) return;

      const nowS = this.growthNowSeconds();
      if (nowS === null) return;
      if (this.isGrowthDead()) return; // terminal

      // First touch: seed the stamp + the light window; integrate nothing.
      if (this.growthClockStamp === 0) {
        this.growthClockStamp = nowS;
        this._lastLux = this.sampleLux();
        return;
      }

      const elapsed = nowS - this.growthClockStamp;
      if (elapsed <= 0) {
        this.growthClockStamp = nowS;
        return;
      }
      if (!this.profile) {
        this.growthClockStamp = nowS;
        return;
      }

      this._reconcilingGrowth = true;
      try {
        const stepSec = dial(AppSettingKeys.husbandryStepSec, 43_200);
        const maxSteps = dial(AppSettingKeys.husbandryMaxSteps, 2000);
        // A step cap, never a time cap: dt grows with the gap so an absurd
        // absence still integrates fully in bounded work.
        const steps = Math.max(
          1,
          Math.min(Math.ceil(elapsed / stepSec), Math.floor(maxSteps)),
        );
        const dt = elapsed / steps;
        const tau = dial(AppSettingKeys.husbandryVigorTauSec, 3_801_600);
        const goodAt = dial(AppSettingKeys.husbandryGoodAt, 0.6);
        const deathAt = dial(AppSettingKeys.husbandryDeathAt, 0.12);
        const warmth = this.transpirationWarmth();
        // Sampled once before the loop — the pot cannot change mid-window —
        // and re-sampled on a stage advance (root demand is per-stage).
        let satRoot = this.satRoot();
        const satLight = this.satLight(this._lastLux);

        for (let i = 0; i < steps; i++) {
          this.drainMoisture(dt, warmth);
          const limiting = Math.min(this.satWater(), satLight, satRoot);
          // Exponential relaxation toward the limiting satisfaction; the
          // factor is clamped so an oversized dt cannot overshoot.
          const k = Math.min(dt / tau, 1);
          this._vigor = clamp01(this._vigor + (limiting - this._vigor) * k);
          if (limiting >= goodAt) {
            this._maturity += dt;
            if (this.advanceStage()) satRoot = this.satRoot();
          }
          this.updateFlowering();
          if (this._vigor < deathAt) {
            this.latchDead();
            break;
          }
        }
        this.growthClockStamp = nowS;
      } finally {
        this._reconcilingGrowth = false;
      }

      // Close the integrated window: the next one opens at today's light.
      this._lastLux = this.sampleLux();
    }

    // ---------- host seams ----------

    /**
     * The soil litres available to the roots, or `null` when unpotted.
     * Default `null` — not being in a pot is not a root constraint (an
     * unpotted plant is already in trouble via water). The concrete host
     * overrides to read its pot.
     */
    protected rootRoom(): number | null {
      return null;
    }

    /**
     * Witness for a fresh flowering latch whose episode has not yet set a
     * seed. The concrete host overrides to mint one (async, fire-and-
     * forget — the reconcile is sync). Default no-op.
     */
    protected onFloweringLatched(): void {
      /* host hook */
    }

    /**
     * Sample the lux where this host sits: climb the containment chain
     * past open containers and read the room's light; a sealed-closed
     * container is an honest dark (only its own interior light counts).
     * Protected so the host's move hook can re-sample; 0 on any failure
     * (pre-boot, no perception substrate — the dark default).
     */
    protected sampleLux(): number {
      try {
        const self = this as unknown as Stuff;
        if (!MixinApi.isContainable(self)) return 0;
        let env: Stuff | null = self.getContainer();
        if (!env) return 0;
        for (let hops = 0; hops < MAX_LIGHT_HOPS; hops++) {
          if (MixinApi.isSealable(env) && !env.isOpen()) {
            return this.luxAt(env);
          }
          const parent: Stuff | null = MixinApi.isContainable(env)
            ? env.getContainer()
            : null;
          if (!parent) return this.luxAt(env);
          env = parent;
        }
        return this.luxAt(env);
      } catch {
        return 0;
      }
    }

    // ---------- private machinery ----------

    private luxAt(loc: Stuff): number {
      if (!MixinApi.isContainer(loc)) return 0;
      const vision = PerceptionApi.modalityByName('vision');
      const light = vision.signalAt(loc as Stuff & Container) as Light | null;
      return light ? light.intensity.rawValue() : 0;
    }

    /** The host's `Reserved` face; throws with a clear error when absent. */
    private asReserved() {
      const self = this as unknown as Stuff;
      if (!MixinApi.isReserved(self)) {
        throw new Error(
          'GrowingMixin: host must compose ReservedMixin (the root-zone ' +
            "'moisture' reserve lives there)",
        );
      }
      return self;
    }

    /** Root-zone moisture fraction; 0 when no reserve is authored. */
    private moistureFraction(): number {
      const reserve = this.asReserved().getReserve(MOISTURE_RESERVE_KEY);
      if (!reserve) return 0;
      const cap = reserve.capacity.rawValue();
      if (cap <= 0) return 0;
      return clamp01(reserve.current.rawValue() / cap);
    }

    private drainMoisture(dtSec: number, warmth: number): void {
      const profile = this.profile;
      if (!profile) return;
      const reserved = this.asReserved();
      if (!reserved.hasReserve(MOISTURE_RESERVE_KEY)) return;
      const litres =
        profile.litresPerGameDay * (dtSec / SECONDS_PER_GAME_DAY) * warmth;
      if (litres <= 0) return;
      reserved.adjustReserve(MOISTURE_RESERVE_KEY, Quantity.of(-litres, 'L'));
    }

    private satWater(): number {
      const profile = this.profile;
      if (!profile) return 1;
      return ramp(
        this.moistureFraction(),
        profile.moistureWiltAt,
        profile.moistureHappyAt,
      );
    }

    private satLight(lux: number): number {
      const profile = this.profile;
      if (!profile) return 1;
      return ramp(lux, profile.luxDarkAt, profile.luxHappyAt);
    }

    /**
     * Root satisfaction — one curve, two behaviours: the ratio of soil
     * volume to the current stage's demand, **floored** at
     * `husbandry.rootFloor` (a pot-bound plant holds at a visible band and
     * never dies of it) and — because the floor sits below
     * `husbandry.goodAt` — stalling maturity, with no special-casing.
     * Unpotted (`rootRoom()` null) reads 1: not being in a pot is not a
     * root constraint.
     */
    private satRoot(): number {
      const profile = this.profile;
      if (!profile) return 1;
      const volume = this.rootRoom();
      if (volume === null) return 1;
      const demand = profile.rootDemand[this.currentStage()];
      if (!Number.isFinite(demand) || demand <= 0) return 1;
      const floor = dial(AppSettingKeys.husbandryRootFloor, 0.4);
      const ratio = volume / demand;
      return ratio >= 1 ? 1 : Math.max(ratio, floor);
    }

    private currentStage(): GrowthStage {
      return GROWTH_STAGES.includes(this.growthStage as GrowthStage)
        ? (this.growthStage as GrowthStage)
        : 'seedling';
    }

    /** Advance the stage on maturity thresholds; true when it moved. */
    private advanceStage(): boolean {
      const profile = this.profile;
      if (!profile) return false;
      const goodDays = this._maturity / SECONDS_PER_GAME_DAY;
      const idx = GROWTH_STAGES.indexOf(this.currentStage());
      let advanced = false;
      let i = idx;
      while (i < GROWTH_STAGES.length - 1) {
        const next = GROWTH_STAGES[i + 1] as Exclude<GrowthStage, 'seedling'>;
        if (goodDays < profile.daysToStage[next]) break;
        this.growthStage = next;
        advanced = true;
        i++;
      }
      return advanced;
    }

    /**
     * Latch flowering at `mature` in thriving condition; clear it (and the
     * episode's seed mark) when vigor falls back. A fresh latch whose
     * episode has not yet set a seed marks it set and fires the host hook
     * — one seed per flowering episode.
     */
    private updateFlowering(): void {
      const thrivingAt = dial(AppSettingKeys.husbandryBandThrivingAt, 0.8);
      const shouldFlower =
        this.currentStage() === 'mature' && this._vigor >= thrivingAt;
      if (shouldFlower && !this._flowering) {
        this._flowering = true;
        if (!this._seedSet) {
          this._seedSet = true;
          this.onFloweringLatched();
        }
      } else if (!shouldFlower && this._flowering) {
        this._flowering = false;
        this._seedSet = false;
      }
    }

    /**
     * Death latches on the vigor *crossing* (exponential relaxation never
     * reaches zero on its own): vigor pins to exactly 0 and, when the host
     * is an Organism, `lifecycleState` goes `'dead'`. Terminal —
     * `reconcileGrowth` no-ops and `waterPlant` does not revive.
     */
    private latchDead(): void {
      this._vigor = 0;
      this._flowering = false;
      this._seedSet = false;
      const self = this as unknown as Stuff;
      if (MixinApi.isOrganism(self)) self.setLifecycleState('dead');
    }

    /** Terminal-state read: the Organism lifecycle when composed, else the
     * pinned-zero vigor latch. */
    private isGrowthDead(): boolean {
      const self = this as unknown as Stuff;
      if (MixinApi.isOrganism(self)) return self.isDead();
      return this._vigor <= 0 && this.growthClockStamp !== 0;
    }

    /**
     * Transpiration accelerant from the host's own temperature (sync):
     * warmer than the reference transpires faster; at or below it,
     * neutral. Gracefully neutral when Thermal is absent or throws.
     */
    private transpirationWarmth(): number {
      const self = this as unknown as Stuff;
      if (!MixinApi.isThermal(self)) return 1;
      try {
        const tempK = self.getTemperature().rawValue();
        const refK = dial(AppSettingKeys.husbandryWarmthReferenceK, 295);
        const factor = dial(AppSettingKeys.husbandryWarmthFactor, 0.03);
        const excess = tempK - refK;
        return excess > 0 ? 1 + excess * factor : 1;
      } catch {
        return 1;
      }
    }

    /** Game-seconds now, or `null` when no world clock (pre-boot / tests). */
    private growthNowSeconds(): number | null {
      if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
        return null;
      }
      return WorldClockApi.getNow().rawValue();
    }
  };
}
