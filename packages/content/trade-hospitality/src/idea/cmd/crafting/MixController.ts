/**
 * MixController — `mix <cocktail> [with <brand>]`.
 *
 * A maker verb (maker = the giver, via `makerMode: 'self'`). Makes the
 * cocktail from reachable matter and keeps it. General to any agent.
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

export interface MixModel extends CommandModel {
  cocktail: string;
  brand?: string;
}

export default class MixController<M extends MixModel = MixModel> extends CraftController<M> {
  async execute(model: M, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const drink = await this.mixInto(model, context, giver, 'mix');
    if (!drink) return;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You mix ${Mml.thing(drink)}.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} mixes ${Mml.thing(drink)}.`)
      .send();
  }

  /**
   * ⭐ The one making behind `mix` and `serve` (controller-liquidity W10 —
   * `serve` was a copy of this): the knowledge gate, the craft, and the
   * drink handed to `holder` (yourself, or the patron). `null` = refused,
   * and already said.
   *
   * ⭐ The knowledge gate, same as `cook`/`forge`/`bake`: you cannot mix
   * what you have never made. Reading the menu is a claim; the first making
   * (by any craft) is the deed.
   */
  protected async mixInto(
    model: MixModel,
    context: CommandContext,
    holder: Stuff,
    verb: string,
  ): Promise<Stuff | null> {
    if (!(await this.requireDeed(context, model.cocktail, verb))) return null;
    const outcome = await CraftingApi.craft({
      recipeRef: model.cocktail,
      makerMode: 'self',
      brand: model.brand,
    });
    if (!outcome.ok) {
      this.declineToScene(context.commandGiver, outcome, context);
      return null;
    }
    const drink = outcome.output;
    if (MixinApi.isContainable(drink) && MixinApi.isContainer(holder)) {
      ContainmentApi.move(drink, holder);
    }
    return drink;
  }
}
