/**
 * SubjectMakeController — `subject make <name> [--group <ref>]
 * [--public]` — create a subject (over {@link SubjectControllerBase}).
 * Default mints a managed group (curated); `--group <ref>` binds an
 * existing `guild:`/`mql:`/`contacts:`/`managed:` ref; `--public` leaves
 * the audience open.
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { SubjectApi } from '../../../../api/subject';
import { SubjectControllerBase, type SubjectModel } from './SubjectControllerBase';

export default class SubjectMakeController extends SubjectControllerBase {
  async execute(model: SubjectModel, context: CommandContext): Promise<void> {
    const name = (model.name ?? '').trim();
    if (!name) {
      return SubjectControllerBase.fail(context, 'subject name required', 'name-required');
    }
    const group = (model.group ?? '').trim();
    try {
      const subject = await SubjectApi.makeSubject(context.commandGiver, name, {
        open: model.open === true,
        ...(group ? { groupRef: group } : {}),
      });
      const binding = subject.isOpen()
        ? 'open'
        : group
          ? `bound to ${group}`
          : 'curated (managed group minted)';
      SubjectControllerBase.send(
        context,
        Mml.compose`\nCreated subject '${subject.getTitle()}' (${Mml.fromMarkup(binding)}).\n`,
      );
    } catch (err) {
      return SubjectControllerBase.fail(context, (err as Error).message, 'make-failed');
    }
  }
}
