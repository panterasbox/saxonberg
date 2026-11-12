/**
 * ClientShelfUnpinController — `client-shelf unpin <row>`: take it off
 * (over {@link ClientShelfControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { ClientShelfControllerBase, type ShelfModel } from './ClientShelfControllerBase';

export default class ClientShelfUnpinController extends ClientShelfControllerBase {
  execute(model: ShelfModel, context: CommandContext): void {
    const host = this.hostOf(context);
    const row = model.row!;
    const current = this.currentShelf(host);
    if (!current.includes(row)) {
      return this.say(context, `${row} is not on the shelf`);
    }
    this.commit(
      host,
      current.filter((r) => r !== row),
    );
    this.say(context, `${row} taken off the shelf`);
  }
}
