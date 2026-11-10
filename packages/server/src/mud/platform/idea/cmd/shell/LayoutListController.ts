/**
 * LayoutListController — `cockpit layout list`: what is available in
 * this mode, the active one starred (over {@link LayoutControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { LayoutControllerBase, type LayoutModel } from './LayoutControllerBase';

export default class LayoutListController extends LayoutControllerBase {
  execute(_model: LayoutModel, context: CommandContext): void {
    const host = this.hostOf(context);
    this.list(host, host.getCockpitMode(), context);
  }
}
