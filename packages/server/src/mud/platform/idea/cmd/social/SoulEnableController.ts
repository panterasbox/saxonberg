/**
 * SoulEnableController — `soul enable <verb>`: switch a disabled emote back on (over {@link SoulControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { SoulControllerBase, type SoulModel } from './SoulControllerBase';

export default class SoulEnableController extends SoulControllerBase {
  async execute(model: SoulModel, context: CommandContext): Promise<void> {
    if (await this.refuseUnlessCommittee(model, context)) return;
    return this.setDisabled(model, context, false);
  }
}
