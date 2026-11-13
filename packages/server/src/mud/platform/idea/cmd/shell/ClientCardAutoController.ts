/**
 * ClientCardAutoController — `client-card auto <card>`: hand the pin
 * decision back to the catalogue's own default (over {@link
 * ClientCardControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { ClientCardControllerBase, type CardModel } from './ClientCardControllerBase';

export default class ClientCardAutoController extends ClientCardControllerBase {
  execute(model: CardModel, context: CommandContext): void {
    this.setPinned(model, context, null, 'returned to its default');
  }
}
