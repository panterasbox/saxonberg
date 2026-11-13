/**
 * ClientStyleResetController — `client-style reset`: clear the overlay to {}
 * (over {@link ClientStyleControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { ClientStyleControllerBase, type StyleModel } from './ClientStyleControllerBase';

export default class ClientStyleResetController extends ClientStyleControllerBase {
  execute(_model: StyleModel, context: CommandContext): void {
    this.commit(this.hostOf(context), {});
    this.send(context, Mml.fromMarkup('\noverlay cleared\n'));
  }
}
