/**
 * SoulListController — `soul list` (and bare `soul`): the whole catalogue (over {@link SoulControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { SoulApi } from '../../../../api/soul';
import { SoulControllerBase, type SoulModel } from './SoulControllerBase';

export default class SoulListController extends SoulControllerBase {
  async execute(_model: SoulModel, context: CommandContext): Promise<void> {
    const all = await SoulApi.all();
    if (all.length === 0) {
      this.send(context, Mml.fromMarkup(`\nNo emotes minted.\n`));
      return;
    }
    const lines = ['', `Catalog (${all.length}):`];
    const sorted = [...all].sort((a, b) => a.verb.localeCompare(b.verb));
    for (const e of sorted) {
      const glyph = e.emoji ? `${e.emoji} ` : '   ';
      lines.push(`  ${glyph}${e.verb}`);
    }
    lines.push('');
    this.send(context, Mml.fromMarkup(lines.join('\n')));
  }
}
