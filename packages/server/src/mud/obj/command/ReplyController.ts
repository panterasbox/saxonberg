/**
 * ReplyController — send to the cohort of the last-inbound DM.
 *
 * Pronoun verb: no first-arg target. Cohort comes from the per-
 * Avatar runtime state stamped by the dm-receive hook. For a 1:1
 * inbound the cohort is just the original speaker; for a multi-
 * party inbound it's everyone on the conversation. Always reply-all
 * — no "reply just to sender" shape in v1.
 *
 * v1 limitation: the inbound-cohort stamping happens only when the
 * speaker IS an Avatar (the runtime state is keyed by Avatar instance).
 * NPC inbounds don't get their own runtime state since NPCs don't
 * play.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../api/command';
import { MessageApi } from '../../api/message';
import { MixinApi } from '../../api/mixin';
import { Mml } from '../../api/mml';
import { Avatar } from '../Avatar';
import { getLastInboundCohort, recordOutboundCohort } from '../../lib/social/dm-cohort';
import { ChatApi } from '../../api/chat';

interface ReplyModel extends CommandModel {
  message: string;
}

export class ReplyController extends CommandController<ReplyModel> {
  async execute(model: ReplyModel, context: CommandContext): Promise<void> {
    const speaker = context.commandGiver;
    if (!(speaker instanceof Avatar)) {
      return this.fail(context, 'Reply requires an Avatar speaker.', 'avatar-required');
    }
    if (!MixinApi.isAether(speaker)) {
      return this.fail(context, 'You have no way to send a thought.', 'mixin-missing');
    }
    const cohort = getLastInboundCohort(speaker);
    if (!cohort || cohort.length === 0) {
      return this.fail(
        context,
        "You haven't received any DMs to reply to.",
        'no-inbound-cohort',
      );
    }
    if (cohort.length === 1) {
      speaker.tell(cohort[0]!, model.message);
      recordOutboundCohort(speaker, cohort);
      return;
    }
    const ad = await ChatApi.openAdHoc(speaker, [speaker, ...cohort]);
    speaker.tellMany(cohort, model.message, { channelId: ad.handle });
    recordOutboundCohort(speaker, cohort);
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
