/**
 * ProgramAboutController — `program about <name>`: a program's public facts
 * (stream arrival A1, D14's listing).
 */

import type { CommandContext } from '../../../../api/command';
import { StreamApi } from '../../../../api/stream';
import { Refusal } from '../../../../lib/errors';
import { ProgramControllerBase, type ProgramModel } from './ProgramControllerBase';

export default class ProgramAboutController extends ProgramControllerBase {
  async execute(model: ProgramModel, context: CommandContext): Promise<void> {
    const name = this.nameOf(model);
    const listing = await StreamApi.programListing(name);
    if (!listing) return this.refuse(context, new Refusal('no-such-program', { name }));
    return this.tell(context, this.describe(listing));
  }
}
