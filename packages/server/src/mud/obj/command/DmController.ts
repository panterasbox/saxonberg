/**
 * DmController — direct messages, single- or multi-target.
 *
 * Single-target → `AetherMixin.tell(target, text)` (the lightweight 1:1
 * path; no channel created).
 * Multi-target → create an ad-hoc Channel via `ChatApi.openAdHoc`, then
 * `AetherMixin.tellMany` with `meta.channelId` stamped on every frame.
 *
 * The handle-case (`dm <ad-hoc-handle> ...` to post to a known ad-hoc
 * channel) is NOT shipped in v1 — users post to ad-hoc channels via
 * `chat <handle> ...` (ChatController routes the bare-post path
 * through the ad-hoc registry). Documented limitation per the
 * requirements doc's acceptance criteria; adds a minor user
 * inconvenience until the dispatcher gets a first-arg-disambiguation
 * hook.
 *
 * Per-Avatar runtime state (`_lastInboundDmCohort` /
 * `_lastOutboundDmCohort`) stamped on send and on receive so the
 * `reply` and `dm .` pronoun verbs can find the cohort.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  FieldValue,
} from '../../api/command';
import { MessageApi } from '../../api/message';
import { MixinApi } from '../../api/mixin';
import { MqlApi } from '../../api/mql';
import { Mml } from '../../api/mml';
import type { Stuff } from '../../lib/stuff/Stuff';
import { Avatar } from '../Avatar';
import { ChatApi } from '../../api/chat';
import { DM_MAX_RECIPIENTS } from '../../config/constants';
import { recordOutboundCohort } from '../../lib/social/dm-cohort';

interface DmModel extends CommandModel {
  target: FieldValue;
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

    const stuffs = MqlApi.extractStuffs(model.target);
    if (!stuffs || stuffs.length === 0) {
      context.note({ kind: 'empty-result', field: 'target', query: '' });
      return;
    }

    if (stuffs.length > DM_MAX_RECIPIENTS) {
      MessageApi.scene(speaker)
        .topic('world.speech.dm')
        .toSelf(
          Mml.fromMarkup(
            `\nToo many recipients (${stuffs.length}; max ${DM_MAX_RECIPIENTS}). ` +
            `Use a chat channel for groups this size — try \`chat make <name>\`.\n`,
          ),
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'recipient-cap-exceeded',
        detail: `${stuffs.length} > ${DM_MAX_RECIPIENTS}`,
      });
      return;
    }

    if (stuffs.length === 1) {
      const target = stuffs[0] as Stuff;
      speaker.tell(target, model.message);
      if (speaker instanceof Avatar) {
        recordOutboundCohort(speaker, [target]);
      }
      return;
    }

    // Multi-target: create an ad-hoc Channel + tellMany.
    const ad = await ChatApi.openAdHoc(speaker, [speaker, ...stuffs]);
    speaker.tellMany(stuffs as Stuff[], model.message, {
      channelId: ad.handle,
    });
    if (speaker instanceof Avatar) {
      recordOutboundCohort(speaker, stuffs as Stuff[]);
    }
  }
}
