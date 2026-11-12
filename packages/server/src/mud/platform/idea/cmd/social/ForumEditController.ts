/**
 * ForumEditController — `forum edit <entry> <body>` — edit a body in place (author or owner; a lossless `entry-edited` trail) (over {@link ForumControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { ForumsApi } from '../../../../api/forums';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { SubjectSubscriber } from '../../../../lib/forum/SubjectSubscriber';
import type { CommandGiver } from '../../../../lib/command/CommandGiver';
import { ForumControllerBase, type ForumModel } from './ForumControllerBase';

export default class ForumEditController extends ForumControllerBase {
  async execute(model: ForumModel, context: CommandContext): Promise<void> {
    if (this.refuseUnlessForums(context)) return;
    const actor = context.commandGiver as Stuff & CommandGiver &
      SubjectSubscriber;
    const entryId = (model.entry ?? '').trim();
    if (!entryId) return this.fail(context, 'entry required', 'entry-required');
    const entry = await ForumsApi.getEntry(entryId);
    if (!entry) return this.fail(context, `No entry '${entryId}'.`, 'no-such-entry');
    const body = await this.resolveBody(model, context, 'Edit the body:');
    if (body === null) return; // needs-input, noted (a script has no editor)
    if (!body) return this.fail(context, 'body required', 'body-required');
    try {
      await actor.editEntryBody(entry, body);
      this.send(context, Mml.compose`\nEdited (#${entry._id ?? '?'}).\n`);
    } catch (err) {
      return this.failFrom(context, err, 'edit-failed');
    }
  }
}
