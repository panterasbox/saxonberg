/**
 * SoulDisableController — `soul disable <verb>`: switch an emote off without losing it (over {@link SoulControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { SoulControllerBase, type SoulModel } from './SoulControllerBase';

export default class SoulDisableController extends SoulControllerBase {
  async execute(model: SoulModel, context: CommandContext): Promise<void> {
    if (await this.refuseUnlessCommittee(model, context)) return;
    return this.setDisabled(model, context, true);
  }
}
