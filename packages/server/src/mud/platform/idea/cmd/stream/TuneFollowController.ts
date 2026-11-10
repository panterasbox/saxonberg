/**
 * TuneFollowController — `tune <target>`: follow a stream's chat (over {@link TuneControllerBase}).
 *
 * One of three shapes of `tune` (`tune.yaml` — bare list + subcommands;
 * `tune-follow.yaml` — this; `tune-post.yaml` — `tune <target> <message>`).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { StreamApi } from '../../../../api/stream';
import { PlayerApi } from '../../../../api/player';
import { TuneControllerBase, type TuneModel } from './TuneControllerBase';

export default class TuneFollowController extends TuneControllerBase {
  async execute(model: TuneModel, context: CommandContext): Promise<void> {
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
}
