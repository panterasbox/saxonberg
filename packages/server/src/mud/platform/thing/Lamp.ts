/**
 * Lamp — a light that **burns fuel**: a lantern, a torch, an oil lamp.
 *
 * ⭐ A lamp is a small furnace with a light on it, and composing it that
 * way is the whole design. `BurnerMixin` already owns everything a
 * fuelled light needs and owns it once: the fuel that drains against
 * game time, reconcile-on-read so an unattended lamp burns down
 * correctly with nobody watching, the burnout edge that sets `lit=false`
 * and restamps, `ignite`/`douse` through `FireApi`, and the gate that
 * makes `getEmittedFlux()` answer zero while it is out. None of that is
 * written here.
 *
 * Composition: `Burner + LightSource + Bulkable + Thermal` over a
 * `Good`. **Order is load-bearing**: `BurnerMixin` outermost, so its
 * `getEmittedFlux` override wraps `LightSourceMixin`'s and a doused lamp
 * is dark.
 *
 * ## ⭐⭐ Its interior IS its tank — the one `fuelSlot()` override
 *
 * A lantern is filled, not stoked. `BurnerMixin.fuelSlot()` is a
 * protected hook that answers `null` by default — matter goes on a grate
 * — and this class answers with its own bulk interior, so `fill lantern
 * from cask` is the whole fuelling act and `stoke lantern` is refused as
 * `no-bed`.
 *
 * ⚠ It is a HOOK and not an `isBulkable` test at the call site, because
 * `trade-distilling`'s `Still` is also a `Bulkable` `Burner` and its
 * interior is the **wash**. A runtime test would have made every still
 * drink its own charge as fuel; a class-level declaration lets each
 * vessel say what it IS. The `Still` does not override it.
 *
 * ⭐ And the same override is what lets a lamp burn GAS: fill it from a
 * gasometer and it runs on coal gas, dim — because a clean flame sheds
 * little light, which is the mantle problem arriving by itself rather
 * than being authored.
 *
 * ## What this replaces
 *
 * ⚠ Until 2026-09-24 this file held a **street lamppost** — a
 * `Switchable` on a fixed `DUSK_HOUR 18 / DAWN_HOUR 6` clock schedule,
 * which no content row anywhere named and nothing could reach. The
 * envelope build retired it: a town's lamps are a **property of the
 * street** (`PublicLightingMixin`) and prose beside it, because nobody
 * binds a street lamp and minting one identical fuelled object per
 * street would be forty-one fuel reserves reconciling to produce the
 * same number. This class is the other half of that split — the light
 * somebody actually picks up, fills and runs out of.
 *
 * `PortableLight` stays for lights that burn **nothing**: the glowcap
 * jar and its fixture, which are a fungus.
 *
 * ## Heat
 *
 * A lamp's `burnTemperatureK` defaults to **330 K** — the case, not the
 * flame. That is deliberately below the 345 K scalding hook, so `get`
 * and `feel` on a lit lantern do not burn a hand. The consequence to
 * know about: the fire tick deposits toward 330 K into any `Meltable`
 * standing beside a lit lamp, which is honest at that temperature (wax
 * softens, ice melts) and is noted in `fire.md`.
 */

import Good from '../../lib/stuff/Good';
import { BulkableMixin } from '../../lib/bulk/Bulkable';
import type { BulkSlot } from '../../lib/bulk/Bulkable';
import { LightSourceMixin } from '../../lib/perception/LightSource';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { BurnerMixin } from '../../lib/fire/Burner';
import { MixinApi } from '../../api/mixin';

/**
 * Lamp dials. Playtest-tuned, not plan decisions.
 *
 * ⭐ `MAX_BURN_POWER_W` is sized so a full lantern burns roughly a game
 * night, which is what the prose below has always promised: half a litre
 * of lamp oil is 410 g at 43 MJ/kg ≈ 17.6 MJ, and 300 W spends that in
 * ~16 game hours at full wick. A lamp filled at dusk is guttering by
 * dawn — which is the reason a town buys street lighting rather than
 * handing everybody a lantern.
 *
 * ⚠ The figure that matters is that it is **two orders of magnitude**
 * below a forge's 20 kW, which is what makes a lamp a lamp: the same
 * mechanism, the same verbs, one number. A candle's row drops it to 80 W
 * (the classic figure for a candle) and a torch's raises it.
 */
const LAMP = {
  /** Case temperature (K) while lit — below the scalding hook. */
  BURN_TEMPERATURE_K: 330,
  /** The wick's power at full draught (W). */
  MAX_BURN_POWER_W: 300,
} as const;

const LampBase = BurnerMixin(
  LightSourceMixin(BulkableMixin(ThermalMixin(Good))),
);

export default class Lamp extends LampBase {
  /**
   * ⚠ `BurnerMixin.lit` defaults **true** and `burnTemperatureK`
   * defaults to 800 K — both right for a forge and wrong for a lantern
   * on a shop shelf. A Lamp therefore ships **cold and out**, and a row
   * that wants otherwise says so.
   *
   * `lint:light-sources` clause (g) refuses a Lamp row that omits
   * `lit:` either way, so the state is never a default nobody chose.
   */
  public override lit = false;
  public override burnTemperatureK: number = LAMP.BURN_TEMPERATURE_K;
  public override maxBurnPowerW: number = LAMP.MAX_BURN_POWER_W;

  /**
   * ⭐⭐ **This vessel's interior is its fuel tank.** A lantern is filled
   * from a cask or a gasometer; a torch is not (it is a bundle of pitchy
   * wood, so its row seeds a `fuelBed` and leaves `interiorBulk` off).
   * The hook answers for both off the same class, which is why a torch
   * and a lantern are one class and two rows.
   */
  protected override fuelSlot(): BulkSlot | null {
    const self = this as unknown as Lamp;
    if (!MixinApi.isBulkable(self)) return null;
    if (self.getBulkCapacity('interior') === null) return null;
    return self.getBulk('interior');
  }
}
