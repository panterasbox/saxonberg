/**
 * PackUnpinController — `pack unpin <packId> <path>`: release a pinned row to the next reconcile (over {@link PackControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { PackControllerBase, type PackModel } from './PackControllerBase';

export default class PackUnpinController extends PackControllerBase {
  async execute(model: PackModel, context: CommandContext): Promise<void> {
    return this.setPinned(model, context, false);
  }
}
