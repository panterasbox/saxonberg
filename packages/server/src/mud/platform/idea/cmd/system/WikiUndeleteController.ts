/**
 * WikiUndeleteController — `wiki undelete <page>`: restore a deleted page (over {@link WikiControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { WikiControllerBase, type WikiModel } from './WikiControllerBase';

export default class WikiUndeleteController extends WikiControllerBase {
  protected async run(model: WikiModel, context: CommandContext): Promise<void> {
    return this.setDeleted(model, context, false);
  }
}
