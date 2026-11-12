/**
 * ClientCardUnpinController — `client-card unpin <card>` (and
 * `dismiss`, its other name): let it age out of the relevance window
 * again (over {@link ClientCardControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { ClientCardControllerBase, type CardModel } from './ClientCardControllerBase';

export default class ClientCardUnpinController extends ClientCardControllerBase {
  execute(model: CardModel, context: CommandContext): void {
    this.setPinned(
      model,
      context,
      false,
      'dismissed — it will age out of the relevance window',
    );
  }
}
