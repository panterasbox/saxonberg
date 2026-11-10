/**
 * CockpitCardUnpinController — `cockpit card unpin <card>` (and
 * `dismiss`, its other name): let it age out of the relevance window
 * again (over {@link CockpitCardControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { CockpitCardControllerBase, type CardModel } from './CockpitCardControllerBase';

export default class CockpitCardUnpinController extends CockpitCardControllerBase {
  execute(model: CardModel, context: CommandContext): void {
    this.setPinned(
      model,
      context,
      false,
      'dismissed — it will age out of the relevance window',
    );
  }
}
