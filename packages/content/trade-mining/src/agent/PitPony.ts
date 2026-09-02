/**
 * PitPony — a draft animal that hauls, and ⭐ **the class exists for one
 * reason: to give it a brain.**
 *
 * Haulage itself needs no new mechanism whatever. Carry capacity derives
 * from body MASS in the shipped encumbrance substrate, so a 320 kg pony
 * bears a loaded cart's draft at a fraction of a person's load ratio —
 * the pony is better at hauling because it is *heavier*, which is the
 * actual reason, and the engine already knew it. That is why the row does
 * the work and this class adds no haulage code at all.
 *
 * ⚠ What it DOES add is `BehavedMixin`, and the reason is a real gate
 * rather than flavour: the shipped `HaulingCreature` is
 * `Mountable(PostRegistration(Character))` and carries no brain, so a
 * venue listing one under `cast:` is refused — *that is a prop, not
 * cast* — and a room's hydrate throws. Which is correct! **`cast:` means
 * things with a brain.** A pony standing in a working, shifting its feet
 * and leaning into the traces, is not set dressing; it is an animal, and
 * an animal that cannot idle reads as furniture.
 *
 * So the choice was: demote a living creature to `props:`, or let it
 * behave. Letting it behave is the honest one, and it costs one mixin.
 */

import { HaulingCreature } from '@saxonberg/server/mud/platform/agent/HaulingCreature';
import { BehavedMixin } from '@saxonberg/server/mud/lib/behavior/Behaved';

// `BehavedMixin` outermost, the `NPC` composition order — its witness
// hooks must wrap the ones beneath it.
export default class PitPony extends BehavedMixin(HaulingCreature) {}
