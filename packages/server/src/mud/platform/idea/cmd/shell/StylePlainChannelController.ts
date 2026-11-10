/**
 * StylePlainChannelController — `cockpit style plain channel <key>
 * <on|off>`: one channel in plain mode (over {@link StyleControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { StyleControllerBase, type StyleModel } from './StyleControllerBase';

export default class StylePlainChannelController extends StyleControllerBase {
  execute(model: StyleModel, context: CommandContext): void {
    const host = this.hostOf(context);
    const channel = model.key!;
    const flag = StyleControllerBase.flagOf(model.state);
    const next = this.cloneOverlay(host);
    const key = `plain.channel.${channel}`;
    if (flag) next[key] = true;
    else delete next[key];
    this.commit(host, next);
    this.send(
      context,
      Mml.fromMarkup(
        `\nchannel '${Mml.escape(channel)}' plain-mode ${flag ? 'on' : 'off'}\n`,
      ),
    );
  }
}
