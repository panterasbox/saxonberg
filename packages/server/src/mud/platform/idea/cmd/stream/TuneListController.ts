/**
 * TuneListController — `tune list`: the channels you follow (over {@link TuneControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { TuneControllerBase, type TuneModel } from './TuneControllerBase';

export default class TuneListController extends TuneControllerBase {
  async execute(_model: TuneModel, context: CommandContext): Promise<void> {
    return this.listTuned(context);
  }
}
