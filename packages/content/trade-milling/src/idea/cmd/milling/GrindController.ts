/**
 * GrindController — `grind [<what>] [at <stones>]`.
 *
 * ⭐⭐ **`mill` and `grind` are two verbs because they are two acts**, and
 * the difference is whether there is a decision in it.
 *
 * `mill` is the extraction verb: it reduces grain and then **separates**
 * it, and *how much of the outer coat you keep* is a continuous choice
 * with real consequences at both ends (white flour that keeps, or
 * wholemeal that nourishes and goes off). The whole verb exists to put
 * that dial in a player's hand.
 *
 * `grind` has no dial. Bone ground is bone meal; there is no bolting
 * cloth, nothing to separate, and no setting that gives you a better
 * answer. So it is a plain recipe resolve over whatever the stones will
 * take, and it defaults to the one thing a miller is most often asked to
 * put through them that is not grain.
 *
 * ## ⚠ Why not widen `mill`
 *
 * `MillController` gates its input on `GRINDABLE = ['grain', 'malt']`,
 * read off the material's tags, and `ComminutingMixin.productMaterial`
 * is a per-instance field — so a quern set to make flour makes flour out
 * of whatever you feed it. Teaching that mechanism about bone would mean
 * either adding `bone` to a module constant in this pack (the milling
 * trade learning a carcass word) or giving the mixin an `accepts` list,
 * which is a **cross-cutting kernel change inside a trade build** and
 * exactly the thing that keeps going wrong. A recipe says the same thing
 * with no mechanism at all: these stones, that input, this output.
 *
 * ## The default
 *
 * `model.what ?? 'bone-meal'` — the `BakeController` pattern verbatim
 * (`model.loaf ?? 'lean-loaf'`). `grind` does the obvious thing; `grind
 * <recipe>` is the general form, so a second grindable is a recipe row
 * and nothing here changes.
 */

import { CraftController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/CraftController';
import type {
  CommandContext,
  CommandModel,
} from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { CraftingApi } from '@saxonberg/server/mud/api/crafting';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';

const TOPIC = 'act.deed';

interface GrindModel extends CommandModel {
  what?: string;
  /** The stones, resolved by the BINDER off the view's arg. */
  stones?: MqlOneResult;
}

export default class GrindController extends CraftController<GrindModel> {
  async execute(model: GrindModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const recipeRef = model.what ?? 'bone-meal';

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
        Mml.compose`You put it through the stones and sweep ${Mml.thing(output)} up off the bed.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(giver)} grinds something down at the stones.`,
      )
      .send();
  }
}
