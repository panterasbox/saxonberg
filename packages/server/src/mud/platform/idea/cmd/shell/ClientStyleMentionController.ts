/**
 * ClientStyleMentionController — `client-style mention <on|off>`: the
 * own-name highlight (over {@link ClientStyleControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { ClientStyleControllerBase, type StyleModel } from './ClientStyleControllerBase';

export default class ClientStyleMentionController extends ClientStyleControllerBase {
  execute(model: StyleModel, context: CommandContext): void {
    const host = this.hostOf(context);
    const flag = ClientStyleControllerBase.flagOf(model.state);
    const next = this.cloneOverlay(host);
    next['mention.self'] = flag;
    this.commit(host, next);
    this.send(
      context,
      Mml.fromMarkup(`\nown-name highlight ${flag ? 'on' : 'off'}\n`),
    );
  }
}
