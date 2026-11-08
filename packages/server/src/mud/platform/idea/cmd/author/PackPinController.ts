/**
 * PackPinController — `pack pin <packId> <path>`: claim a row — never compared again until unpinned (over {@link PackControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { PackControllerBase, type PackModel } from './PackControllerBase';

export default class PackPinController extends PackControllerBase {
  async execute(model: PackModel, context: CommandContext): Promise<void> {
    return this.setPinned(model, context, true);
  }
}
