/**
 * StyleShowController — `cockpit style` / `cockpit style show`: print the
 * current overlay as readable JSON (over {@link StyleControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import type { StyleOverlay } from '@saxonberg/types';
import { STYLE_KEY, StyleControllerBase, type StyleModel } from './StyleControllerBase';

export default class StyleShowController extends StyleControllerBase {
  execute(_model: StyleModel, context: CommandContext): void {
    const overlay = this.hostOf(context).getClientState<StyleOverlay>(STYLE_KEY);
    const body = Object.keys(overlay).length === 0
      ? 'overlay is empty'
      : JSON.stringify(overlay, null, 2);
    this.send(context, Mml.fromMarkup(`\n${Mml.escape(body)}\n`));
  }
}
