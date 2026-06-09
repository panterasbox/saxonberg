/**
 * ReplyController — send to the cohort of the last-inbound DM.
 *
 * Pronoun verb: no first-arg target. Cohort comes from
 * `AetherMixin.getLastInboundCohort()` on the speaker. For a 1:1
 * inbound the cohort is just the original speaker; for a multi-party
 * inbound it's everyone on the conversation.
 *
 * Default is reply-all. `--one` / `-o` narrows the reply to the
 * original sender (cohort[0]) and skips the rest of the cohort.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../api/command';
import { MessageApi } from '../../api/message';
import { MixinApi } from '../../api/mixin';
import { Mml } from '../../api/mml';
import { ChatApi } from '../../api/chat';
import type { Stuff } from '../../lib/stuff/Stuff';

interface ReplyModel extends CommandModel {
  message: string;
  one?: boolean;
}

export class ReplyController extends CommandController<ReplyModel> {
  async execute(model: ReplyModel, context: CommandContext): Promise<void> {
    const speaker = context.commandGiver;
    if (!MixinApi.isAether(speaker)) {
      return this.fail(context, 'You have no way to send a thought.', 'mixin-missing');
    }
    const inbound = speaker.getLastInboundCohort();
    if (!inbound || inbound.length === 0) {
      return this.fail(
        context,
        "You haven't received any DMs to reply to.",
        'no-inbound-cohort',
      );
    }
    // `--one` reply: just the original sender. Cohort[0] is the
    // sender per the AetherMixin.tell convention (inbound cohort is
    // `[sender, ...siblings]`).
    const targets: readonly Stuff[] = model.one
      ? [inbound[0]!]
      : inbound;

    if (targets.length === 1) {
      speaker.tell(targets[0]!, model.message);
      return;
    }
    const ad = await ChatApi.openAdHoc(speaker, [speaker, ...targets]);
    speaker.tell(targets, model.message, { channelId: ad.handle });
  }

  private fail(
    context: CommandContext,
    detail: string,
    reason: string,
  ): void {
    MessageApi.scene(context.commandGiver)
      .topic('world.speech.dm')
      .toSelf(Mml.fromMarkup(`\n${detail}\n`))
      .send();
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}
