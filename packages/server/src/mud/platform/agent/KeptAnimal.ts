/**
 * KeptAnimal — the concrete twin of the substrate `KeptAnimal`.
 *
 * `lib/creature/KeptAnimal` is where the composition lives, and it is
 * substrate: **nothing instances `/lib/`**, so no template may name it.
 * This is the class rows name — the shared-name twin, aliasing its base
 * on import exactly as `Thing`, `Vessel`, `Exit`, `Material` and
 * `Biome` do. ⭐ Sharing the name is the default; a twin that renames is
 * claiming to be a different thing, and this is the same thing.
 *
 * Three rows name it today and they have nothing else in common — a
 * stray cat in the commons, a working collie in ranching, a canary down
 * a mine — which is the point: the rung is *kept for itself*, not a
 * species, a trade or a place.
 */

import { KeptAnimal as KeptAnimalBase } from '../../lib/creature/KeptAnimal';
import { CarryingMixin } from '../../lib/slot/Carrying';

/**
 * ⭐ A kept animal CARRIES (size and carrying W8) — by its plan: the dog's
 * mouth is a hand (`canid`); the cat's plan names none, and it answers
 * `nowhere-to-carry` by that, not by a default. The substrate rung does
 * not (a fish is a kept animal too, and has no pocket).
 */
export class KeptAnimal extends CarryingMixin(KeptAnimalBase) {}

export default KeptAnimal;
