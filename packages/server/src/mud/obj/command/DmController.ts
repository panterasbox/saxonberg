/**
 * DmController — direct messages, single- or multi-target.
 *
 * Delegates to `AetherMixin.tell` for both shapes — the mixin's
 * unified surface accepts either a single `Stuff` or a readonly array
 * and dispatches frames accordingly. Multi-target additionally opens
 * an ad-hoc Channel so subsequent `chat <handle> ...` posts route to
 * the same cohort.
 *
 * The handle-case (`dm <ad-hoc-handle> ...` to post to a known ad-hoc
 * channel) is NOT shipped in v1 — users post to ad-hoc channels via
 * `chat <handle> ...` (ChatController routes the bare-post path
 * through the ad-hoc registry). Documented limitation per the
 * requirements doc's acceptance criteria.
 *
 * Cohort state (`getLastInboundCohort` / `getLastOutboundCohort`)
 * lives on `AetherMixin` and is stamped automatically by `tell` —
 * no controller-side bookkeeping needed.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../api/command';
import { MessageApi } from '../../api/message';
import { MixinApi } from '../../api/mixin';
import type { MqlManyResult } from '../../api/mql';
import { Mml } from '../../api/mml';
import { ChatApi } from '../../api/chat';

/**
 * Hard cap on multi-target `dm` recipient count. Exceeding the cap
 * refuses the command with a self-frame pointing the player at chat
 * channels; groups larger than this belong on a real channel where
 * the membership / subscription / moderation surface applies.
 */
const DM_MAX_RECIPIENTS = 10;

interface DmModel extends CommandModel {
  /** From `dm.yaml` (type: objects + cardinality 1..10). */
  target: MqlManyResult;
  message: string;
}

export class DmController extends CommandController<DmModel> {
  async execute(model: DmModel, context: CommandContext): Promise<void> {
    const speaker = context.commandGiver;
    if (!MixinApi.isAether(speaker)) {
      MessageApi.scene(speaker)
        .topic('world.speech.dm')
        .toSelf(Mml.compose`You have no way to send a thought.`)
        .send();
      context.note({ kind: 'mixin-missing', mixin: 'AetherMixin' });
      return;
    }

    const targets = model.target.stuff;
    if (targets.length === 0) {
      context.note({ kind: 'empty-result', field: 'target', query: model.target.raw });
      return;
    }

    if (targets.length > DM_MAX_RECIPIENTS) {
      MessageApi.scene(speaker)
        .topic('world.speech.dm')
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
      speaker.tell(targets[0]!, model.message);
      return;
    }

    // Multi-target: open an ad-hoc Channel so subsequent
    // `chat <handle>` posts route to the same cohort; stamp the
    // channelId on every DM frame.
    const ad = await ChatApi.openAdHoc(speaker, [speaker, ...targets]);
    speaker.tell(targets, model.message, { channelId: ad.handle });
  }
}
