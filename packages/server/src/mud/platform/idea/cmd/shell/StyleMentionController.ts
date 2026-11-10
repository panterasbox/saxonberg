/**
 * StyleMentionController — `cockpit style mention self <on|off>`: the
 * own-name highlight (over {@link StyleControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { StyleControllerBase, type StyleModel } from './StyleControllerBase';

export default class StyleMentionController extends StyleControllerBase {
  execute(model: StyleModel, context: CommandContext): void {
    const host = this.hostOf(context);
    const flag = StyleControllerBase.flagOf(model.state);
    const next = this.cloneOverlay(host);
    next['mention.self'] = flag;
    this.commit(host, next);
    this.send(
      context,
      Mml.fromMarkup(`\nown-name highlight ${flag ? 'on' : 'off'}\n`),
    );
  }
}
