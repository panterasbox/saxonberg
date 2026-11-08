/**
 * TuneOffController — `tune off <target>`: stop following a channel's chat (over {@link TuneControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { StreamApi } from '../../../../api/stream';
import { PlayerApi } from '../../../../api/player';
import { TuneControllerBase, type TuneModel } from './TuneControllerBase';

export default class TuneOffController extends TuneControllerBase {
  async execute(model: TuneModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver;
    if (!PlayerApi.isAvatarStuff(actor)) {
      return this.fail(context, 'Only players tune in.', 'avatar-required');
    }
    const parsed = this.parseTarget(model);
    if (parsed.form === 'reject') return this.rejectParse(context, parsed);
    const sh = await this.serviceHandle(parsed);
    if (!sh.ok) return;

    const res = await StreamApi.untune(actor, sh.service, sh.handle);
    if (!res.ok) {
      return this.fail(
        context,
        `You aren't following '${sh.handle}'.`,
        'unknown-target',
      );
    }
    await this.publishTuned(actor);
    this.send(
      context,
      Mml.compose`\nStopped following ${sh.service} #${res.handle ?? sh.handle}.\n`,
    );
  }
}
