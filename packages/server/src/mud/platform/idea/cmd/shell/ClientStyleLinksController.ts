/**
 * ClientStyleLinksController — `client-style links <words|ids>`: what a
 * clickable names its target by (#91) (over {@link ClientStyleControllerBase}).
 *
 * `words` (the default) sends the primary keyword — `look stool`, and an
 * ambiguous word asks which, as typing it would. `ids` sends `#<id>` for
 * a player who would rather never be asked.
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { ClientStyleControllerBase, type StyleModel } from './ClientStyleControllerBase';

export default class ClientStyleLinksController extends ClientStyleControllerBase {
  execute(model: StyleModel, context: CommandContext): void {
    const host = this.hostOf(context);
    const choice = model.choice;
    const ids = choice === 'ids';
    const next = this.cloneOverlay(host);
    if (ids) next.links = 'ids';
    else delete next.links;
    this.commit(host, next);
    this.send(
      context,
      Mml.fromMarkup(
        ids
          ? '\nclickables name their target by id\n'
          : '\nclickables name their target by its word\n',
      ),
    );
  }
}
