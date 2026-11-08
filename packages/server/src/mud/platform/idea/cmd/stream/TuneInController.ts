/**
 * TuneInController — the bare form (`fallthrough: true`): `tune <target>` follows a stream's chat, `tune <target> <message>` posts to it (Twitch), and bare `tune` lists (over {@link TuneControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { StreamApi } from '../../../../api/stream';
import { PlayerApi } from '../../../../api/player';
import { TuneControllerBase, type TuneModel } from './TuneControllerBase';

export default class TuneInController extends TuneControllerBase {
  async execute(model: TuneModel, context: CommandContext): Promise<void> {
    const target = (model.target ?? '').trim();
    if (!target) return this.listTuned(context);
    const message = (model.message ?? '').trim();
    if (message) return this.executePost(model, context, message);
    return this.executeTuneIn(model, context);
  }

  private async executeTuneIn(
    model: TuneModel,
    context: CommandContext,
  ): Promise<void> {
    const actor = context.commandGiver;
    if (!PlayerApi.isAvatarStuff(actor)) {
      return this.fail(context, 'Only players tune in.', 'avatar-required');
    }
    const parsed = this.parseTarget(model);
    if (parsed.form === 'reject') return this.rejectParse(context, parsed);

    const resolved = await StreamApi.resolveTarget(parsed);
    if (!resolved.ok) return this.rejectResolve(context, parsed, resolved.reason);

    const res = await StreamApi.tune(actor, resolved.target);
    await this.publishTuned(actor);
    this.send(
      context,
      Mml.compose`\nFollowing ${res.ok ? res.service : ''} #${
        res.ok ? res.handle : resolved.target.handle
      }.\n`,
    );
  }

  private async executePost(
    model: TuneModel,
    context: CommandContext,
    body: string,
  ): Promise<void> {
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
