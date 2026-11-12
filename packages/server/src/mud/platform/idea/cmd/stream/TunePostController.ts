/**
 * TunePostController — `tune <target> <message>`: post to a followed stream's chat (Twitch) (over {@link TuneControllerBase}).
 *
 * One of three shapes of `tune`; the message is the greedy tail, so this
 * shape needs two words where `tune-follow.yaml` takes one.
 */

import type { CommandContext } from '../../../../api/command';
import { StreamApi } from '../../../../api/stream';
import { TuneControllerBase, type TuneModel } from './TuneControllerBase';

export default class TunePostController extends TuneControllerBase {
  async execute(model: TuneModel, context: CommandContext): Promise<void> {
    const body = (model.message ?? '').trim();
    const speaker = context.commandGiver;
    const parsed = this.parseTarget(model);
    if (parsed.form === 'reject') return this.rejectParse(context, parsed);
    const sh = await this.serviceHandle(parsed);
    if (!sh.ok) return; // rejection already noted

    const result = await StreamApi.post(speaker, sh.service, sh.handle, body);
    if (result.ok) return; // the mirror is delivered to tuned-in players

    switch (result.reason) {
      case 'read-only':
        return this.fail(
          context,
          sh.service === 'kick'
            ? 'Kick chat is read-only for now — posting arrives with ' +
              'Kick phase 2.'
            : 'YouTube posting isn’t available — YouTube chat is read-only.',
          'read-only',
        );
      case 'no-channel':
        return this.fail(
          context,
          `Follow ${sh.service} #${sh.handle} first: tune ${sh.handle} --${sh.service}`,
          'no-channel',
        );
      case 'empty':
        return this.fail(context, 'message required', 'message-required');
      case 'unlinked':
        return this.fail(
          context,
          'Link your Twitch account to post here: /auth/twitch/link',
          'unlinked',
        );
      case 'unscoped':
        return this.fail(
          context,
          'Authorize chat posting first: /auth/twitch/reauth?scope=user:write:chat',
          'unscoped',
        );
      case 'throttled':
        return this.fail(
          context,
          "You're posting too fast — give it a moment.",
          'throttled',
        );
      case 'send-failed':
        return this.fail(
          context,
          `Send failed${result.detail ? `: ${result.detail}` : ''}.`,
          'send-failed',
        );
    }
  }
}
