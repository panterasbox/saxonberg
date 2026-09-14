/**
 * CraftController — shared base for the maker verbs (`order`/`serve`/`mix`/
 * `forge`/`cook`/`make`).
 *
 * Holds the two pieces of logic the family shares: turning a
 * `CraftOutcome` decline into a diegetic scene + a `controller-rejected`
 * note (`declineToScene`), and the can-make deed gate the earned
 * one-shots run (`requireDeed`). Not referenced by any YAML (controllers
 * load by their YAML `controller:` field), so it's never dispatched as a
 * command itself — just a base class.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import {
  CraftingApi,
  type CraftFailure,
  type RepairFailure,
  type SalvageFailure,
} from '../../../../api/crafting';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { RecipeKnowledge } from '../../../../lib/script/RecipeKnowledge';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { MixinApi } from '../../../../api/mixin';
import {
  CraftingDecline,
  type CraftingFailure,
} from '../../../../lib/craft/CraftingDecline';

const TOPIC = 'act.deed';


export abstract class CraftController<
  M extends CommandModel,
> extends CommandController<M> {
  /**
   * The knowledge gate shared by the earned one-shots (`forge`/`cook`/
   * `make`): a **catalogue** recipe declines until the can-make deed
   * exists (the first faithful hand build — reading the recipe is only a
   * claim). A ref that resolves to no catalogue view passes ungated (a
   * player's own `def` — you wrote it); `order` never calls this — the
   * served path stays open. Returns true when the craft may proceed;
   * false after narrating + noting the decline.
   */
  protected async requireDeed(
    context: CommandContext,
    recipeRef: string,
    verb: string,
  ): Promise<boolean> {
    const giver = context.commandGiver;
    const view = await CraftingApi.lookupRecipe(recipeRef);
    if (!view) return true;
    if (
      MixinApi.isPersona(giver) &&
      (await giver.hasDone(RecipeKnowledge.madeKey(view.recipeId)))
    ) {
      return true;
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You've heard of ${view.name}, but you haven't learned to ${verb} it — work it by hand first.`,
      )
      .send();
    context.note({
      kind: 'controller-rejected',
      reason: 'not-learned',
      detail: recipeRef,
    });
    return false;
  }

  /** Render a craft decline as a diegetic scene + a rejection note. */
  protected declineToScene(
    giver: Stuff,
    failure: CraftingFailure,
    context: CommandContext,
  ): void {
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`${CraftingDecline.messageFor(failure)}`)
      .send();
    context.note({
      kind: 'controller-rejected',
      reason: failure.reason,
      detail: failure.detail ?? '',
    });
  }

}

