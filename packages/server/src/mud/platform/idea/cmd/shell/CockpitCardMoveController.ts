/**
 * CockpitCardMoveController — `cockpit card move <card> <col> <row>`:
 * place it there; the column's cards below shift down (over {@link
 * CockpitCardArrangeController}, whose one act it is, with a position).
 */

import type { CommandContext } from '../../../../api/command';
import CockpitCardArrangeController from './CockpitCardArrangeController';
import type { CardModel } from './CockpitCardControllerBase';

export default class CockpitCardMoveController extends CockpitCardArrangeController {
  override execute(model: CardModel, context: CommandContext): void {
    // The view binds both as required numbers; a position the registry
    // will not take is its `bad-position`.
    this.arrange(model, context, 'move', {
      col: model.col ?? Number.NaN,
      row: model.row ?? Number.NaN,
    });
  }
}
