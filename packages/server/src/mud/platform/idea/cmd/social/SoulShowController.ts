/**
 * SoulShowController — `soul show <verb>`: print one emote, marked when disabled (over {@link SoulControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { SoulApi } from '../../../../api/soul';
import { SoulControllerBase, type SoulModel } from './SoulControllerBase';

export default class SoulShowController extends SoulControllerBase {
  async execute(model: SoulModel, context: CommandContext): Promise<void> {
    const verb = (model.verb ?? '').toLowerCase().trim();
    if (!verb) return this.fail(context, 'verb required', 'verb-required');
    const e = await SoulApi.resolveAny(verb);
    if (!e) return this.fail(context, `No emote '${verb}'.`, 'no-such-emote');
    const lines = [
      '',
      `  verb:     ${e.verb}${e.disabled ? '  (disabled)' : ''}`,
      `  search terms: ${e.searchTerms.join(', ') || '(none)'}`,
      `  emoji:    ${e.emoji ?? '(none)'}`,
      `  echo:     ${e.echo}`,
      `  tags:     ${e.tags.join(', ') || '(none)'}`,
      `  template: ${e.grammar.template}`,
      `  slots:    ${JSON.stringify(e.grammar.slots)}`,
      '',
    ];
    this.send(context, Mml.fromMarkup(lines.join('\n')));
  }
}
