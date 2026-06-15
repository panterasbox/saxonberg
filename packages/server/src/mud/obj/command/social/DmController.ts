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
 * Transmission routes through the hosted **comms update** (the
 * `commandSource` that afforded `dm`, or a `findReachable` fallback),
 * which sends on behalf of its operator (the speaker). Cohort state
 * (`getLastInboundCohort` / `getLastOutboundCohort`) lives on the comms
 * update and is stamped automatically by `tell` — no controller-side
 * bookkeeping needed.
 *
 * Absent-comms gate: the verb-level `requiresVerbalESP` validator is
 * the attunement early-catch (perceive the aether), but attunement
 * alone doesn't guarantee a comms update — an attuned actor whose comms
 * update was removed can perceive but not send. That gate lives HERE,
 * not in the validator (attunement = perceive; the comms update =
 * transmit).
 */

import { CommandController } from '../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import { ContainmentApi } from '../../../api/containment';
import type { Comms } from '../../../lib/comms/Comms';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { MqlManyResult } from '../../../api/mql';
import { Mml } from '../../../api/mml';
import { ChatApi } from '../../../api/chat';

/**
 * Resolve the operator's hosted comms update — preferring the
 * `commandSource` that afforded the verb (the comms update, when
 * dispatched through the recency stack), else a `findReachable`
 * host-descent fallback. `null` when attuned but update-less.
 */
function resolveComms(context: CommandContext): (Stuff & Comms) | null {
  const source = context.commandSource;
  if (source && MixinApi.isComms(source)) return source;
  return ContainmentApi.findReachable(
    context.commandGiver,
    null,
    (s: Stuff): s is Stuff & Comms => MixinApi.isComms(s),
  );
}

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

export default class DmController extends CommandController<DmModel> {
  async execute(model: DmModel, context: CommandContext): Promise<void> {
    const speaker = context.commandGiver;
    const comms = resolveComms(context);
    if (!comms) {
      MessageApi.scene(speaker)
        .topic('world.speech.dm')
        .toSelf(Mml.compose`You have no way to send a thought.`)
        .send();
      context.note({ kind: 'mixin-missing', mixin: 'CommsMixin' });
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
      comms.tell(targets[0]!, model.message);
      return;
    }

    // Multi-target: open an ad-hoc Channel so subsequent
    // `chat <handle>` posts route to the same cohort; stamp the
    // channelId on every DM frame.
    const ad = await ChatApi.openAdHoc(speaker, [speaker, ...targets]);
    comms.tell(targets, model.message, { channelId: ad.handle });
  }
}
