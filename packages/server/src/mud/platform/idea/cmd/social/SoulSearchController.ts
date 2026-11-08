/**
 * SoulSearchController — `soul search <term>`: every emote a term finds (verb, tag, or search term) — search terms never dispatch; this is how an author finds the verb that does (over {@link SoulControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { SoulApi } from '../../../../api/soul';
import { SoulControllerBase, type SoulModel } from './SoulControllerBase';

export default class SoulSearchController extends SoulControllerBase {
  async execute(model: SoulModel, context: CommandContext): Promise<void> {
    const term = (model.verb ?? '').toLowerCase().trim();
    if (!term) return this.fail(context, 'term required', 'term-required');
    const hits = await SoulApi.search(term);
    if (hits.length === 0) {
      this.send(context, Mml.fromMarkup(`\nNo emote matches '${term}'.\n`));
      return;
    }
    const lines = ['', `'${term}' finds (${hits.length}):`];
    for (const e of hits) {
      const glyph = e.emoji ? `${e.emoji} ` : '   ';
      lines.push(`  ${glyph}${e.verb}`);
    }
    lines.push('');
    this.send(context, Mml.fromMarkup(lines.join('\n')));
  }
}
