/**
 * CockpitCardListController — `cockpit card` / `cockpit card list`: what
 * is open, its state, its liveness, its size and place (over {@link
 * CockpitCardControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { CockpitCardControllerBase, type CardModel } from './CockpitCardControllerBase';

export default class CockpitCardListController extends CockpitCardControllerBase {
  execute(_model: CardModel, context: CommandContext): void {
    const interactive = this.interactiveOf(context);
    if (!interactive) return;
    const cards = interactive.listCards();
    if (cards.length === 0) {
      return this.send(context, Mml.fromMarkup('\nno cards open\n'));
    }
    const lines = ['\ncards'];
    for (const c of cards) {
      /*
       * ⚠ Name it by its CATALOGUE id. The instance id is server-minted
       * transport plumbing — printing `card-X9aYf67qws…` at a player is
       * the transport leaking into the interface, and it is the id the
       * catalogue exists to stop being an identity.
       */
      const state = c.pinned ? 'pinned' : 'open';
      /*
       * ⭐ **Say which cards are live.** Liveness is the axis a player
       * cannot otherwise observe: a static card shows a timestamp and a
       * refresh, a live one shows neither, and without the word here the
       * only way to tell them apart is to watch one fail to update.
       */
      const liveness = c.live ? 'live' : 'static';
      const where = c.placed ? `, at ${c.placed.col},${c.placed.row}` : '';
      const tray = c.minimized ? ', in the tray' : '';
      const role = c.role ? `, ${c.role}` : '';
      lines.push(
        `  ${c.cardId} (${state}, ${liveness}, ${c.size}${where}${tray}${role}) — ${c.key}`,
      );
    }
    lines.push('');
    this.send(context, Mml.fromMarkup(Mml.escape(lines.join('\n'))));
  }
}
