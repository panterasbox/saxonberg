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

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import {
  CraftingApi,
  type CraftFailure,
  type RepairFailure,
  type SalvageFailure,
} from '../../../api/crafting';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { RecipeKnowledge } from '../../../lib/script/RecipeKnowledge';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';

const TOPIC = 'world.narration.action';

/** Any crafting-family decline (craft / repair / salvage) — one renderer. */
type CraftingFailure = CraftFailure | RepairFailure | SalvageFailure;

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
    if (await RecipeKnowledge.canMake(giver, view.recipeId)) return true;
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
      .toSelf(Mml.compose`${declineMessage(failure)}`)
      .send();
    context.note({
      kind: 'controller-rejected',
      reason: failure.reason,
      detail: failure.detail ?? '',
    });
  }
}

/** Map a decline reason to its diegetic line. */
function declineMessage(failure: CraftingFailure): string {
  const detail = failure.detail;
  switch (failure.reason) {
    case 'no-maker':
      return "There's no one on hand to make that.";
    case 'missing-tool':
      return `There's no ${detail || 'tool'} here to make that with.`;
    case 'insufficient-input':
      // The service acts' details read as states, not stock.
      if (detail === 'no-location') return "You can't make that here.";
      if (detail === 'nothing-to-repair') {
        return "It's already sound — there's nothing to repair.";
      }
      if (detail === 'not-durable' || detail === 'not-salvageable') {
        return "That isn't something this kind of work applies to.";
      }
      if (detail === 'build-in-use') {
        return "There's a build still working in it — finish or empty it first.";
      }
      if (detail === 'no-material' || detail === 'no-matter') {
        return "There's no honest matter in it to recover.";
      }
      return `There isn't enough ${detail || 'stock'} to make that.`;
    case 'insufficient-heat':
      return 'Nothing here runs hot enough for that — the forge is cold, or there is no fire at all.';
    case 'no-recipe':
      return "That can't be made here.";
    case 'no-output':
    default:
      return 'Something goes wrong, and the drink never comes together.';
  }
}
