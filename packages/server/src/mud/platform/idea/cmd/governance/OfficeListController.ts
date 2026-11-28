/**
 * OfficeListController — `office list` and bare `office` — the public
 * roster (over {@link OfficeControllerBase}). Every holder is a character:
 * a seat on the founder default prints the founder's Compact character,
 * marked *(by default — the founder)*, or *the founder* alone while there
 * is none.
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { CompactApi } from '../../../../api/compact';
import { OfficeControllerBase, type OfficeModel } from './OfficeControllerBase';

export default class OfficeListController extends OfficeControllerBase {
  async execute(_model: OfficeModel, context: CommandContext): Promise<void> {
    const roster = await CompactApi.officeRoster();
    const lines = ['Government offices:'];
    for (const row of roster) {
      // ⭐ A character, always — the founder default is the founder's
      // Compact character (D9); never the founder's email or handle.
      const holder = !row.isFounderDefault
        ? await this.presentHolder(row.holderPlayerId ?? '')
        : row.holderPlayerId
          ? `${await this.presentHolder(row.holderPlayerId)} (by default — the founder)`
          : 'the founder';
      lines.push(
        `  ${row.displayName}  [${row.branch}/${row.origin}]  — ${holder}`,
      );
    }
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }
}
