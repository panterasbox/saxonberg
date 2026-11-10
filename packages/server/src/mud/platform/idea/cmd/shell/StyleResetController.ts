/**
 * StyleResetController — `cockpit style reset`: clear the overlay to {}
 * (over {@link StyleControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { StyleControllerBase, type StyleModel } from './StyleControllerBase';

export default class StyleResetController extends StyleControllerBase {
  execute(_model: StyleModel, context: CommandContext): void {
    this.commit(this.hostOf(context), {});
    this.send(context, Mml.fromMarkup('\noverlay cleared\n'));
  }
}
