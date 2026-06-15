/**
 * ReplyController — send to the cohort of the last-inbound DM.
 *
 * Pronoun verb: no first-arg target. Cohort comes from the operator's
 * hosted comms update (`Comms.getLastInboundCohort()`), reached via the
 * `commandSource` that afforded the verb or a `findReachable` fallback.
 * For a 1:1 inbound the cohort is just the original speaker; for a
 * multi-party inbound it's everyone on the conversation.
 *
 * Default is reply-all. `--one` / `-o` narrows the reply to the
 * original sender (cohort[0]) and skips the rest of the cohort.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import { ContainmentApi } from '../../../api/containment';
import { Mml } from '../../../api/mml';
import { ChatApi } from '../../../api/chat';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Comms } from '../../../lib/comms/Comms';

interface ReplyModel extends CommandModel {
  message: string;
  one?: boolean;
}

export default class ReplyController extends CommandController<ReplyModel> {
  async execute(model: ReplyModel, context: CommandContext): Promise<void> {
    const speaker = context.commandGiver;
    const comms = this.resolveComms(context);
    if (!comms) {
      return this.fail(context, 'You have no way to send a thought.', 'mixin-missing');
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
    const ad = await ChatApi.openAdHoc(speaker, [speaker, ...targets]);
    comms.tell(targets, model.message, { channelId: ad.handle });
  }

  /** Resolve the operator's hosted comms update (commandSource, else findReachable). */
  private resolveComms(context: CommandContext): (Stuff & Comms) | null {
    const source = context.commandSource;
    if (source && MixinApi.isComms(source)) return source;
    return ContainmentApi.findReachable(
      context.commandGiver,
      null,
      (s: Stuff): s is Stuff & Comms => MixinApi.isComms(s),
    );
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
