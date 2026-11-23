/**
 * RodneyLiveController — `rodney live` / `rodney back`: the desktop on
 * the air, from Starting Soon or back from Away (over {@link
 * RodneyControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { RodneyControllerBase, type StreamModel } from './RodneyControllerBase';

export default class RodneyLiveController extends RodneyControllerBase {
  execute(_model: StreamModel, context: CommandContext): void {
    const giver = this.host(context);
    if (!giver) return;
    return this.answer(context, giver.goLive(), 'live — the desktop is on air');
  }
}
