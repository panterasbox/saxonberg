/**
 * ForgeController — `forge <item> [with <metal>]`.
 *
 * The smithing one-shot: the earned shorthand over the same craft-resolve
 * the by-hand path performs. Maker = the giver (`makerMode: 'self'`);
 * **deed-gated** on the `RecipeKnowledge` can-make deed (the MakeController
 * gate — reading the recipe is a claim, only the first faithful hand build
 * earns the shorthand; `order` stays ungated). `with <metal>` steers the
 * stock pick exactly as the bar's `with <brand>`.
 *
 * ⚠⚠ **Cast iron is invisible to the gather, and that is correct** — its
 * material is not tagged `forgeable`, so no anvil recipe's stock slot can
 * match it and the kernel picks it up for nothing, silently. But
 * *silently* is the problem: a smith standing over a pig with nothing
 * else to hand would be told only that there was no stock, which is true
 * and teaches nothing. So when the gather comes up empty and there IS
 * cast in reach, the refusal says what the grey bar actually is.
 */

import { CraftController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/CraftController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import { CraftingApi } from '@saxonberg/server/mud/api/crafting';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

const TOPIC = 'act.deed';

interface ForgeModel extends CommandModel {
  item: string;
  brand?: string;
}

export default class ForgeController extends CraftController<ForgeModel> {
  /**
   * A cast piece the smith could plausibly have meant — carried, or
   * lying in the room.
   *
   * ⚠ A read for the PROSE only; nothing here decides whether the craft
   * succeeds, which the material's own missing `forgeable` tag already
   * did.
   *
   * ⭐ The reach is **`reachableMarks`**, inherited from
   * `CommandController` — *what they carry, plus what shares their
   * environment, minus themselves*. This once walked the two hops by
   * hand, which is a re-implementation of a method every controller
   * already has and the `findReachable`-shaped antipattern
   * `docs/antipatterns.md` names.
   */
  private castInReach(context: CommandContext): Stuff | null {
    return (
      this.reachableMarks(context).find(
        (c) =>
          MixinApi.isTangible(c) &&
          (c.getMaterial()?.getTags() ?? []).includes('brittle'),
      ) ?? null
    );
  }

  async execute(model: ForgeModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    // The knowledge gate: the one-shot is earned by the hands, not the
    // book — a catalogue recipe declines until the can-make deed exists.
    if (!(await this.requireDeed(context, model.item, 'forge'))) return;

    const outcome = await CraftingApi.craft({
      recipeRef: model.item,
      makerMode: 'self',
      brand: model.brand,
    });
    if (!outcome.ok) {
      const pig = this.castInReach(context);
      if (pig) {
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(
            Mml.compose`There is nothing here you can forge. ${Mml.thing(pig)} is not stock: it is cast iron, saturated with carbon, and it has no give in it at all — it would shatter on the first blow. Cast iron is poured into a mould, never drawn out under a hammer.`,
          )
          .send();
        context.note({ kind: 'controller-rejected', reason: 'unforgeable', detail: 'cast-iron' });
        return;
      }
      this.declineToScene(giver, outcome, context);
      return;
    }

    const output = outcome.output;
    if (MixinApi.isContainable(output) && MixinApi.isContainer(giver)) {
      ContainmentApi.move(output, giver);
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You forge ${Mml.thing(output)}.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} forges ${Mml.thing(output)}.`)
      .send();
  }
}
