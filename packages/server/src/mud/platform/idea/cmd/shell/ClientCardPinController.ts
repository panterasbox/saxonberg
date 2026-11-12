/**
 * ClientCardPinController — `client-card pin <card>`: keep it out of
 * the relevance window; a pinned card stays live (over {@link
 * ClientCardControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { ClientCardControllerBase, type CardModel } from './ClientCardControllerBase';

export default class ClientCardPinController extends ClientCardControllerBase {
  execute(model: CardModel, context: CommandContext): void {
    this.setPinned(model, context, true, 'pinned — it will stay until you dismiss it');
  }
}
