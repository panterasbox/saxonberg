/**
 * CombustibleMixin — the **combustion capability** on matter: a flammable
 * object that carries a fuel {@link Reserve} and, when driven past its
 * (wetness-adjusted) ignition point, catches fire and holds a {@link Burning}
 * active state until a fire-triangle leg (fuel / oxygen / heat) fails.
 *
 * **Reads its material, not authored coefficients.** The ignition point and
 * fuel value come from the object's `Material`
 * (`autoignitionTemperature` / `heatOfCombustion`) via `MaterialApi` — a
 * wooden log is Combustible and its oak lends `570 K` / `16 MJ/kg`; a stone
 * simply isn't Combustible. Per-instance state (the fuel level, the Burning
 * flag) lives here.
 *
 * **Composed OUTSIDE `ThermalMixin` + `ReservedMixin`** (+ optionally
 * `WetMixin`): it overrides `getTemperature()` to pin the flame temperature
 * while aflame (the `Campfire` precedent, generalized) and delegates to
 * `super` (the passive cooling embers) once out. The fuel drain is
 * reconcile-on-read over game-time — a fire left alone burns down to char even
 * unobserved-since-last-read; the presence-gated fire tick ({@link FireApi})
 * is the authoritative spread + air driver on top.
 *
 * **The gated `FireLogic` is the single external writer** of the Burning state
 * (ignite / douse / the completeness verdict): those mutators are `ApiOnly`.
 * The host's own reconcile-on-read burnout is internal.
 *
 * See docs/subsystems/fire.md.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Thermal } from '../thermal/Thermal';
import type { Reserved } from '../reserve';
import { Quantity } from '../quantity';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import { TemplatePaths } from '../paths';
import { CallSecurity, Final, Unshadowable } from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';
import { Burning, type BurningStored } from './Burning';
// eslint-disable-next-line no-restricted-imports -- the F1 object face: Combustible's ignite()/douse()/advanceBurn() forward into the fire logic singleton exactly as the api/fire facade does (the mixin is the subsystem's instance face; Energized is the D3 precedent)
import { FireLogic } from '../../platform/idea/api/FireLogic';
import type { IgniteOutcome } from '../../api/fire';

/** Resolve the HMR-able FireLogic singleton (the combustion driver). */
function fireLogic(): FireLogic {
  return StuffApi.singletonSync('/platform/idea/api/fire', () => new FireLogic());
}

/** Fire dials with seeded-literal fallbacks (pre-warm / test safe). */
const FIRE_DEFAULTS = {
  /** Far-past absence guard (game-seconds) — reuse the thermal/wet guard. */
  MAX_REASONABLE_GAP_SEC: 4 * 3600,
} as const;

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

/**
 * The Combustible capability surface. Reads are the contract; the Burning
 * state is written only by the gated `FireLogic` (the `_`-prefixed mutators).
 */
export interface Combustible {
  /** Is the object currently on fire? */
  isBurning(): boolean;
  /** The active Burning state, or null when not aflame. */
  getBurning(): Burning | null;
  /** Fuel remaining (`%` of the `'fuel'` Reserve; 0 = spent). */
  getFuelRemaining(): number;
  /** The object's base autoignition temperature (from its material). */
  getAutoignitionTemperatureK(): number;
  /**
   * The wetness-adjusted autoignition temperature (K) — the base point raised
   * by the latent heat needed to boil off the water the object holds.
   */
  getEffectiveAutoignitionK(): number;
  /** The temperature (K) the object holds while aflame. */
  getFlameTemperatureK(): number;
  /** Current temperature (from the composed `ThermalMixin`; pinned while
   * aflame). A Combustible is always a Thermal by construction. */
  getTemperature(): Quantity<'K'>;
  /** A structural object (a door, a bridge) that DESTRUCTS on burn-through. */
  isStructural(): boolean;
  /** The `Material` path the object becomes when it burns out (ash / char). */
  getCharMaterialPath(): string | null;
  /** A structural object has burned through → the tick should destruct it. */
  hasBurnedThrough(): boolean;

  setStructural(value: boolean): void;
  setCharMaterialPath(value: string | null): void;

  /** Reconcile the fuel drain over elapsed game-time (reconcile-on-read). */
  reconcileBurning(): void;

  // The combustion face (F1) — forwards into the FireLogic driver.
  /** Deliberate ignition; `{lit:false, reason}` on refusal. */
  ignite(): IgniteOutcome;
  /** Heat-threshold autoignition; returns whether it lit. */
  tryAutoignite(): boolean;
  /** The water/wet extinguisher; returns whether anything was doused. */
  douse(): boolean;
  /** Advance one burning tick (fuel drain / char / burn-through). */
  advanceBurn(): void;

  // Gated (`FireLogic`-only) Burning-state writers.
  _igniteState(nowGameSec: number, complete: boolean): void;
  _extinguishState(): void;
  _setComplete(complete: boolean): void;
}

export function CombustibleMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  class CombustibleMixin extends Base implements Combustible {
    static _mixinName = 'CombustibleMixin';

    static fieldMeta: FieldMeta = {
      burning: { persistent: true, runtimeState: true },
      charMaterialPath: { persistent: true, authorable: true },
      structural: { persistent: true, authorable: true },
      burnClockStamp: { persistent: true, runtimeState: true },
      burnedThrough: { persistent: true, runtimeState: true },
    };

    /**
     * The active Burning state (decomposed flat form), or null when out.
     *
     * Written by the gated `FireLogic` + reconcile-on-read.
     */
    public burning: BurningStored | null = null;

    /**
     * The `Material` path this object becomes when it burns out — ash / char
     * (embers then cool as passive Thermal). Null = leaves its material as-is.
     */
    public charMaterialPath: string | null = null;

    /**
     * A **structural** combustible — a door, a rope bridge — that DESTRUCTS on
     * burn-through rather than charring in place. Content decides the
     * after-state (a burned exit) via the `hasBurnedThrough` seam.
     */
    public structural: boolean = false;

    /**
     * Game-time (seconds) of the last fuel reconcile; 0 = unseeded.
     */
    public burnClockStamp = 0;

    /**
     * A structural object has burned through — latched for the fire tick to
     * destruct (destruct from the reconcile-on-read path is unsafe).
     */
    public burnedThrough = false;

    /**
     * This host, typed for the sibling-mixin members the call-security proxy
     * resolves at runtime. The cast is the mixin-super idiom: `Base` is
     * generic, so the composed `ThermalMixin` / `ReservedMixin` members aren't
     * visible to the type system, only unified by the runtime proxy.
     * Centralised here so the assertion lives in one place.
     */
    private get fireHost(): Stuff & Thermal & Reserved {
      return this as unknown as Stuff & Thermal & Reserved;
    }

    // ---------- reads ----------

    public isBurning(): boolean {
      return this.burning !== null;
    }

    public getBurning(): Burning | null {
      return this.burning ? Burning.fromStored(this.burning) : null;
    }

    public getFuelRemaining(): number {
      return this.fireHost.getReserve('fuel')?.current.rawValue() ?? 0;
    }

    public getAutoignitionTemperatureK(): number {
      const self = this as unknown as Stuff;
      const mat = MixinApi.isTangible(self) ? self.getMaterial() : null;
      return mat ? mat.getAutoignitionTemperature().rawValue() : 0;
    }

    public getEffectiveAutoignitionK(): number {
      const base = this.getAutoignitionTemperatureK();
      if (base <= 0) return 0; // non-flammable material — never ignites
      return base + this.wetPenaltyK();
    }

    /**
     * The extra temperature (K) the held water raises the ignition threshold
     * by. Mass-independent: `ΔT = saturation × capacity% × L_vap / c` (the fuel
     * mass cancels between the water-boil energy and the thermal capacity), so
     * a soaked log resists ignition regardless of its size — the wet-firewood
     * the weather tail deferred, now derived.
     */
    private wetPenaltyK(): number {
      const self = this as unknown as Stuff;
      if (!MixinApi.isWet(self)) return 0;
      const saturation = self.getWetness();
      if (saturation <= 0) return 0;
      const mat = MixinApi.isTangible(self) ? self.getMaterial() : null;
      if (!mat) return 0;
      const capacityFraction = mat.getWaterAbsorptionCapacity().rawValue() / 100;
      const c = mat.getSpecificHeat().rawValue();
      if (c <= 0) return 0;
      const lVap = dial(
        AppSettingKeys.fireIgnitionWaterLatentHeatJPerKg,
        2260000,
      );
      return (saturation * capacityFraction * lVap) / c;
    }

    public getFlameTemperatureK(): number {
      // Complete combustion (enough air) burns hot; incomplete (starved) runs
      // cooler — the forge's why. Defaults to complete when not aflame (for the
      // burnout stamp freeze).
      const complete = this.burning === null || this.burning.complete !== false;
      return complete
        ? dial(AppSettingKeys.fireFlameTemperatureK, 1000)
        : dial(AppSettingKeys.fireFlameTemperatureIncompleteK, 750);
    }

    public isStructural(): boolean {
      return this.structural;
    }

    public getCharMaterialPath(): string | null {
      return this.charMaterialPath;
    }

    public hasBurnedThrough(): boolean {
      return this.burnedThrough;
    }

    public setStructural(value: boolean): void {
      this.structural = value === true;
    }

    public setCharMaterialPath(value: string | null): void {
      this.charMaterialPath = value ?? null;
    }

    // ---------- the pinned-hot temperature read ----------

    /**
     * Pinned to the flame temperature while aflame (reconciling the fuel drain
     * first), the passive cooling embers once out — the generalized `Campfire`
     * pin, but keyed on the Burning flag, not sustained fuel presence.
     */
    getTemperature(): Quantity<'K'> {
      this.reconcileBurning();
      if (this.isBurning()) {
        return Quantity.of(this.getFlameTemperatureK(), 'K');
      }
      // The mixin-super idiom: `Base` is generic, so the composed
      // `ThermalMixin.getTemperature` isn't statically visible — resolve it at
      // runtime (the passive cooling embers once the fire is out).
      return (super.getTemperature as () => Quantity<'K'>).call(this);
    }

    // ---------- reconcile-on-read (fuel drain + burnout) ----------

    public reconcileBurning(): void {
      if (!this.isBurning()) return;
      const now = fireNowSeconds();
      if (now === null) return;
      if (this.burnClockStamp === 0) {
        this.burnClockStamp = now;
        return;
      }
      const elapsed = now - this.burnClockStamp;
      if (elapsed <= 0 || elapsed > FIRE_DEFAULTS.MAX_REASONABLE_GAP_SEC) {
        this.burnClockStamp = now;
        return;
      }
      if (this.fireHost.hasReserve('fuel') && this.getFuelRemaining() > 0) {
        const burned =
          dial(AppSettingKeys.fireBurnRatePerMin, 0.5) * (elapsed / 60);
        this.fireHost.adjustReserve('fuel', Quantity.of(-burned, '%'));
      }
      if (this.getFuelRemaining() <= 0) {
        this.burnOut();
      }
      this.burnClockStamp = now;
    }

    /**
     * Fuel-exhaustion burnout — freeze the Thermal stamp at the flame
     * temperature (so the embers cool *from* hot), clear the Burning state, and
     * either char the material (a log → ash) or latch `burnedThrough` for the
     * tick to destruct (a structural door). Internal — the host acting on its
     * own state, not an external write.
     */
    private burnOut(): void {
      this.fireHost.setContentsTemperature(this.getFlameTemperatureK());
      this.burning = null;
      if (this.structural) {
        this.burnedThrough = true;
        return;
      }
      if (this.charMaterialPath) {
        const self = this as unknown as Stuff;
        const char = StuffApi.findByTemplatePath(this.charMaterialPath);
        if (char && MixinApi.isTangible(self)) {
          self.setMaterial(char as never);
        }
      }
    }

    // ---------- the combustion face (forwards into FireLogic) ----------

    /**
     * Deliberate ignition (the `ignite` verb): a hand-flame lights a
     * flammable, dry-enough object. Returns `{lit:true}` on success, or
     * `{lit:false, reason}`. Sealed — the combustion driver is the one
     * writer of Burning state.
     */
    @Final
    @Unshadowable
    public ignite(): IgniteOutcome {
      return fireLogic().ignite(this as unknown as Stuff);
    }

    /**
     * Heat-threshold autoignition — ignites iff temperature has crossed
     * the (wetness-adjusted) autoignition point and fuel remains.
     * Returns whether it lit.
     */
    @Final
    @Unshadowable
    public tryAutoignite(): boolean {
      return fireLogic().tryAutoignite(this as unknown as Stuff);
    }

    /**
     * The water/wet extinguisher: puts the fire out and wets the object
     * so it resists re-ignition until dried. Returns whether anything
     * was doused.
     */
    @Final
    @Unshadowable
    public douse(): boolean {
      return fireLogic().douse(this as unknown as Stuff);
    }

    /**
     * Advance one burning tick — drain fuel (self-extinguishing +
     * charring / destructing at exhaustion). The presence-gated fire
     * tick fans this out; a lone object also reconciles-on-read.
     */
    @Final
    @Unshadowable
    public advanceBurn(): void {
      fireLogic().advance(this as unknown as Stuff);
    }

    // ---------- gated Burning-state writers (FireLogic only) ----------

    @CallSecurity(SecurityPolicies.ApiOnly)
    @Final
    @Unshadowable
    public _igniteState(nowGameSec: number, complete: boolean): void {
      this.burning = new Burning(nowGameSec, complete).toStored();
      this.burnClockStamp = nowGameSec;
      this.burnedThrough = false;
    }

    @CallSecurity(SecurityPolicies.ApiOnly)
    @Final
    @Unshadowable
    public _extinguishState(): void {
      if (this.burning === null) return;
      // Freeze the stamp at the flame temperature so it cools from hot.
      this.fireHost.setContentsTemperature(this.getFlameTemperatureK());
      this.burning = null;
    }

    @CallSecurity(SecurityPolicies.ApiOnly)
    @Final
    @Unshadowable
    public _setComplete(complete: boolean): void {
      if (this.burning === null) return;
      this.burning = Burning.fromStored(this.burning)
        .withComplete(complete)
        .toStored();
    }
  }

  return CombustibleMixin;
}

/** In-session game-time (seconds), or null when no world clock runs. */
function fireNowSeconds(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
    return null;
  }
  return WorldClockApi.getNow().rawValue();
}
