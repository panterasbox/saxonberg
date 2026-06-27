/**
 * CraftController — shared base for the maker verbs (`order`/`serve`/`mix`).
 *
 * Holds the one piece of logic all three share: turning a `CraftOutcome`
 * decline into a diegetic scene + a `controller-rejected` note. Not
 * referenced by any YAML (controllers load by their YAML `controller:`
 * field), so it's never dispatched as a command itself — just a base class.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { CraftFailure } from '../../../api/crafting';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';

const TOPIC = 'world.narration.action';

export abstract class CraftController<
  M extends CommandModel,
> extends CommandController<M> {
  /** Render a craft decline as a diegetic scene + a rejection note. */
  protected declineToScene(
    giver: Stuff,
    failure: CraftFailure,
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
function declineMessage(failure: CraftFailure): string {
  const detail = failure.detail;
  switch (failure.reason) {
    case 'no-maker':
      return "There's no one on hand to make that.";
    case 'missing-tool':
      return `There's no ${detail || 'tool'} here to make that with.`;
    case 'insufficient-input':
      return detail === 'no-location'
        ? "You can't make that here."
        : `There isn't enough ${detail || 'stock'} to make that.`;
    case 'no-recipe':
      return "That can't be made here.";
    case 'no-output':
    default:
      return 'Something goes wrong, and the drink never comes together.';
  }
}
