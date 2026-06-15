/**
 * Campfire — the third instance of active-generation-over-passive-
 * Thermal (after the body furnace and the endotherm): a combustion layer
 * that pins its Thermal temperature *hot* while fuel remains, then
 * releases to a passive cooling-embers object on burnout.
 *
 * Composition: `ThermalMixin + LightSourceMixin + Postured(warming
 * log-seats) + Reserved(fuel)` over a `Thing`. A content-theme `fuel`
 * reserve (`theme: 'combustion'`) depletes lazily against game-time; while
 * `fuel > 0` `getTemperature()` is **pinned** at the burn temperature (the
 * furnace holds it above ambient), so its surface sits in the scalding
 * band and contact burns through the **general** Step-1.9 hook (no
 * campfire-local burn code). On burnout the pin releases — the fire
 * freezes at the burn temperature and cools toward ambient as plain
 * Thermal embers.
 *
 * Warmth reaches bodies through the **warming-slot `warmth` attribute**
 * (a log-seat authors both `restQuality` and `warmth`), read by the
 * body's effective-ambient resolver — radiant warmth as a constant slot
 * attribute, not the live fire temperature.
 */

import Thing from '../lib/stuff/Thing';
import { SlottedMixin } from '../lib/slot/Slotted';
import { PosturedMixin } from '../lib/slot/Postured';
import { ReservedMixin } from '../lib/reserve';
import { LightSourceMixin } from '../lib/perception/LightSource';
import { ThermalMixin, THERMAL_DEFAULTS } from '../lib/thermal/Thermal';
import { Quantity } from '../lib/quantity';
import { StuffApi } from '../api/stuff';
import { WorldClockApi } from '../api/worldclock';
import { TemplatePaths } from '../lib/paths';

const CampfireBase = ThermalMixin(
  LightSourceMixin(ReservedMixin(PosturedMixin(SlottedMixin(Thing)))),
);

/** Campfire combustion dials. Playtest-tuned, not plan decisions. */
const CAMPFIRE = {
  /** Burn temperature (K) the fire pins to while fuel remains (~530 °C). */
  BURN_TEMP_K: 800,
  /** Fuel burn rate (`%`-points per game-minute). */
  BURN_RATE_PER_MIN: 0.5,
} as const;

export default class Campfire extends CampfireBase {
  /** Game-time (seconds) of the last fuel reconcile; 0 = unseeded. */
  public fuelClockStamp = 0;

  static persistentFields = ['fuelClockStamp'];

  /**
   * Pinned hot while fuel remains; passive embers once it floors.
   * Reconciles the fuel burn first so a long-unobserved fire reflects
   * its depletion on the next read.
   */
  override getTemperature(): Quantity<'K'> {
    this.reconcileFuel();
    if (this.fuelRemaining() > 0) {
      return Quantity.of(CAMPFIRE.BURN_TEMP_K, 'K');
    }
    return super.getTemperature();
  }

  /** Current fuel level (`%`), or 0 when the fire carries no fuel reserve. */
  public fuelRemaining(): number {
    return this.getReserve('fuel')?.current.rawValue() ?? 0;
  }

  /**
   * Deplete fuel against elapsed game-time. On the burnout edge (fuel
   * crossing to zero) freeze the Thermal stamp at the burn temperature
   * so the embers cool *from* hot, not from the default stamp.
   */
  protected reconcileFuel(): void {
    const now = this.fuelNowSeconds();
    if (now === null) return;
    if (this.fuelClockStamp === 0) {
      this.fuelClockStamp = now;
      return;
    }
    const elapsed = now - this.fuelClockStamp;
    if (elapsed <= 0 || elapsed > THERMAL_DEFAULTS.MAX_REASONABLE_GAP_SEC) {
      this.fuelClockStamp = now;
      return;
    }
    const before = this.fuelRemaining();
    if (before > 0) {
      const burned = CAMPFIRE.BURN_RATE_PER_MIN * (elapsed / 60);
      this.adjustReserve('fuel', Quantity.of(-burned, '%'));
      if (this.fuelRemaining() <= 0) {
        // Burnout edge — release the pin at the burn temperature.
        this.setContentsTemperature(CAMPFIRE.BURN_TEMP_K);
      }
    }
    this.fuelClockStamp = now;
  }

  /** In-session game-time (seconds), or null when no world clock runs. */
  protected fuelNowSeconds(): number | null {
    if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
      return null;
    }
    return WorldClockApi.getNow().rawValue();
  }
}
