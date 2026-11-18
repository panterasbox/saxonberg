/**
 * ReplyController — send to the cohort of the last-inbound DM.
 *
 * Pronoun verb: no first-arg target. The cohort is the person's own
 * (`Comms.getLastInboundCohort()` — comms lives on the person). For a 1:1
 * inbound the cohort is just the original speaker; for a multi-party
 * inbound it's everyone on the conversation.
 *
 * Default is reply-all. `--one` / `-o` narrows the reply to the
 * original sender (cohort[0]) and skips the rest of the cohort.
 *
 * Whether the message can leave now is the person's answer
 * (`sendOrHold`, aether-devices D8); this controller renders it.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { ChatApi } from '../../../../api/chat';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { SubjectSubscriber } from '../../../../lib/forum/SubjectSubscriber';
import type { CommandGiver } from '../../../../lib/command/CommandGiver';

interface ReplyModel extends CommandModel {
  message: string;
  one?: boolean;
}

export default class ReplyController extends CommandController<ReplyModel> {
  async execute(model: ReplyModel, context: CommandContext): Promise<void> {
    const speaker = context.commandGiver as Stuff & CommandGiver &
      SubjectSubscriber;
    // ⭐ Comms is the person's (aether-devices D2); the person decides
    // whether a message can leave now (D8). This controller renders.
    if (!MixinApi.isComms(speaker)) {
      return this.fail(context, 'You have no way to send a thought.', 'mixin-missing');
    }
    const comms = speaker;
    const refusal = comms.sendOrHold(context.commandText);
    if (refusal) {
      return this.fail(context, refusal.line, `aether-${refusal.reason}`);
    }
    const inbound = comms.getLastInboundCohort();
    if (!inbound || inbound.length === 0) {
      return this.fail(
        context,
        "You haven't received any DMs to reply to.",
        'no-inbound-cohort',
      );
    }
    // `--one` reply: just the original sender. Cohort[0] is the
    // sender per the Comms.tell convention (inbound cohort is
    // `[sender, ...siblings]`).
    const targets: readonly Stuff[] = model.one
      ? [inbound[0]!]
      : inbound;

    if (targets.length === 1) {
      comms.tell(targets[0]!, model.message);
      return;
    }
    const ad = await speaker.openAdHocChat([speaker, ...targets]);
    comms.tell(targets, model.message, { channelId: ad.handle });
  }

  /** Resolve the operator's hosted comms update (commandSource, else the
   *  MQL `reachable` pool). */
  private fail(
    context: CommandContext,
    detail: string,
    reason: string,
  ): void {
    MessageApi.scene(context.commandGiver)
      .topic('speech.comms')
      .toSelf(Mml.fromMarkup(`\n${detail}\n`))
      .send();
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}
