/**
 * WikiDeleteController — `wiki delete <page>`: soft-delete; revisions untouched (over {@link WikiControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { WikiControllerBase, type WikiModel } from './WikiControllerBase';

export default class WikiDeleteController extends WikiControllerBase {
  protected async run(model: WikiModel, context: CommandContext): Promise<void> {
    return this.setDeleted(model, context, true);
  }
}
