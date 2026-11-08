/**
 * SoulDeleteController — `soul delete <verb>`: drop an emote from the catalogue (over {@link SoulControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { SoulApi } from '../../../../api/soul';
import { SoulControllerBase, type SoulModel } from './SoulControllerBase';

export default class SoulDeleteController extends SoulControllerBase {
  async execute(model: SoulModel, context: CommandContext): Promise<void> {
    if (await this.refuseUnlessCommittee(model, context)) return;
    const verb = (model.verb ?? '').toLowerCase().trim();
    if (!verb) return this.fail(context, 'verb required', 'verb-required');
    const ok = await SoulApi.delete(verb);
    if (!ok) {
      return this.fail(context, `No emote '${verb}'.`, 'no-such-emote');
    }
    this.send(context, Mml.compose`\nDeleted emote '${verb}'.\n`);
  }
}
