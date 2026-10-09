/**
 * WorkedFlame — ⭐⭐⭐ **a conjured fire, and the heat-side proof of a carve
 * the sim already made.**
 *
 * {@link GlowlightMote}'s own docstring states the carve: *"Light only,
 * deliberately no heat — the sim decouples them (the Light-split-from-
 * Fire carve), so a glowlight warms nothing and never ignites
 * anything."* That proves the decoupling on the light side. This is the
 * other side: heat and fire with no authored exception from the physics
 * that governs a hearth.
 *
 * **What it is, and everything else follows from it:** a `Burner` whose
 * `fuelSource()` is `worked` rather than a bed. There is no matter in
 * it, so —
 *
 *  - **nothing to stoke**, and nothing to run out of;
 *  - **no soot**, because nothing is incompletely burning — so it is
 *    DIM (the clean-flame floor), and ⭐ a player can tell a worked fire
 *    from a real one by looking at it;
 *  - ⭐⭐ **it still spends the room's air**, because conservation is not
 *    something magic is exempt from. A worked fire in a sealed cellar is
 *    exactly as dangerous as a real one and smothers itself the same
 *    way.
 *
 * ⚠ And `flameEnclosed` is **false**: a conjured flame will set off
 * firedamp. That is honest — it is a flame — and it teaches, because a
 * caster who thinks magic exempts them from the gas learns otherwise in
 * the one place it matters.
 *
 * ## Why this ships rather than being deferred
 *
 * `BurnerMixin.fuelSource()` is a protected `@hook` whether or not this
 * class exists. Cutting it would ship a kernel hook with a `worked`
 * branch and **nothing exercising it** — this repo's most-repeated
 * failure (`feel`/`taste` shipped and never ran; the reference-Idea
 * roster went inert three separate times) — and would leave the hook
 * with one implementer plus a dead branch, which means it should not be
 * a hook at all.
 *
 * Cloned from `/stuff/thing/magic/worked-flame` by the emit-field
 * executor, which requires only `isLightSource` of a locus — so a
 * `Burner`-composing locus is a valid target with **no kernel magic
 * edit**.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { LightSourceMixin } from '@saxonberg/server/mud/lib/perception/LightSource';
import { ThermalMixin } from '@saxonberg/server/mud/lib/thermal/Thermal';
import { BurnerMixin } from '@saxonberg/server/mud/lib/fire/Burner';
import type { FuelSource } from '@saxonberg/server/mud/lib/fire/Burner';

/**
 * Flame dials. ⚠ `burnTemperatureK` is the VESSEL ceiling, and for a
 * worked flame there is no fuel to cap it — so this number is the whole
 * of how hot the working runs. 900 K is a good cooking fire and nowhere
 * near working iron, which keeps the Fire school from being a free
 * forge; a hotter working is a hotter spell, and that is the school's
 * decision to make.
 */
const WORKED = {
  BURN_TEMPERATURE_K: 900,
  MAX_BURN_POWER_W: 2000,
} as const;

const WorkedFlameBase = BurnerMixin(LightSourceMixin(ThermalMixin(Good)));

export default class WorkedFlame extends WorkedFlameBase {
  /**
   * ⚠ Lit on arrival, unlike every other `Burner` row in the game. A
   * conjured flame is conjured BURNING — there is nothing to strike, and
   * a mote that arrived cold would be waiting for a match nobody has.
   * `lint:light-sources` clause (g) wants the state said either way, and
   * this is the one place the answer is `true`.
   */
  public override lit = true;
  public override burnTemperatureK: number = WORKED.BURN_TEMPERATURE_K;
  public override maxBurnPowerW: number = WORKED.MAX_BURN_POWER_W;

  /**
   * ⭐⭐ The one override, and the whole class. `{kind: 'worked'}` is a
   * statement about what this object IS — not a runtime guard — which is
   * why `fuelSource()` is a hook on `BurnerMixin` and not an `isX` test
   * at the call site.
   */
  protected override fuelSource(): FuelSource {
    return { kind: 'worked' };
  }
}
