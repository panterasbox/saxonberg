/**
 * RodneyAgendaController — `rodney agenda <item, item, …>` /
 * `rodney agenda clear` (over {@link RodneyControllerBase}).
 *
 * `;` is the shell's command separator, so the list splits on commas.
 * ⚠ `clear` is the list's own value, not a dispatch: an agenda of the one
 * item "clear" is no agenda.
 */

import type { CommandContext } from '../../../../api/command';
import { RodneyControllerBase, type StreamModel } from './RodneyControllerBase';

export default class RodneyAgendaController extends RodneyControllerBase {
  execute(model: StreamModel, context: CommandContext): void {
    const giver = this.host(context);
    if (!giver) return;
    const items = (model.items ?? '')
      .split(',')
      .filter((item, _i, all) => !(all.length === 1 && item.trim().toLowerCase() === 'clear'));
    giver.planAgenda(items);
    const count = giver.show().agenda.length;
    return this.tell(context, count === 0 ? 'agenda cleared' : `agenda: ${count} items`);
  }
}
