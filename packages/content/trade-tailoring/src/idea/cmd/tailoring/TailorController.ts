/**
 * TailorController — `tailor [<garment>]`, and ⚠⚠ **it exists because the
 * drive found that nothing could reach the jerkin.**
 *
 * ## The gap, in full, because it recurred three times in one build
 *
 * `leather-jerkin` has been a correct recipe with no producer since it
 * was written. The carcass chain gave it a producer — a butchered animal
 * gives a hide, a tanpit makes it leather — and the plan called that AC1
 * closed. It was not, for a second reason nobody had looked for:
 *
 *   - **`make <recipe>` does not reach a catalogue recipe.** It
 *     dispatches a recipe *script* (a session `def`, or a learned home
 *     recipe transcribed by a faithful hand build), so every trade in
 *     the tree ships its own craft verb for the catalogue — `cook`,
 *     `bake`, `forge`, `press`, `mix`, and this build's `dip`, `melt`
 *     and `grind`. Tailoring shipped none, because it had nothing in the
 *     catalogue to reach.
 *   - **`cut` requires `StackableMixin`** — a BOLT. A tanned hide is not
 *     a stack and must not become one: stacking hides would let two
 *     merge, and a hide is a particular skin off a particular animal
 *     with its own grade. So the `cut` → `sew` pattern path, which is
 *     how cloth becomes a garment, cannot take leather at all.
 *
 * So a tanned hide had **no path to a worn jerkin**, and the live drive
 * is what said so: three unit suites and sixty-four lint gates were
 * green over it. *Tests build state; they never use it.*
 *
 * ## ⭐ Why a verb rather than widening `cut`
 *
 * Widening `cut`'s arg would make the pattern path accept leather, and
 * the pattern path is the wrong shape for it: a jerkin is **one recipe
 * with one input**, not a 2D-solution-to-a-3D-problem with a seam
 * allowance to trade away. Cloth has that decision and leather does not
 * — you do not cut a hide generous against a future alteration.
 *
 * ⭐ `model.what ?? 'leather-jerkin'` is `BakeController`'s pattern
 * verbatim (`model.loaf ?? 'lean-loaf'`), so a second leather garment is
 * a recipe row and nothing here changes.
 *
 * ⚠ **Deed-gated**, unlike `dip` and `grind`: the recipe authors
 * `discipline: tailoring` / `difficulty: hard`, and a jerkin is real
 * skilled work. The refusal is the progression UI — you are told you
 * have heard of it and not learned it.
 */

import { CraftController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/CraftController';
import type {
  CommandContext,
  CommandModel,
} from '@saxonberg/server/mud/api/command';
import { CraftingApi } from '@saxonberg/server/mud/api/crafting';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';

const TOPIC = 'act.deed';

interface TailorModel extends CommandModel {
  what?: string;
}

export default class TailorController extends CraftController<TailorModel> {
  async execute(model: TailorModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const recipeRef = model.what ?? 'leather-jerkin';

    if (!(await this.requireDeed(context, recipeRef, 'tailor'))) return;

    const outcome = await CraftingApi.craft({ recipeRef, makerMode: 'self' });
    if (!outcome.ok) {
      this.declineToScene(giver, outcome, context);
      return;
    }
    const output = outcome.output;
    if (output === null) return;

    if (MixinApi.isContainable(output) && MixinApi.isContainer(giver)) {
      ContainmentApi.move(output, giver);
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You chalk it out, cut it, and work the seams until ${Mml.thing(output)} is a thing somebody could wear.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(giver)} works a piece of leather up into a garment.`,
      )
      .send();
  }
}
