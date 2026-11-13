/**
 * ClientStylePlainController — `client-style plain <on|off>`: global plain
 * mode (over {@link ClientStyleControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { ClientStyleControllerBase, type StyleModel } from './ClientStyleControllerBase';

export default class ClientStylePlainController extends ClientStyleControllerBase {
  execute(model: StyleModel, context: CommandContext): void {
    const host = this.hostOf(context);
    const flag = ClientStyleControllerBase.flagOf(model.state);
    const next = this.cloneOverlay(host);
    if (flag) next.plain = true;
    else delete next.plain;
    this.commit(host, next);
    this.send(context, Mml.fromMarkup(`\nplain-mode ${flag ? 'on' : 'off'}\n`));
  }
}
