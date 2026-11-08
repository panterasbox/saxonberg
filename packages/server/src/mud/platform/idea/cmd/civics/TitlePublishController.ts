/**
 * TitlePublishController — `title publish <extent>`: declare the content on
 * ground you hold open. The gate and the words are
 * {@link TitleControllerBase.declareLive}'s.
 */

import { TitleControllerBase, type TitleModel } from './TitleControllerBase';
import type { CommandContext } from '../../../../api/command';

export default class TitlePublishController extends TitleControllerBase {
  async execute(model: TitleModel, context: CommandContext): Promise<void> {
    return this.declareLive(model, context, true);
  }
}
