/**
 * RodneyOffController — `rodney off`: offline now (over {@link
 * RodneyControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { RodneyControllerBase, type StreamModel } from './RodneyControllerBase';

export default class RodneyOffController extends RodneyControllerBase {
  execute(_model: StreamModel, context: CommandContext): void {
    const giver = this.host(context);
    if (!giver) return;
    return this.answer(context, giver.goOffline(), 'offline');
  }
}
