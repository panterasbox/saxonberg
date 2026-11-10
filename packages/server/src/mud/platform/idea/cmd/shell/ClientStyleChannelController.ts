/**
 * ClientStyleChannelController — `client-style channel <key> color <value>` and
 * `client-style channel <key> clear`: a chat channel's overlay rules
 * (over {@link ClientStyleControllerBase}).
 *
 * ⚠ The one style form whose second word comes AFTER an argument, so the
 * grammar cannot nest it (a stanza's words come before its args): `color`
 * / `clear` is a `values:` slot and this controller writes or drops the
 * channel's rules by it (controller-liquidity W7b; the typed form is
 * unchanged, which the owner's read promised for `client-style`).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { ClientStyleControllerBase, type StyleModel } from './ClientStyleControllerBase';

export default class ClientStyleChannelController extends ClientStyleControllerBase {
  execute(model: StyleModel, context: CommandContext): void {
    const host = this.hostOf(context);
    const channelKey = model.key!;
    const next = this.cloneOverlay(host);
    const colorKey = `channel.${channelKey}.color`;
    const plainKey = `plain.channel.${channelKey}`;
    const value = model.value;
    const clearing = model.action !== 'color';

    if (clearing) {
      delete next[colorKey];
      delete next[plainKey];
      this.commit(host, next);
      this.send(
        context,
        Mml.fromMarkup(`\nchannel '${Mml.escape(channelKey)}' rules cleared\n`),
      );
      return;
    }
    if (!value) {
      return this.fail(
        context,
        `usage: client-style channel ${channelKey} color <value>`,
        'missing-arg',
      );
    }
    next[colorKey] = value;
    this.commit(host, next);
    this.send(
      context,
      Mml.fromMarkup(
        `\nchannel '${Mml.escape(channelKey)}' color set to ${Mml.escape(value)}\n`,
      ),
    );
  }
}
