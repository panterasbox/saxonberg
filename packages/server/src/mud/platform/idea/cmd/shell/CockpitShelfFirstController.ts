/**
 * CockpitShelfFirstController — `cockpit shelf first <row>`: move it to
 * the front, pinning it there if it was off (over {@link
 * CockpitShelfControllerBase}).
 *
 * ⭐ **`first` exists because the shelf has an ORDER and a phone can only
 * show the head of it** — choosing what rides a phone's bar is exactly
 * reordering the shelf. ⚠ It **pins first when the row was not pinned**,
 * because *"put this on my bar"* is ONE intention, not two commands.
 */

import type { CommandContext } from '../../../../api/command';
import { CockpitShelfControllerBase, type ShelfModel } from './CockpitShelfControllerBase';

export default class CockpitShelfFirstController extends CockpitShelfControllerBase {
  execute(model: ShelfModel, context: CommandContext): void {
    const host = this.hostOf(context);
    const row = model.row!;
    const current = this.currentShelf(host);
    if (current[0] === row) {
      // Already the head. Not an error — the state the player asked for
      // is the state they have — and crucially not a rewrite, which would
      // push an identical array and re-save for nothing.
      return this.say(context, `${row} already heads the shelf`);
    }
    const wasPinned = current.includes(row);
    this.commit(host, [row, ...current.filter((r) => r !== row)]);
    this.say(
      context,
      wasPinned
        ? `${row} moved to the front of the shelf`
        : `${row} pinned to the front of the shelf`,
    );
  }
}
