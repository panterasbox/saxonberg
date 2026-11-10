/**
 * SubjectListController — `subject list` — the subjects visible to you
 * (open always; ref-backed to members), each with its lit surfaces (over
 * {@link SubjectControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import type { SubjectSubscriber } from '../../../../lib/forum/SubjectSubscriber';
import type { CommandGiver } from '../../../../lib/command/CommandGiver';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { SubjectControllerBase, type SubjectModel } from './SubjectControllerBase';

export default class SubjectListController extends SubjectControllerBase {
  async execute(_model: SubjectModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as Stuff & CommandGiver &
      SubjectSubscriber;
    const subjects = await giver.visibleSubjects();
    if (subjects.length === 0) {
      SubjectControllerBase.send(context, Mml.fromMarkup(`\nNo subjects.\n`));
      return;
    }
    const lines = ['Subjects:'];
    for (const s of subjects) {
      const surfaces = s.getManifestations().map((m) => m.surface).join(', ');
      const audience = s.isOpen() ? 'open' : 'members';
      lines.push(
        `  ${s.getTitle()}  [${audience}]${surfaces ? `  — ${surfaces}` : ''}`,
      );
    }
    SubjectControllerBase.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }
}
