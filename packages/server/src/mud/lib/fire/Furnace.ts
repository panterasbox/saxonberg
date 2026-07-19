/**
 * FurnaceMixin — a **sustained heat source**: a `Combustible`-fuelled
 * appliance that holds a real, fuel-and-air-driven temperature while lit, then
 * releases to passive cooling embers on burnout. Generalizes the shipped
 * `Campfire`'s pinned-hot-while-fuelled pattern (`Campfire` is refactored onto
 * it, byte-identically) so `Forge` / `Kiln` / `Oven` compose the same
 * behaviour with different fuel + bellows dials — charcoal hotter than wood, a
 * bellows hotter still, smelting heat only with the bellows.
 *
 * **Composed OUTSIDE `ThermalMixin`** (+ `ReservedMixin` for the `'fuel'`
 * reserve): it overrides `getTemperature()` to pin the held temperature while
 * lit and fuelled, and delegates to `super` (the passive embers) once out. The
 * fuel drain is reconcile-on-read over game-time (the `Campfire` precedent). A
 * lit furnace also **heats the Meltables in its scope** (`heatContents`) toward
 * its held temperature and reconciles their phase — the forge melting an ingot.
 *
 * See docs/subsystems/fire.md + thermal.md.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Thermal } from '../thermal/Thermal';
import type { Reserved } from '../reserve';
import type { Container } from '../spatial/Container';
import { Quantity } from '../quantity';
import { MixinApi } from '../../api/mixin';
import { MaterialApi } from '../../api/material';
import { ThermalApi } from '../../api/thermal';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import { TemplatePaths } from '../paths';
import { CallSecurity, Final, Unshadowable } from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';

/** Furnace defaults (playtest-tuned, not plan decisions). */
const FURNACE_DEFAULTS = {
  /** Far-past absence guard (game-seconds). */
  MAX_REASONABLE_GAP_SEC: 4 * 3600,
  /** Default held temperature (K) — the Campfire pin (byte-compat). */
  DEFAULT_BURN_TEMPERATURE_K: 800,
  /** Default fuel burn rate (`%`-points per game-minute). */
  DEFAULT_BURN_RATE_PER_MIN: 0.5,
  /** Fraction of the temperature gap a lit furnace closes on a scope Meltable
   * per `heatContents` call (a lumped radiant-transfer coefficient). */
  HEAT_TRANSFER_FRACTION: 0.5,
} as const;

/** The furnace capability surface. */
export interface Furnace {
  /** Is the furnace currently alight? */
  isLit(): boolean;
  /** Fuel remaining (`%` of the `'fuel'` Reserve). */
  fuelRemaining(): number;
  /** The temperature (K) the furnace holds while lit + fuelled (bellows-scaled). */
  getHeldTemperatureK(): number;
  /** Is the bellows working (boosting the held temperature)? */
  isBellowsActive(): boolean;
  setBellowsActive(active: boolean): void;
  /** Reconcile the fuel drain over elapsed game-time (reconcile-on-read). */
  reconcileFurnaceFuel(): void;
  /** Heat the Meltables in the furnace's scope toward the held temperature and
   * reconcile their phase — the forge-melts-an-ingot driver. */
  heatContents(): void;

  // Authorable configuration.
  setBurnTemperatureK(value: number): void;
  setBellowsMultiplier(value: number): void;
  setFuelBurnRatePerMin(value: number): void;
  // Gated (Api) lit-state writer.
  _setLit(value: boolean): void;
}

export function FurnaceMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  class FurnaceMixin extends Base implements Furnace {
    static _mixinName = 'FurnaceMixin';

    static persistentFields = [
      'burnTemperatureK',
      'bellowsMultiplier',
      'bellowsActive',
      'lit',
      'fuelBurnRatePerMin',
      'furnaceFuelClockStamp',
    ];

    /** The base held temperature (K) while lit + fuelled. @authorable */
    public burnTemperatureK: number = FURNACE_DEFAULTS.DEFAULT_BURN_TEMPERATURE_K;
    /** The temperature multiplier applied when the bellows is working. @authorable */
    public bellowsMultiplier: number = 1;
    /** @runtimeState Is the bellows boosting right now. */
    public bellowsActive = false;
    /** @runtimeState Is the furnace alight (a Campfire seed starts lit). */
    public lit = true;
    /** Fuel burn rate (`%`/game-min). @authorable */
    public fuelBurnRatePerMin: number = FURNACE_DEFAULTS.DEFAULT_BURN_RATE_PER_MIN;
    /** @runtimeState Game-time (s) of the last fuel reconcile; 0 = unseeded. */
    public furnaceFuelClockStamp = 0;

    private get furnaceHost(): Stuff & Thermal & Reserved {
      return this as unknown as Stuff & Thermal & Reserved;
    }

    public isLit(): boolean {
      return this.lit;
    }

    public fuelRemaining(): number {
      return this.furnaceHost.getReserve('fuel')?.current.rawValue() ?? 0;
    }

    public getHeldTemperatureK(): number {
      const mult = this.bellowsActive ? this.bellowsMultiplier : 1;
      return this.burnTemperatureK * mult;
    }

    public isBellowsActive(): boolean {
      return this.bellowsActive;
    }

    public setBellowsActive(active: boolean): void {
      this.bellowsActive = active === true;
    }

    public setBurnTemperatureK(value: number): void {
      if (Number.isFinite(value) && value >= 0) this.burnTemperatureK = value;
    }
    public setBellowsMultiplier(value: number): void {
      if (Number.isFinite(value) && value >= 1) this.bellowsMultiplier = value;
    }
    public setFuelBurnRatePerMin(value: number): void {
      if (Number.isFinite(value) && value >= 0) this.fuelBurnRatePerMin = value;
    }

    // Pinned hot while lit + fuelled; passive embers otherwise.
    getTemperature(): Quantity<'K'> {
      this.reconcileFurnaceFuel();
      if (this.lit && this.fuelRemaining() > 0) {
        return Quantity.of(this.getHeldTemperatureK(), 'K');
      }
      return (super.getTemperature as () => Quantity<'K'>).call(this);
    }

    public reconcileFurnaceFuel(): void {
      const now = furnaceNowSeconds();
      if (now === null) return;
      if (this.furnaceFuelClockStamp === 0) {
        this.furnaceFuelClockStamp = now;
        return;
      }
      const elapsed = now - this.furnaceFuelClockStamp;
      if (elapsed <= 0 || elapsed > FURNACE_DEFAULTS.MAX_REASONABLE_GAP_SEC) {
        this.furnaceFuelClockStamp = now;
        return;
      }
      if (this.lit && this.fuelRemaining() > 0) {
        const burned = this.fuelBurnRatePerMin * (elapsed / 60);
        this.furnaceHost.adjustReserve('fuel', Quantity.of(-burned, '%'));
        if (this.fuelRemaining() <= 0) {
          // Burnout edge — release the pin at the held temperature, go dark.
          this.furnaceHost.setContentsTemperature(this.getHeldTemperatureK());
          this.lit = false;
        }
      }
      this.furnaceFuelClockStamp = now;
    }

    public heatContents(): void {
      if (!this.lit || this.fuelRemaining() <= 0) return;
      const held = this.getHeldTemperatureK();
      const scope = (this as unknown as { getContainer(): Stuff | null })
        .getContainer();
      if (scope === null || !MixinApi.isContainer(scope)) return;
      for (const occ of (scope as Stuff & Container).getContents()) {
        const s = occ as unknown as Stuff;
        if (s === (this as unknown as Stuff) || s.isDestroyed()) continue;
        if (!MixinApi.isThermal(s) || !MixinApi.isMeltable(s)) continue;
        const temp = s.getTemperature().rawValue();
        if (temp >= held) continue; // already at the furnace's heat
        const mat = MaterialApi.materialOf(s);
        const massKg = (s as unknown as { getMass(): Quantity<'kg'> })
          .getMass()
          .rawValue();
        let c = mat ? mat.getSpecificHeat().rawValue() : 0;
        if (c <= 0) c = 4186;
        const joules =
          (held - temp) * massKg * c * FURNACE_DEFAULTS.HEAT_TRANSFER_FRACTION;
        ThermalApi.depositHeat(s, joules);
        ThermalApi.reconcilePhase(s);
      }
    }

    @CallSecurity(SecurityPolicies.ApiOnly)
    @Final
    @Unshadowable
    public _setLit(value: boolean): void {
      this.lit = value === true;
    }
  }

  return FurnaceMixin;
}

/** In-session game-time (seconds), or null when no world clock runs. */
function furnaceNowSeconds(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
    return null;
  }
  return WorldClockApi.getNow().rawValue();
}
