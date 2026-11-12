/**
 * ClientStyleThemeController — `client-style theme <ink|marble|high-contrast>`
 * (over {@link ClientStyleControllerBase}).
 *
 * The shipped theme vocabulary is the view's `values:` list on `theme`
 * — **that list is the authority**; the client's `ThemeName` type tracks
 * it, not the other way round, because a client-only rename leaves the
 * verb refusing a theme the client has. ⚠ `default` is retired and NOT
 * aliased: it stopped naming anything the moment there were two grounds
 * (the dark one is Ink), so `client-style theme default` is refused by
 * the binder, naming the three.
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { ClientStyleControllerBase, type StyleModel } from './ClientStyleControllerBase';

export default class ClientStyleThemeController extends ClientStyleControllerBase {
  execute(model: StyleModel, context: CommandContext): void {
    const host = this.hostOf(context);
    const name = model.theme!;
    const next = this.cloneOverlay(host);
    next.theme = name;
    this.commit(host, next);
    this.send(context, Mml.fromMarkup(`\ntheme set to ${Mml.escape(name)}\n`));
  }
}
