/**
 * DmController — direct messages, single- or multi-target.
 *
 * Delegates to the person's `CommsMixin.tell` for both shapes — it
 * accepts a single `Stuff` or a readonly array and dispatches frames
 * accordingly. Multi-target additionally opens an ad-hoc Channel so
 * subsequent `chat <handle> ...` posts route to the same cohort.
 *
 * The handle-case (`dm <ad-hoc-handle> ...` to post to a known ad-hoc
 * channel) is NOT shipped — users post to ad-hoc channels via
 * `chat <handle> ...`.
 *
 * ⭐ Comms is the person's (aether-devices D2): cohort state lives on
 * the person and is stamped by `tell`. Whether the message can leave now
 * — a tuner borne, Messages installed on it — is the person's answer
 * (`sendOrHold`, D8); this controller asks and renders.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { MqlManyResult } from '../../../../api/mql';
import { Mml } from '../../../../api/mml';
import { ChatApi } from '../../../../api/chat';
import type { SubjectSubscriber } from '../../../../lib/forum/SubjectSubscriber';
import type { CommandGiver } from '../../../../lib/command/CommandGiver';

const DM_MAX_RECIPIENTS = 10;

interface DmModel extends CommandModel {
  /** From `dm.yaml` (type: objects + cardinality 1..10). */
  target: MqlManyResult;
  message: string;
}

export default class DmController extends CommandController<DmModel> {
  async execute(model: DmModel, context: CommandContext): Promise<void> {
    const speaker = context.commandGiver as Stuff & CommandGiver &
      SubjectSubscriber;
    // ⭐ Comms is the person's (aether-devices D2); the person decides
    // whether a message can leave now (D8). This controller renders.
    if (!MixinApi.isComms(speaker)) {
      context.note({ kind: 'mixin-missing', mixin: 'CommsMixin' });
      return;
    }
    const comms = speaker;
    const refusal = comms.sendOrHold(context.commandText);
    if (refusal) return this.refuse(context, refusal);

    const targets = model.target.stuff;
    if (targets.length === 0) {
      context.note({ kind: 'empty-result', field: 'target', query: model.target.raw });
      return;
    }

    if (targets.length > DM_MAX_RECIPIENTS) {
      MessageApi.scene(speaker)
        .topic('speech.comms')
        .toSelf(
          Mml.fromMarkup(
            `\nToo many recipients (${targets.length}; max ${DM_MAX_RECIPIENTS}). ` +
            `Use a chat channel for groups this size — try \`chat make <name>\`.\n`,
          ),
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'recipient-cap-exceeded',
        detail: `${targets.length} > ${DM_MAX_RECIPIENTS}`,
      });
      return;
    }

    if (targets.length === 1) {
      comms.tell(targets[0]!, model.message);
      return;
    }

    // Multi-target: open an ad-hoc Channel so subsequent
    // `chat <handle>` posts route to the same cohort; stamp the
    // channelId on every DM frame.
    const ad = await speaker.openAdHocChat([speaker, ...targets]);
    comms.tell(targets, model.message, { channelId: ad.handle });
  }
}
