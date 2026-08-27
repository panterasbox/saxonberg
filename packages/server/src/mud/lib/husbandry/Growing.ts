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

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { Cultivable } from './Cultivable';
import type { Slotted } from '../slot/Slotted';
import type { Bulkable } from '../bulk/Bulkable';
import type { Difficulty } from '../advancement/ActSignature';
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
export type LimitingFactor =
  | 'water'
  | 'light'
  | 'root'
  | 'nutrient'
  | null;

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
  /**
   * Root-zone moisture as a fraction `[0, 1]` (reconciles on read).
   * Reads the SOIL the plant is rooted in — phase 2 moved the water out
   * of the plant and into the ground. An unrooted plant reads 0.
   */
  getSoilMoisture(): number;
  /**
   * Litres this plant transpires per game-day at neutral warmth — a
   * **pure, non-reconciling** read of the authored profile.
   *
   * ⚠ The soil sums this across its occupants to drain itself. It must
   * never reconcile: the soil's reconcile calls it, and a reconcile here
   * would read the soil's moisture, which would re-enter the soil.
   */
  waterDemandPerGameDay(): number;
  /**
   * The WORST limiting satisfaction this plant has ever recorded — a
   * monotone minimum, seeded at 1. Harvest quality reads it, which is
   * what makes farming reward your worst moment rather than your
   * average: a plant nursed back looks fine and still grades badly.
   */
  getWorstLimiting(): number;
  /**
   * The `/stuff/thing/crop/…` template a harvest mints, mirroring the host's
   * seed path exactly (the same instantiate-don't-resolve identity-ref
   * variant). Null for an ornamental that yields nothing — a houseplant
   * is not harvestable, and saying so costs one null.
   */
  getHarvestTemplatePath(): string | null;
  setHarvestTemplatePath(value: string | null): void;
  /**
   * Percentage points of nitrogen this crop takes out of the bed when it
   * is harvested — the export that makes an unfed bed yield worse each
   * time. Authored per species; 0 for a plant that draws nothing.
   */
  getNutrientDraw(): number;
  setNutrientDraw(value: number): void;
  /**
   * Whether this can be harvested right now: it must yield something, be
   * mature, and be alive. Reconciles on read (through `getGrowthStage`),
   * so an absence that ripened it counts.
   */
  isHarvestable(): boolean;
  /**
   * The ground this is rooted in — a pot or a garden bed — or null when
   * unrooted. Speaks the `Cultivable` interface rather than a concrete
   * class: *a pot is a bed with one slot*, and the plant has no business
   * knowing which it is sitting in.
   */
  getBed(): (Stuff & Cultivable & Container & Bulkable & Slotted) | null;
  /**
   * How hard it is to move this to another pot — the `horticulture`
   * difficulty the `repot` verb credits. Root disturbance scales with
   * what there is to disturb, so a seedling is trivial and a grown plant
   * is not.
   */
  transplantDifficulty(): Difficulty;
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
  /**
   * Tell the plant its surroundings just changed: close the integrated
   * light window at its true level and re-sample. Called by the host's own
   * move hook and by a carrier (a pot) that moved with the plant inside
   * it — see {@link Growing.reconcileGrowth} on why the window has to be
   * segmented at the moment of a move.
   */
  noteEnvironmentChanged(): void;
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
  _worstLimiting: number;
  profile: GrowthProfileData | null;
}

/** The player-facing size phrase per stage (how big, never a number). */
const STAGE_PHRASE: Record<GrowthStage, string> = {
  seedling: 'It is still a seedling.',
  young: 'It is a young plant.',
  established: 'It is well established.',
  mature: 'It is fully grown.',
};

/** The mature-and-flowering variant — the one stage that reads differently. */
const FLOWERING_PHRASE = 'It is fully grown, and in flower.';

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
  nutrient: 'The soil is spent.',
};

/**
 * Append the plant's **size, condition and cause** to its long description,
 * in that order — how big it is, how it is doing, and why. All three are
 * prose and never a number.
 *
 * The three lines are deliberately different kinds of statement. Size is a
 * physical fact. The band describes *state*, never cause. The cause line
 * names the inferable *reason* and is omitted when nothing is limiting —
 * which is the split phase 7's diagnosis surface generalizes.
 *
 * **Flowering rides the size line**, because it is the one stage that reads
 * differently rather than a fourth kind of statement — and because a
 * flowering plant sets a seed into its pot, which would otherwise appear
 * from nowhere.
 *
 * Reads through the reconcile-on-read getters, so an absent owner's plant
 * reads truthfully.
 */
function conditionAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  if (!MixinApi.isGrowing(host)) return text;
  const band = host.getConditionBand();
  const lines: string[] = [];
  if (band === 'dead') {
    // A dead plant has no size worth reporting and no cause to infer — it
    // is over, and the description says only that.
    lines.push('It is dead.');
  } else {
    lines.push(
      host.isFlowering() ? FLOWERING_PHRASE : STAGE_PHRASE[host.getGrowthStage()],
    );
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

    static fieldMeta: FieldMeta = {
      growthClockStamp: { persistent: true },
      _vigor: { persistent: true },
      _maturity: { persistent: true },
      growthStage: { persistent: true },
      _flowering: { persistent: true },
      _seedSet: { persistent: true },
      _lastLux: { persistent: true },
      _worstLimiting: { persistent: true },
      profile: { persistent: true },
      // ⭐ Moved off the `Plant` CLASS. `harvest` and `repot` used to
      // narrow with `instanceof Plant` while their specs declared
      // `requires: GrowingMixin` — two predicates for one gate, the
      // same split that let the menu offer `plant` on a rock. The
      // capability is what the verbs actually need, so it lives with
      // the capability. Hydration reflects by NAME, so authored
      // content is untouched by the move.
      harvestTemplatePath: { persistent: true, authorable: true },
      nutrientDraw: { persistent: true, authorable: true },
    };

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
    /**
     * Monotone minimum of the limiting satisfaction over this plant's
     * whole life; 1 until the first reconcile touches it. The quality
     * substrate — see {@link Growing.getWorstLimiting}.
     */
    public _worstLimiting = 1;
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
      return this.soilMoisture() ?? 0;
    }

    public waterDemandPerGameDay(): number {
      // PURE — no reconcile. The soil calls this while draining itself.
      return this.profile?.litresPerGameDay ?? 0;
    }

    public getWorstLimiting(): number {
      if (!this._reconcilingGrowth) this.reconcileGrowth();
      return clamp01(this._worstLimiting);
    }

    /*
     * ⭐ The harvest + rooting surface, moved here from the `Plant`
     * class. `harvest` and `repot` narrowed with `instanceof Plant`
     * while their specs declared `requires: GrowingMixin` — two
     * predicates for one gate, which is the split that let the menu
     * offer `plant` on a rock. Everything below is expressed purely in
     * terms of what this mixin already owns, so the class was never
     * the right home for it; `Plant` was simply the only composer.
     */

    /** The `/obj/…` template a harvest mints; null yields nothing. */
    public harvestTemplatePath: string | null = null;

    public getHarvestTemplatePath(): string | null {
      return this.harvestTemplatePath;
    }

    public setHarvestTemplatePath(value: string | null): void {
      this.harvestTemplatePath = value;
    }

    /** Nitrogen points a harvest exports from the bed. */
    public nutrientDraw: number = 0;

    public getNutrientDraw(): number {
      return this.nutrientDraw;
    }

    public setNutrientDraw(value: number): void {
      this.nutrientDraw = Math.max(0, value);
    }

    public isHarvestable(): boolean {
      if (!this.harvestTemplatePath) return false;
      if (this.getGrowthStage() !== 'mature') return false;
      return this.getConditionBand() !== 'dead';
    }

    /*
     * ⚠ `getOccupiedHost` belongs to `SlottableMixin`, which composes
     * OUTSIDE this one on `Plant` — so it cannot be assumed on the
     * base. Asking `MixinApi.isSlottable` is the project's own answer
     * to that (narrow locally rather than demand composition order),
     * and it makes an unslotted grower read `null` instead of throwing.
     */
    public getBed():
      | (Stuff & Cultivable & Container & Bulkable & Slotted)
      | null {
      const self = this as unknown as Stuff;
      if (!MixinApi.isSlottable(self)) return null;
      const host = self.getOccupiedHost();
      if (!host) return null;
      return MixinApi.isCultivable(host) ? host : null;
    }

    public transplantDifficulty(): Difficulty {
      switch (this.getGrowthStage()) {
        case 'seedling':
          return 'trivial';
        case 'young':
          return 'easy';
        case 'established':
          return 'standard';
        default:
          return 'hard'; // `mature`
      }
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
      // The cause line answers "why is it unhappy *now*", so every term
      // is sampled live rather than read off the last integrated window —
      // move a plant into the dark and it says so immediately, before the
      // dark hours have accrued.
      const satWater = this.satWater(this.soilMoisture());
      const satLight = this.satLight(this.sampleLux());
      const satRoot = this.satRoot();
      const satNutrient = this.satNutrient();
      const limiting = Math.min(satWater, satLight, satRoot, satNutrient);
      if (limiting >= dial(AppSettingKeys.husbandryGoodAt, 0.6)) return null;
      if (limiting === satWater) return 'water';
      if (limiting === satLight) return 'light';
      if (limiting === satRoot) return 'root';
      return 'nutrient';
    }

    // ---------- interventions ----------

    /**
     * Water the plant — which since phase 2 means **watering the ground it
     * is rooted in**. The verb surface is unchanged (`water <plant>` still
     * works) but the litres land in the soil, where every occupant shares
     * them. An unrooted plant absorbs nothing, because nothing is holding
     * water for it.
     */
    public waterPlant(litres: number): number {
      if (!Number.isFinite(litres) || litres <= 0) return 0;
      if (!this._reconcilingGrowth) this.reconcileGrowth();
      if (this.isGrowthDead()) return 0;
      return this.waterTheSoil(litres);
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
      //
      // ⚠ Seed the GROUND's stamp in the same breath. The soil owns its
      // own checkpoint and seeds it lazily on first read — so a bed that
      // nobody has looked at would otherwise stamp itself at the moment
      // of the first read and skip the whole elapsed window, handing this
      // plant a full reserve it should long since have drunk. A plant's
      // clock and its ground's clock start together or neither is honest.
      if (this.growthClockStamp === 0) {
        this.growthClockStamp = nowS;
        this._lastLux = this.sampleLux();
        this.soilMoisture();
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
        // Sampled once before the loop — the ground cannot change
        // mid-window — and re-sampled on a stage advance (root demand is
        // per-stage).
        let satRoot = this.satRoot();
        const satLight = this.satLight(this._lastLux);
        // WATER is now a per-window sample too, exactly like light. The
        // soil owns the drain and reconciles on its own stamp; asking it
        // here is what triggers that, and the MEAN it reports is the
        // right figure for a window this plant is integrating whole.
        const satWater = this.satWater(this.meanSoilMoisture());
        const satNutrient = this.satNutrient();

        for (let i = 0; i < steps; i++) {
          const limiting = Math.min(
            satWater,
            satLight,
            satRoot,
            satNutrient,
          );
          if (limiting < this._worstLimiting) this._worstLimiting = limiting;
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

    public noteEnvironmentChanged(): void {
      this.reconcileGrowth();
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
     * The moisture fraction of the ground this plant is rooted in, or
     * `null` when it is rooted in nothing. Default `null`; the concrete
     * host overrides to read its bed.
     *
     * Phase 2 moved water OUT of the plant and into the soil. The
     * objection phase 1 recorded — that it "splits one checkpoint across
     * two objects" — is answered by giving the soil a checkpoint of its
     * own: the bed owns a stamp and a reconcile, and **the plant only
     * reads**. Two self-contained checkpoints, not one shared one.
     */
    protected soilMoisture(): number | null {
      return null;
    }

    /**
     * The MEAN moisture across the window being integrated — what the
     * reconcile loop should use, since it is closing a whole window at
     * once. Defaults to the instantaneous read.
     */
    protected meanSoilMoisture(): number | null {
      return this.soilMoisture();
    }

    /**
     * The nutrient fraction of the ground, or `null` when the ground
     * declares none. Default `null` → `satNutrient` is 1, so **a pot is
     * unchanged**: a houseplant is never nutrient-limited because a pot
     * authors no nitrogen reserve.
     */
    protected nutrientLevel(): number | null {
      return null;
    }

    /**
     * Pour `litres` into the ground this plant is rooted in; returns what
     * was absorbed. Default 0 — nothing is holding water for an unrooted
     * plant. The concrete host overrides to credit its bed.
     */
    protected waterTheSoil(litres: number): number {
      void litres;
      return 0;
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

    /**
     * Water satisfaction from a soil-moisture fraction. `null` (unrooted)
     * reads **0**: husbandry.md already said an unpotted plant "is
     * already in trouble via water, since nothing can hold moisture for
     * it" — since phase 2 that sentence is the mechanism rather than a
     * gloss, because there is no private reserve to fall back on.
     */
    private satWater(fraction: number | null): number {
      const profile = this.profile;
      if (!profile) return 1;
      if (fraction === null) return 0;
      return ramp(fraction, profile.moistureWiltAt, profile.moistureHappyAt);
    }

    /**
     * Nutrient satisfaction — the fourth limiting factor, and the one a
     * houseplant never sees: a pot authors no nitrogen reserve, so the
     * seam reads `null` and this returns 1. Only ground that declares
     * nutrient can be limited by it.
     */
    private satNutrient(): number {
      const level = this.nutrientLevel();
      if (level === null) return 1;
      return ramp(
        level,
        dial(AppSettingKeys.husbandryNutrientSpentAt, 0.05),
        dial(AppSettingKeys.husbandryNutrientHappyAt, 0.5),
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


    /** Game-seconds now, or `null` when no world clock (pre-boot / tests). */
    private growthNowSeconds(): number | null {
      if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
        return null;
      }
      return WorldClockApi.getNow().rawValue();
    }
  };
}
