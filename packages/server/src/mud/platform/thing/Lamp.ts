/**
 * Lamp — a light that **burns fuel**: a lantern, a torch, an oil lamp.
 *
 * ⭐ A lamp is a small furnace with a light on it, and composing it that
 * way is the whole design. `FurnaceMixin` already owns everything a
 * fuelled light needs and owns it once: a `'fuel'` Reserve that drains
 * against game time, reconcile-on-read so an unattended lamp burns down
 * correctly with nobody watching, the burnout edge that sets `lit=false`
 * and restamps, `ignite`/`douse` through `FireApi`, and — since the
 * envelope build — the gate that makes `getEmittedFlux()` answer zero
 * while it is out. None of that is written here.
 *
 * Composition: `Furnace + LightSource + Detailed + Reserved + Thermal`
 * over a `Thing`. **Order is load-bearing**: `FurnaceMixin` outermost,
 * so its `getEmittedFlux` override wraps `LightSourceMixin`'s and a
 * doused lamp is dark.
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

import Thing from '../../lib/stuff/Thing';
import { DetailedMixin } from '../../lib/description/Detailed';
import { ReservedMixin } from '../../lib/reserve';
import { LightSourceMixin } from '../../lib/perception/LightSource';
import { ThermalMixin } from '../../lib/thermal/Thermal';
import { FurnaceMixin } from '../../lib/fire/Furnace';

/**
 * Lamp dials. Playtest-tuned, not plan decisions.
 *
 * `BURN_RATE_PER_MIN` is sized so a full lantern burns roughly a game
 * night: the `'fuel'` Reserve is 0..100 %, a game night is ~12 game
 * hours = 720 game minutes, and 0.15 %/min empties it in ~11 hours. A
 * lamp you fill at dusk is guttering by dawn, which is the point — it
 * is the reason a town buys street lighting rather than handing
 * everybody a lantern.
 */
const LAMP = {
  /** Case temperature (K) while lit — below the scalding hook. */
  BURN_TEMPERATURE_K: 330,
  /** Fuel burn rate (`%`/game-min) — a full lamp lasts a game night. */
  BURN_RATE_PER_MIN: 0.15,
} as const;

const LampBase = FurnaceMixin(
  LightSourceMixin(DetailedMixin(ReservedMixin(ThermalMixin(Thing)))),
);

export default class Lamp extends LampBase {
  /**
   * ⚠ `FurnaceMixin.lit` defaults **true** and `burnTemperatureK`
   * defaults to 800 K — both right for a forge and wrong for a lantern
   * on a shop shelf. A Lamp therefore ships **cold and out**, and a row
   * that wants otherwise says so.
   *
   * `lint:light-sources` clause (g) refuses a Lamp row that omits
   * `lit:` either way, so the state is never a default nobody chose.
   */
  public override lit = false;
  public override burnTemperatureK: number = LAMP.BURN_TEMPERATURE_K;
  public override fuelBurnRatePerMin: number = LAMP.BURN_RATE_PER_MIN;
}
