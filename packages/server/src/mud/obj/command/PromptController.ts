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
 * controller; the switch below grows by one case per addition.
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
import { MixinApi } from '../../api/mixin';
import { Mml } from '../../api/mml';
import { PromptApi } from '../../api/prompt';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { HasInteractive } from '../../lib/connection/HasInteractive';

interface PromptModel extends CommandModel {
  subcommand: string;
}

export class PromptController extends CommandController<PromptModel> {
  execute(model: PromptModel, ctx: CommandContext): void {
    const giver = ctx.commandGiver;

    if (!MixinApi.isHasInteractive(giver)) {
      ctx.note({ kind: 'mixin-missing', mixin: 'HasInteractiveMixin' });
      MessageApi.scene(giver)
        .topic(MessageApi.Topics.world.narration.action)
        .toSelf(Mml.compose`You have no active connection.`)
        .send();
      return;
    }

    switch (model.subcommand.toLowerCase()) {
      case 'cancel':
        return this.handleCancel(giver, ctx);
      default:
        ctx.note({
          kind: 'controller-rejected',
          reason: 'unknown-subcommand',
          detail: `unknown prompt subcommand '${model.subcommand}'; valid: cancel`,
        });
        MessageApi.scene(giver)
          .topic(MessageApi.Topics.world.narration.action)
          .toSelf(
            Mml.compose`Unknown prompt subcommand '${model.subcommand}'. Valid: cancel.`,
          )
          .send();
        return;
    }
  }

  /**
   * Cancel every pending prompt on every Interactive the giver
   * owns. v1 actors usually have at most one Interactive but the
   * substrate handles multiplexed connections naturally.
   */
  private handleCancel(
    giver: Stuff & HasInteractive,
    ctx: CommandContext,
  ): void {
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
    void ctx;
  }
}
