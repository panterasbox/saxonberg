/**
 * CockpitShelfUnpinController — `cockpit shelf unpin <row>`: take it off
 * (over {@link CockpitShelfControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { CockpitShelfControllerBase, type ShelfModel } from './CockpitShelfControllerBase';

export default class CockpitShelfUnpinController extends CockpitShelfControllerBase {
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
