/**
 * CockpitCardPinController — `cockpit card pin <card>`: keep it out of
 * the relevance window; a pinned card stays live (over {@link
 * CockpitCardControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { CockpitCardControllerBase, type CardModel } from './CockpitCardControllerBase';

export default class CockpitCardPinController extends CockpitCardControllerBase {
  execute(model: CardModel, context: CommandContext): void {
    this.setPinned(model, context, true, 'pinned — it will stay until you dismiss it');
  }
}
