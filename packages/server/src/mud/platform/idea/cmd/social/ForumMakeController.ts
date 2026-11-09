/**
 * ForumMakeController — `forum make <name>` — create a subject + board (sugar); `--public`/`--group` pick the audience, `--ordered` lights the ordered organizer (over {@link ForumControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { ForumsApi } from '../../../../api/forums';
import { ForumControllerBase, type ForumModel } from './ForumControllerBase';

export default class ForumMakeController extends ForumControllerBase {
  async execute(model: ForumModel, context: CommandContext): Promise<void> {
    if (this.refuseUnlessForums(context)) return;
    const name = (model.name ?? '').trim();
    if (!name) return this.fail(context, 'forum name required', 'name-required');
    const group = (model.group ?? '').trim();
    const ordered = model.ordered === true;
    try {
      const { subject } = await ForumsApi.makeForum(context.commandGiver, name, {
        open: model.open === true,
        organizer: ordered ? 'ordered' : 'open',
        ...(group ? { groupRef: group } : {}),
        ...(model.description ? { description: model.description } : {}),
      });
      const kind = ordered ? 'ordered forum' : 'forum';
      const hint = ordered
        ? ` Post the proposal with \`forum post ${subject.getTitle()} <thesis>\`.`
        : '';
      this.send(
        context,
        Mml.compose`\nCreated ${kind} '${subject.getTitle()}'.${hint}\n`,
      );
    } catch (err) {
      return this.fail(context, (err as Error).message, 'make-failed');
    }
  }
}
