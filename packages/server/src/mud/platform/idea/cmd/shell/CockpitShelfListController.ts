/**
 * CockpitShelfListController — `cockpit shelf` / `cockpit shelf list`:
 * every row in catalogue order with its pinned-ness (over {@link
 * CockpitShelfControllerBase}).
 *
 * Including the rows that are NOT pinned, which is the half that makes
 * this a catalogue rather than a dump of current state. A player cannot
 * pin what the verb never mentioned.
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { SHELF_ROW_IDS } from '@saxonberg/types';
import { CockpitShelfControllerBase, type ShelfModel } from './CockpitShelfControllerBase';

export default class CockpitShelfListController extends CockpitShelfControllerBase {
  execute(_model: ShelfModel, context: CommandContext): void {
    const pinned = new Set(this.currentShelf(this.hostOf(context)));
    const lines = [`\nshelf (${pinned.size} of ${SHELF_ROW_IDS.length} pinned)`];
    for (const row of SHELF_ROW_IDS) {
      lines.push(`  ${row.padEnd(8)} ${pinned.has(row) ? 'pinned' : '—'}`);
    }
    lines.push('');
    this.send(context, Mml.fromMarkup(Mml.escape(lines.join('\n'))));
  }
}
