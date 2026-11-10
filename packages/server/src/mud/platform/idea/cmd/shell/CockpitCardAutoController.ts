/**
 * CockpitCardAutoController — `cockpit card auto <card>`: hand the pin
 * decision back to the catalogue's own default (over {@link
 * CockpitCardControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { CockpitCardControllerBase, type CardModel } from './CockpitCardControllerBase';

export default class CockpitCardAutoController extends CockpitCardControllerBase {
  execute(model: CardModel, context: CommandContext): void {
    this.setPinned(model, context, null, 'returned to its default');
  }
}
