/**
 * StylePlainController — `cockpit style plain <on|off>`: global plain
 * mode (over {@link StyleControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { StyleControllerBase, type StyleModel } from './StyleControllerBase';

export default class StylePlainController extends StyleControllerBase {
  execute(model: StyleModel, context: CommandContext): void {
    const host = this.hostOf(context);
    const flag = StyleControllerBase.flagOf(model.state);
    const next = this.cloneOverlay(host);
    if (flag) next.plain = true;
    else delete next.plain;
    this.commit(host, next);
    this.send(context, Mml.fromMarkup(`\nplain-mode ${flag ? 'on' : 'off'}\n`));
  }
}
