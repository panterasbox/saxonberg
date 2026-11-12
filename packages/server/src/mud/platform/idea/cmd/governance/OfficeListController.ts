/**
 * OfficeListController — `office list` and bare `office` — the public
 * roster (over {@link OfficeControllerBase}).
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
      const holder = row.isFounderDefault
        ? `${row.founderLabel} (founder)`
        : await this.presentHolder(row.holderPlayerId ?? '');
      lines.push(
        `  ${row.displayName}  [${row.branch}/${row.origin}]  — ${holder}`,
      );
    }
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }
}
