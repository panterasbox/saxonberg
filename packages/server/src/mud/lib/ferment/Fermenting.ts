/**
 * FermentingMixin — the durative transform (fermentation D1/D2).
 *
 * A VESSEL capability, never a liquid's: bulk matter has no identity,
 * vessels do (the pot-as-bed precedent). The vat ferments whatever
 * sugar-bearing must its interior holds; which ferment runs, at what
 * rate, into what product is entirely the matched {@link FermentProfile}
 * row's — the authoring surface (a new drink is rows alone).
 *
 * **The shape is husbandry's, the equation is not** — *growth accretes,
 * fermentation converts*: reconcile lazily on read over elapsed
 * game-time, staged, **no far-past guard and no linkdead freeze** (an
 * owned batch lives the full absence; the mitigation for a long gap is
 * the cellar — a PLACE — never a rule). The driver is temperature +
 * time: each reconcile reads the vessel's own reconciled temperature
 * (`ThermalMixin`'s lazy Newton read — the cold cellar is real because
 * the vat drifts toward its room) and credits the closed window at that
 * temperature. **Windows are segmented at events, not integrated from
 * history**: seal toggles and moves reconcile first (the `Vat`
 * overrides), so each stretch is credited under the conditions it
 * actually ran at.
 *
 * The batch's state is a pure function of its inputs and temperature
 * history — **no resolutional randomness anywhere** (D4). The numbers
 * are derived and discoverable: starting sugar comes off the input
 * material (`nutrientAmounts.sugar`, g/L), ABV = starting sugar ×
 * fraction converted / {@link SUGAR_G_PER_L_PER_ABV_PCT}, gravity =
 * 1 + remaining sugar × {@link GRAVITY_PER_SUGAR_G_PER_L} — so two vats
 * at two temperatures, gravity read over time, recover the profile's
 * authored slopes by experiment.
 *
 * **Oxygen is the trap; the seal is the skill (D3).** While sugar
 * remains, the CO₂ blanket protects an open ferment. Past `finished`,
 * an OPEN vessel converts ethanol → acetic acid over the profile's
 * `turnDays` and the batch `turned`s into `turnedMaterial` (vinegar —
 * the failure path still feeds someone); a SEALED one holds. A
 * `sealedOnly` profile converts only while sealed (bottle/cask
 * conditioning — what sparkling and real ale ARE, P5/P9).
 *
 * **Grade comes from the process (D6).** The worst temperature stretch
 * over the active window is a monotone-min satisfaction
 * (`_worstStretch`, husbandry's `_worstLimiting` second consumer): the
 * hot band past `damageAboveK` writes it down, cold merely stalls. The
 * derived band is written onto the host's `Graded` face on every
 * reconcile, and the maker's mark rides the W0 transfer seam in and
 * out — so the bottle racked from a well-kept batch is `fine`, and
 * attributable.
 *
 * **The batch is detected, not hooked.** The mixin keys the batch to
 * the interior material path and notices a change on reconcile: a new
 * material = a fresh fill = a fresh batch (mark stamped from the
 * carried maker, else the acting author when the fill's context is
 * live); an emptied interior resets to idle; the mixin's own
 * product/turn swaps update the key so they never read as fills. A
 * same-material top-up deliberately continues the batch (blend identity
 * is out of scope, the payload rule).
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import { Mixins } from '../mixin';
import type { AnyConstructor } from '../../api/mixin';
import type { Stuff } from '../stuff/Stuff';
import type Material from '../material/Material';
import type FermentProfile from './FermentProfile';
import type { Crafted } from '../craft/Crafted';
import { Grade, type GradeBand } from '../craft/Grade';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import { ExecutionContextApi } from '../../api/execution-context';
import { FermentApi } from '../../api/ferment';
import { TemplatePaths } from '../paths';

/** The batch phases, in lifecycle order. */
export const FERMENT_PHASES = ['idle', 'active', 'finished', 'turned'] as const;

/** A batch phase — one of {@link FERMENT_PHASES}. */
export type FermentPhase = (typeof FERMENT_PHASES)[number];

const SECONDS_PER_GAME_DAY = 86_400;

/**
 * Kelvin past `damageAboveK` at which the stretch satisfaction reaches
 * 0 — the width of the damage ramp (inside it, damage is partial).
 */
const DAMAGE_RAMP_K = 15;

/**
 * Grams of sugar per litre consumed per 1% ABV produced (≈16.8 in the
 * real stoichiometry; 17 is the teachable round figure — the mass
 * balance a measuring player can verify).
 */
export const SUGAR_G_PER_L_PER_ABV_PCT = 17;

/**
 * Specific-gravity points per g/L of dissolved sugar (≈0.0004 real:
 * 100 g/L reads ≈1.040). What the hydrometer derives from.
 */
export const GRAVITY_PER_SUGAR_G_PER_L = 0.0004;

/** Ambient assumed for a non-Thermal host (never true of `Vat`). */
const DEFAULT_ROOM_K = 295;

/**
 * Worst-stretch satisfaction → grade band. The husbandry harvest
 * thresholds, second consumer: a batch never run hot grades
 * `masterful`; the deeper into the damage ramp the worst stretch went,
 * the lower the band.
 */
function bandFor(worst: number): GradeBand {
  if (worst >= 0.95) return 'masterful';
  if (worst >= 0.8) return 'exceptional';
  if (worst >= 0.6) return 'fine';
  if (worst >= 0.35) return 'fair';
  return 'poor';
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** Conversion rate (fraction/day) at `tempK` under `profile`. */
function rateAt(profile: FermentProfile, tempK: number): number {
  const stall = profile.getStallBelowK();
  const happy = profile.getHappyK();
  if (tempK <= stall) return 0;
  const full = profile.getRatePerDay();
  if (tempK >= happy || happy <= stall) return full;
  return (full * (tempK - stall)) / (happy - stall);
}

/** Damage satisfaction at `tempK`: 1 at/below the damage line. */
function damageSat(profile: FermentProfile, tempK: number): number {
  const damage = profile.getDamageAboveK();
  if (tempK <= damage) return 1;
  return clamp01(1 - (tempK - damage) / DAMAGE_RAMP_K);
}

export interface Fermenting {
  /** Integrate the batch over elapsed game-time (lazy; reads drive it). */
  reconcileFerment(): void;
  /** The batch phase (reconciles first). */
  getFermentPhase(): FermentPhase;
  /** Fraction of the starting sugar converted, 0..1 (reconciles first). */
  getFractionConverted(): number;
  /** The must's starting sugar, g/L — read off the input material at fill. */
  getStartingSugarGPerL(): number;
  /** Unconverted sugar remaining, g/L (reconciles first). */
  getRemainingSugarGPerL(): number;
  /**
   * Specific gravity of the batch — what a hydrometer reads
   * (reconciles first). `1 + remaining sugar × 0.0004`.
   */
  getGravity(): number;
  /** Derived ABV, % — never authored on a batch (reconciles first). */
  getAbvPercent(): number;
  /** The monotone-min worst temperature stretch, 0..1 (reconciles first). */
  getWorstStretch(): number;
  /** The matched profile's key, `''` when none. */
  getFermentProfileKey(): string;
  /** The matched profile row, or `null`. */
  getFermentProfile(): FermentProfile | null;
}

export function FermentingMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class FermentingMixin extends Base implements Fermenting {
    static _mixinName = 'FermentingMixin';

    static __validateComposition__(ctor: AnyConstructor): void {
      const name = (ctor as { name?: string }).name ?? 'class';
      if (!MixinApi.hasMixin(ctor, Mixins.Bulkable)) {
        throw new Error(
          `${name} composes FermentingMixin without BulkableMixin; ` +
            `the transform rides the vessel's interior bulk slot (D2).`,
        );
      }
    }

    static fieldMeta: FieldMeta = {
      fermentClockStamp: { persistent: true, runtimeState: true },
      fermentPhase: { persistent: true, runtimeState: true },
      fermentProfileKey: { persistent: true, runtimeState: true },
      batchMaterialPath: { persistent: true, runtimeState: true },
      startingSugarGPerL: { persistent: true, runtimeState: true },
      fractionConverted: { persistent: true, runtimeState: true },
      _worstStretch: { persistent: true, runtimeState: true },
      turnedDays: { persistent: true, runtimeState: true },
    };

    /** Game-seconds stamp of the last reconcile; `0` = never touched. */
    public fermentClockStamp = 0;
    /** The batch phase. */
    public fermentPhase: FermentPhase = 'idle';
    /** The matched profile's key; `''` = none matched. */
    public fermentProfileKey = '';
    /** The interior material path the current batch is keyed to. */
    public batchMaterialPath: string | null = null;
    /** Starting sugar, g/L, read off the input material at fill. */
    public startingSugarGPerL = 0;
    /** Fraction of the starting sugar converted, 0..1. */
    public fractionConverted = 0;
    /** Monotone minimum of the damage satisfaction over the batch. */
    public _worstStretch = 1;
    /** Open game-days accrued past `finished` (the turn clock). */
    public turnedDays = 0;

    /** Reentry guard (TS-private; proxy-safe — never `#`). */
    private _reconcilingFerment = false;

    // ---------- reconcile-on-read (the lazy convert) ----------

    public reconcileFerment(): void {
      if (this._reconcilingFerment) return;
      const nowS = this.fermentNowSeconds();
      if (nowS === null) return;
      this._reconcilingFerment = true;
      try {
        const self = this as unknown as Stuff;
        const bulk = MixinApi.isBulkable(self) ? self : null;
        const currentPath = bulk?.getBulkMaterialPath('interior') ?? null;
        const amount = bulk ? bulk.getBulkAmount('interior').rawValue() : 0;

        // An emptied vessel is an ended batch.
        if (currentPath === null || amount <= 0) {
          if (this.fermentPhase !== 'idle') this.resetBatch();
          this.fermentClockStamp = nowS;
          return;
        }
        // A changed interior material is a fresh fill — a fresh batch.
        // (The mixin's own product/turn swaps update the key first, so
        // they never land here.)
        if (currentPath !== this.batchMaterialPath) {
          this.startBatch(currentPath, nowS);
          return;
        }

        if (this.fermentClockStamp === 0) {
          this.fermentClockStamp = nowS;
          return;
        }
        const elapsed = nowS - this.fermentClockStamp;
        if (elapsed <= 0) {
          this.fermentClockStamp = nowS;
          return;
        }
        if (this.fermentPhase === 'idle' || this.fermentPhase === 'turned') {
          this.fermentClockStamp = nowS;
          return;
        }
        const profile = FermentApi.profileByKey(this.fermentProfileKey);
        if (!profile) {
          this.fermentClockStamp = nowS;
          return;
        }

        const tempK = MixinApi.isThermal(self)
          ? self.getTemperature().rawValue()
          : DEFAULT_ROOM_K;
        const days = elapsed / SECONDS_PER_GAME_DAY;
        const open = MixinApi.isSealable(self) ? self.isOpen() : true;

        if (this.fermentPhase === 'active') {
          // Heat hurts the wash whether or not it is converting; cold
          // merely stalls (forgiving, D3).
          const sat = damageSat(profile, tempK);
          if (sat < this._worstStretch) this._worstStretch = sat;
          const converting = profile.getSealedOnly() ? !open : true;
          if (converting) {
            this.fractionConverted = Math.min(
              1,
              this.fractionConverted + rateAt(profile, tempK) * days,
            );
          }
          this.applyBatchGrade();
          if (this.fractionConverted >= 1) {
            this.fermentPhase = 'finished';
            this.ensureInteriorMaterial(profile.getProductMaterial());
          }
        } else if (this.fermentPhase === 'finished') {
          // Retry a product swap that couldn't land (material not live).
          this.ensureInteriorMaterial(profile.getProductMaterial());
          const turnedMaterial = profile.getTurnedMaterial();
          if (open && turnedMaterial) {
            this.turnedDays += days;
            if (this.turnedDays >= profile.getTurnDays()) {
              this.fermentPhase = 'turned';
              this.ensureInteriorMaterial(turnedMaterial);
            }
          }
        }
        this.fermentClockStamp = nowS;
      } finally {
        this._reconcilingFerment = false;
      }
    }

    // ---------- reads (each drives the reconcile) ----------

    public getFermentPhase(): FermentPhase {
      this.reconcileFerment();
      return this.fermentPhase;
    }

    public getFractionConverted(): number {
      this.reconcileFerment();
      return this.fractionConverted;
    }

    public getStartingSugarGPerL(): number {
      return this.startingSugarGPerL;
    }

    public getRemainingSugarGPerL(): number {
      this.reconcileFerment();
      return this.startingSugarGPerL * (1 - this.fractionConverted);
    }

    public getGravity(): number {
      return 1 + this.getRemainingSugarGPerL() * GRAVITY_PER_SUGAR_G_PER_L;
    }

    public getAbvPercent(): number {
      this.reconcileFerment();
      return (
        (this.startingSugarGPerL * this.fractionConverted) /
        SUGAR_G_PER_L_PER_ABV_PCT
      );
    }

    public getWorstStretch(): number {
      this.reconcileFerment();
      return clamp01(this._worstStretch);
    }

    public getFermentProfileKey(): string {
      return this.fermentProfileKey;
    }

    public getFermentProfile(): FermentProfile | null {
      return FermentApi.profileByKey(this.fermentProfileKey);
    }

    // ---------- batch lifecycle (host-internal) ----------

    /**
     * Key a fresh batch to `materialPath`. When the material singleton
     * is not live yet, the key stays null so the next reconcile
     * retries rather than latching a sugarless idle forever.
     */
    private startBatch(materialPath: string, nowS: number): void {
      this.fractionConverted = 0;
      this._worstStretch = 1;
      this.turnedDays = 0;
      this.fermentClockStamp = nowS;
      const material = StuffApi.findByTemplatePath<Material>(materialPath);
      if (!material) {
        this.batchMaterialPath = null;
        this.fermentProfileKey = '';
        this.startingSugarGPerL = 0;
        this.fermentPhase = 'idle';
        return;
      }
      this.batchMaterialPath = materialPath;
      const profile = FermentApi.profileFor(material);
      this.fermentProfileKey = profile?.getKey() ?? '';
      this.startingSugarGPerL = material.getNutrientAmounts()['sugar'] ?? 0;
      this.fermentPhase =
        profile !== null && this.startingSugarGPerL > 0 ? 'active' : 'idle';
      if (this.fermentPhase === 'active' && profile !== null) {
        this.stampBatchMark(profile, nowS);
      }
    }

    private resetBatch(): void {
      this.fermentPhase = 'idle';
      this.fermentProfileKey = '';
      this.batchMaterialPath = null;
      this.startingSugarGPerL = 0;
      this.fractionConverted = 0;
      this._worstStretch = 1;
      this.turnedDays = 0;
    }

    /**
     * Stamp the batch's mark on a Crafted host: the maker is whatever
     * the W0 transfer seam carried IN with the must (the crusher's
     * mark), else the acting author when the fill's execution context
     * is live — never the wire. The recipe field records the ferment
     * itself; the band is the reconcile's (worst stretch).
     */
    private stampBatchMark(profile: FermentProfile, nowS: number): void {
      const self = this as unknown as Stuff;
      if (!MixinApi.isCrafted(self)) return;
      const crafted = self as Stuff & Crafted;
      if (crafted.getMaker() === '') {
        const author = ExecutionContextApi.getActingAuthor() as {
          getTemplatePath?: () => string | null;
        } | null;
        const path =
          author && typeof author.getTemplatePath === 'function'
            ? author.getTemplatePath()
            : null;
        if (path) crafted.setMaker(path);
      }
      crafted.setRecipe(`ferment:${profile.getKey()}`);
      crafted.setCraftedAt(nowS);
    }

    /** Write the derived band onto the host's Graded face. */
    private applyBatchGrade(): void {
      const self = this as unknown as Stuff;
      if (!MixinApi.isGraded(self)) return;
      self.setGrade(Grade.of(bandFor(clamp01(this._worstStretch))));
    }

    /**
     * Swap the interior to `path` (product at `finished`, vinegar at
     * `turned`), updating the batch key so the swap never reads as a
     * fresh fill. Idempotent; a not-yet-live material is retried on
     * the next reconcile.
     */
    private ensureInteriorMaterial(path: string): void {
      if (!path) return;
      const self = this as unknown as Stuff;
      if (!MixinApi.isBulkable(self)) return;
      if (self.getBulkMaterialPath('interior') === path) {
        this.batchMaterialPath = path;
        return;
      }
      const material = StuffApi.findByTemplatePath<Material>(path);
      if (!material) return;
      self.setBulkMaterial('interior', material);
      this.batchMaterialPath = path;
    }

    /** Game-seconds now, or `null` when no world clock is running. */
    private fermentNowSeconds(): number | null {
      if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
        return null;
      }
      return WorldClockApi.getNow().rawValue();
    }
  };
}
