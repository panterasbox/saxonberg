/**
 * Spade — ⭐ **the instrument that affords digging, anywhere.**
 *
 * A verb affordance is a static on a class (a row's
 * `commandContributions:` is dead, silently), and for `dig` the affordance
 * is the **instrument**, not the ground. That is the honest arrangement and
 * it is what makes `dig` a platform verb at all: the ground has no opinion
 * about whether anybody is going to turn it over, and a spade in your hand
 * means you can try it anywhere — a quarry floor, a peat bank, a headland,
 * a wood.
 *
 * ⚠ **It affords the verb; it does not decide the answer.** A spade will
 * not win rock, and the refusal for that is the GROUND's — *"You would want
 * a pick. That is rock."* Which is why `dig.yaml`'s tool arg asks for a
 * tool rather than for `[capability.digging]`: a pick is also a digging
 * instrument in the sense the verb cares about, and which one is right is a
 * fact about the ground, not about the view.
 *
 * ⭐ Rows, not subclasses, for the variants: `trade-farming`'s `Spade`
 * extends this one to add `plot` and `measure` (its own trade's surface),
 * and `trade-mining`'s shovel is a ROW on this class — *code is shared,
 * content is copied*. A shovel moves what you already broke and has a short
 * handle because a long one has nowhere to go in a drift; a spade cuts a
 * clean face in soil and is worked with a foot. Same class, different row,
 * different prose.
 */

import ToolItem from './ToolItem';
import type { CommandContributions } from '../../api/command';

export default class Spade extends ToolItem {
  /** ⭐ A spade in your hands affords `dig`, wherever you are standing. */
  static commandContributions: CommandContributions = {
    self: ['platform/cmd/ground/dig.yaml'],
  };
}
