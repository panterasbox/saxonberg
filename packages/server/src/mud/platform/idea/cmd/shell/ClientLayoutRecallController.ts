/**
 * ClientLayoutRecallController — `client-layout recall <name>` and the
 * fallthrough `client-layout <name>`: activate an arrangement of this
 * mode and open its cards (over {@link ClientLayoutControllerBase}).
 *
 * Bare `client-layout` reaches here with no name (the stanza's own
 * controller) and answers with the list — a recall with nothing named
 * shows what there is to recall.
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { MODE_PRIMARY_FILTER } from '@saxonberg/types';
import { ClientLayoutControllerBase, type LayoutModel } from './ClientLayoutControllerBase';

export default class ClientLayoutRecallController extends ClientLayoutControllerBase {
  execute(model: LayoutModel, context: CommandContext): void {
    const host = this.hostOf(context);
    const mode = host.getCockpitMode();
    const name = model.name?.trim();
    if (!name) return this.list(host, mode, context);

    if (!host.getArrangementNames(mode).includes(name)) {
      // Name the owning mode when there is one. This is the difference
      // between a useful refusal and a dead end.
      const elsewhere = host.findArrangementMode(name, mode);
      if (elsewhere) {
        return this.fail(
          context,
          `'${name}' is a ${elsewhere} arrangement, and you are in ${mode} ` +
            `(try \`cockpit mode ${elsewhere}\` first)`,
          'wrong-mode-arrangement',
        );
      }
      return this.fail(
        context,
        `unknown ${mode} arrangement '${name}' ` +
          `(known: ${host.getArrangementNames(mode).join(', ')})`,
        'unknown-arrangement',
      );
    }

    this.commit(host, mode, name);
    /*
     * ⭐⭐ **Recalling an arrangement now OPENS it.**
     *
     * ⚠ Until this build, `save` wrote a card list that `recall` never
     * read: the name appeared in `list`, recalling it restored nothing,
     * and the whole feature was a naming feature. The card catalogue
     * fixed the first half — cards finally had a durable id worth
     * saving — and this is the second.
     */
    const interactive = context.interactive;
    if (interactive) {
      interactive.applyCardArrangement(
        host.arrangementCards(mode, name),
        MODE_PRIMARY_FILTER[mode],
      );
      // An arrangement opens the navigator with no body; fill it now.
      host.refreshNavigator();
    }
    this.send(
      context,
      Mml.fromMarkup(
        Mml.escape(`\nlayout set to ${name} (${mode})\n`),
      ),
    );
    }
}
