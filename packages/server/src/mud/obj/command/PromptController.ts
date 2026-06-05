/**
 * PromptController — the `prompt` verb.
 *
 * v1 subcommands:
 *
 *   - `prompt cancel` — cancels every pending prompt on every
 *     `Interactive` the giver owns (via
 *     `PromptApi.cancelAll(iact, 'cancelled')`). Reports the
 *     count of prompts cancelled via the standard dispatch-
 *     response channel.
 *
 * The `prompt` namespace is reserved as the player's surface for
 * prompt-related actions. Future subcommands (`prompt set <format>`,
 * `prompt show`, etc.) land additively against this same
 * controller.
 *
 * Cross-cutting concerns the framework handles, not us:
 *   - `requiresHasInteractive` validator (in prompt.yaml) gates
 *     execution to givers with HasInteractive composed.
 *   - Unknown-subcommand rejection is dispatcher-side — `assemble`
 *     returns `error: 'unknown-subcommand'` which the dispatch
 *     chain surfaces as a `command-rejected` note before the
 *     controller is ever cloned.
 *
 * Per-prompt cancel rides a different channel — the
 * `prompt-cancel` wire message (X-button affordance on the
 * client's prompt area), which routes directly to
 * `PromptApi.handleCancel` via `Application.processUserMessage`.
 *
 * See `docs/subsystems/prompt.md` (Wave 7) for the two-channel
 * inbound design.
 */

import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../api/command';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { PromptApi } from '../../api/prompt';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { HasInteractive } from '../../lib/connection/HasInteractive';

interface PromptModel extends CommandModel {
  subcommand: string;
}

export class PromptController extends CommandController<PromptModel> {
  execute(model: PromptModel, ctx: CommandContext): void {
    // Subcommand is guaranteed to be `cancel` here: the assembler
    // rejects unknown subcommands before reaching the controller,
    // and `requiresHasInteractive` (in prompt.yaml) gates the giver
    // type. New subcommands land as additional branches.
    if (model.subcommand.toLowerCase() === 'cancel') {
      this.handleCancel(ctx);
    }
  }

  /**
   * Cancel every pending prompt on every Interactive the giver
   * owns. v1 actors usually have at most one Interactive but the
   * substrate handles multiplexed connections naturally.
   */
  private handleCancel(ctx: CommandContext): void {
    const giver = ctx.commandGiver as Stuff & HasInteractive;

    let total = 0;
    for (const interactive of giver.getInteractives()) {
      total += PromptApi.cancelAll(interactive, 'cancelled');
    }

    const message =
      total === 0
        ? Mml.compose`No prompts to cancel.`
        : Mml.compose`Cancelled ${total === 1 ? '1 prompt' : `${total} prompts`}.`;

    MessageApi.scene(giver)
      .topic(MessageApi.Topics.world.narration.action)
      .toSelf(message)
      .send();
  }
}
