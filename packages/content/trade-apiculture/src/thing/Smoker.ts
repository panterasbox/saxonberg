/**
 * Smoker — ⭐ **a lamp that gives no light.**
 *
 * A tin with smouldering fuel in it and a bellows on the side. It is a
 * `Burner` because that is what it is: a thing that holds a fire and
 * burns fuel, lit with the platform's `ignite` and running out when the
 * fuel does.
 *
 * ⭐⭐ **No verb, no capability word, no mechanism.** The colony reads the
 * actor's HANDS: if there is a lit burner in one of them, the bees are
 * calmer (`ColonyMixin.disturb`). So the smoker works by being held and
 * being alight, which is how it works in reality, and a smoker in your
 * pack is a smoker you did not use.
 *
 * ⚠ Not a `Lamp` — it emits nothing. Not a `Tool` — no verb or recipe
 * consumes a capability from it, and `lint:capabilities` is right to
 * refuse a capability word nothing asks for.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { DetailedMixin } from '@saxonberg/server/mud/lib/description/Detailed';
import { BurnerMixin } from '@saxonberg/server/mud/lib/fire/Burner';
import { ReservedMixin } from '@saxonberg/server/mud/lib/reserve';
import { ThermalMixin } from '@saxonberg/server/mud/lib/thermal/Thermal';
import { WieldableMixin } from '@saxonberg/server/mud/lib/slot/Wieldable';
import { SlottableMixin } from '@saxonberg/server/mud/lib/slot/Slottable';

// ⚠ **`Wieldable` + `Slottable`, and the plan said otherwise.** D16 had
// it that *"a `Thing` is `get`-able and the read checks the hand slots'
// occupants"* — but a biped's hand slot declares
// `accepts: WieldableMixin`, so a smoker that is not wieldable cannot BE
// in a hand, and the read would have found nothing forever. Caught by the
// sting test refusing to put one in a hand.
const SmokerBase = BurnerMixin(
  WieldableMixin(
    SlottableMixin(ReservedMixin(ThermalMixin(DetailedMixin(Good)))),
  ),
);

export default class Smoker extends SmokerBase {}
