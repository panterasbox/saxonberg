/**
 * DraftHorse — a heavy horse in the shafts.
 *
 * ⭐ **The class exists for one reason: to give it a brain.** Haulage
 * needs no code here at all. Carry capacity derives from body MASS in
 * the shipped encumbrance substrate, so hitching a wagon to 700 kg of
 * horse instead of pulling it yourself is a measurably lower load ratio
 * — the horse is better at hauling because it is *heavier*, which is the
 * actual reason, and the engine already knew it.
 *
 * ⚠ The shipped `HaulingCreature` carries no `BehavedMixin`, so a room
 * listing one under `cast:` is refused at hydrate — *that is a prop, not
 * cast* — and the refusal is right: `cast:` means things with a brain,
 * and an animal that cannot idle reads as furniture. The `PitPony` hit
 * this first, by driving, in a room that would not stand up.
 */

import { HaulingCreature } from '@saxonberg/server/mud/platform/agent/HaulingCreature';
import { BehavedMixin } from '@saxonberg/server/mud/lib/behavior/Behaved';

// `BehavedMixin` outermost, the `NPC` composition order — its witness
// hooks must wrap the ones beneath it.
export default class DraftHorse extends BehavedMixin(HaulingCreature) {}
