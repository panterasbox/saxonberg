/**
 * TitleOfflineController — `title offline <extent>`: take the content on
 * ground you hold down. The gate and the words are
 * {@link TitleControllerBase.declareLive}'s.
 */

import { TitleControllerBase, type TitleModel } from './TitleControllerBase';
import type { CommandContext } from '../../../../api/command';

export default class TitleOfflineController extends TitleControllerBase {
  async execute(model: TitleModel, context: CommandContext): Promise<void> {
    return this.declareLive(model, context, false);
  }
}
