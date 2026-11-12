/**
 * ClientLayoutListController — `client-layout list`: what is available in
 * this mode, the active one starred (over {@link ClientLayoutControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { ClientLayoutControllerBase, type LayoutModel } from './ClientLayoutControllerBase';

export default class ClientLayoutListController extends ClientLayoutControllerBase {
  execute(_model: LayoutModel, context: CommandContext): void {
    const host = this.hostOf(context);
    this.list(host, host.getCockpitMode(), context);
  }
}
