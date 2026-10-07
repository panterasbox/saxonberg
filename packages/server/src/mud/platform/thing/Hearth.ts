/**
 * Hearth — ⭐⭐ **a fire whose entire purpose is the room.**
 *
 * The other half of a distinction `thermal.md` has protected since the
 * fire build, and which this class exists to keep protecting:
 *
 * > *A forge heats what you put IN it; a hearth heats where you stand.*
 *
 * The shipped rule — **a lit forge must not warm the room it stands
 * in** — is right: being inside the fire is not being near it, and a
 * smithy whose forge heated the air would be uninhabitable. The
 * envelope build does not break it to get a feature. It adds a
 * different KIND of object, and the difference is carried by
 * composition rather than by any code asking what something is:
 * `Hearth` and `Campfire` compose {@link SpaceHeatingMixin}; `Forge`,
 * `Oven` and `Kiln` do not, and the envelope narrows a room's contents
 * with `MixinApi.isSpaceHeating` without ever naming a class.
 *
 * Composition: `SpaceHeating + Burner + LightSource + Reserved +
 * Thermal + Placing` over a `Thing`.
 *
 *  - **`SpaceHeatingMixin` outermost**, so it can read the furnace face:
 *    a fire that has gone out warms nothing, and that should not take a
 *    second flag to say.
 *  - **`PlacingMixin`**, because a pot stands ON a hearth. ⚠ NOT
 *    `Container`: a hearth is not a chamber you put things inside, and
 *    that is the whole difference between it and an oven.
 *
 * Everything else is the mixins': the fuel Reserve that drains against
 * game time, the reconcile-on-read so an unattended fire burns down
 * with nobody watching, the burnout edge, `ignite`/`douse`, and the
 * gate that makes a dead hearth dark.
 *
 * A commons object: a second inn's fireplace is a ROW.
 */

import Firebox from '../../lib/fire/Firebox';
import { PlacingMixin } from '../../lib/spatial/Placing';
import { SpaceHeatingMixin } from '../../lib/thermal/SpaceHeating';

/**
 * Hearth dials. Playtest-tuned, not plan decisions.
 *
 * 700 K is a domestic wood fire rather than a forge's 1300 — hot enough
 * to cook over and to scald a hand, nowhere near working iron. The power
 * empties a full charge over about a game evening, which is what makes
 * feeding it a thing somebody has to do — and ⭐ since the fire build
 * `stoke` is how.
 */
const HEARTH = {
  BURN_TEMPERATURE_K: 700,
  /**
   * ⭐ 6 kW — a domestic fireplace, and the figure replaces a
   * `%`-per-minute rate that could not say how big the fire was. A 6 kg
   * oak charge at 6 kW lasts about four and a half game hours at full
   * draught and twenty times that banked, which is exactly the evening-
   * and-overnight shape the prose below already described.
   */
  MAX_BURN_POWER_W: 6000,
} as const;

// ⭐ A firebox that warms the ROOM — `SpaceHeating` composed OUTSIDE
// the chain, which is exactly the difference between a hearth and a
// forge: a lit forge heats what you put in it, a lit hearth heats the
// air. The difference is composed, not dialled.
const HearthBase = SpaceHeatingMixin(PlacingMixin(Firebox));

export default class Hearth extends HearthBase {
  /**
   * ⚠ `BurnerMixin.lit` defaults **true**, which is right for the
   * Campfire seed it was written for and wrong for a hearth in an empty
   * room. A hearth ships cold; `lint:light-sources` clause (g) makes
   * every row say which it means anyway.
   */
  public override lit = false;
  public override burnTemperatureK: number = HEARTH.BURN_TEMPERATURE_K;
  public override maxBurnPowerW: number = HEARTH.MAX_BURN_POWER_W;
}
