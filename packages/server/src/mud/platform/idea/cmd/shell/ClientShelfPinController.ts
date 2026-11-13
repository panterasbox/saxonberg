/**
 * ClientShelfPinController — `client-shelf pin <row>`: add it, at the
 * end (over {@link ClientShelfControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { ClientShelfControllerBase, type ShelfModel } from './ClientShelfControllerBase';

export default class ClientShelfPinController extends ClientShelfControllerBase {
  execute(model: ShelfModel, context: CommandContext): void {
    const host = this.hostOf(context);
    const row = model.row!;
    const current = this.currentShelf(host);
    if (current.includes(row)) {
      return this.say(context, `${row} is already on the shelf`);
    }
    // Appended, not inserted at the catalogue position: the order is
    // the player's, and a pin that reshuffled the shelf would move rows
    // the player did not touch.
    this.commit(host, [...current, row]);
    this.say(context, `${row} pinned to the shelf`);
  }
}
