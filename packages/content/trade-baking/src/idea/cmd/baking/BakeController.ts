/**
 * BakeController — `bake [<recipe>]`.
 *
 * `CraftController`'s ordinary shape (the 27-line `cook` exemplar) with
 * one difference that is the whole point of the verb existing:
 *
 * ⭐⭐ **The loaf is minted INTO THE OVEN, not into your hands.**
 *
 * Everything else in the crafting system hands you the thing you made.
 * Bread is the first output whose relationship with the fire does not
 * end at the mint: it is minted `done` (the working was as long as it
 * needed) and then it *keeps accruing dose* while it sits in a 500 K
 * chamber. Leave it there and it goes `overdone`, then `burnt`, and its
 * grade is written down to `poor`.
 *
 * So the loaf goes where a loaf goes, and taking it out at the right
 * moment is a thing you do rather than a thing the verb does for you.
 * That is only possible because W0 made an `Oven` a `Container` and gave
 * `ThermalMixin` the furnace couple — before this build, putting a loaf
 * in an oven was not expressible.
 *
 * ⚠ A furnace that is not a chamber (a campfire) hands the output to the
 * baker exactly as `cook` does. You cannot leave a loaf inside a fire.
 */

import { CraftController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/CraftController';
import type {
  CommandContext,
  CommandModel,
} from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { CraftingApi } from '@saxonberg/server/mud/api/crafting';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';

const TOPIC = 'act.deed';

interface BakeModel extends CommandModel {
  loaf?: string;
}

export default class BakeController extends CraftController<BakeModel> {
  async execute(model: BakeModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const recipeRef = model.loaf ?? 'lean-loaf';

    if (!(await this.requireDeed(context, recipeRef, 'bake'))) return;

    const outcome = await CraftingApi.craft({ recipeRef, makerMode: 'self' });
    if (!outcome.ok) {
      this.declineToScene(giver, outcome, context);
      return;
    }
    const output = outcome.output;
    if (output === null) return;

    // ⭐ Into the oven, if the fire in reach is a chamber you can put
    // something in. A campfire is not, and then the loaf comes to hand.
    const oven = this.reachableChamber(giver);
    if (oven !== null) {
      await ContainmentApi.move(output as Stuff & Containable, oven);
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`You slide ${Mml.thing(output)} onto the oven floor and close it up. ⚠ It will not wait for you — bread left in a hot oven burns.`,
        )
        .toPeers(
          Mml.compose`${Mml.actor(giver)} sets a loaf in ${Mml.thing(oven as unknown as Stuff)}.`,
        )
        .send();
      return;
    }
    if (MixinApi.isContainer(giver)) {
      await ContainmentApi.move(
        output as Stuff & Containable,
        giver as Stuff & Container,
      );
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You bake ${Mml.thing(output)}.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} bakes ${Mml.thing(output)}.`)
      .send();
  }

  /** A lit furnace in the room that is also a container — an oven. */
  private reachableChamber(giver: Stuff): (Stuff & Container) | null {
    const room = (
      giver as unknown as { getContainer(): Stuff | null }
    ).getContainer();
    if (room === null || !MixinApi.isContainer(room)) return null;
    for (const occ of room.getContents()) {
      const s = occ as unknown as Stuff;
      if (!MixinApi.isFurnace(s) || !MixinApi.isContainer(s)) continue;
      if (!s.isLit() || s.fuelRemaining() <= 0) continue;
      return s as Stuff & Container;
    }
    return null;
  }
}
