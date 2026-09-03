/**
 * SubjectController — the `subject` verb: own a subject's identity +
 * audience binding. Surfaces (chat / forum) light up separately via
 * `chat on` / `forum on`.
 *
 * Subcommands:
 *   - `make <name>` — create a subject. Default mints a managed group
 *     (curated); `--group <ref>` binds an existing
 *     `guild:`/`mql:`/`contacts:`/`managed:` ref; `--open` leaves the
 *     audience open.
 *   - `list` — subjects visible to you (open always; ref-backed to
 *     members), each with its lit surfaces.
 *
 * Dispatch-on-subcommand, the `ChatController` precedent.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { SubjectApi } from '../../../../api/subject';
import type { SubjectSubscriber } from '../../../../lib/forum/SubjectSubscriber';
import type { CommandGiver } from '../../../../lib/command/CommandGiver';
import type { Stuff } from '../../../../lib/stuff/Stuff';

interface SubjectModel extends CommandModel {
  name?: string;
  group?: string;
  open?: boolean;
}

export default class SubjectController extends CommandController<SubjectModel> {
  async execute(model: SubjectModel, context: CommandContext): Promise<void> {
    switch (model.subcommand) {
      case 'make':
        return this.executeMake(model, context);
      case 'list':
        return this.executeList(context);
      default:
        return this.fail(
          context,
          `Unknown subject subcommand: ${model.subcommand ?? '(none)'}`,
          'unknown-subcommand',
        );
    }
  }

  private async executeMake(
    model: SubjectModel,
    context: CommandContext,
  ): Promise<void> {
    const name = (model.name ?? '').trim();
    if (!name) return this.fail(context, 'subject name required', 'name-required');
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
      this.send(
        context,
        Mml.compose`\nCreated subject '${subject.getTitle()}' (${Mml.fromMarkup(binding)}).\n`,
      );
    } catch (err) {
      return this.fail(context, (err as Error).message, 'make-failed');
    }
  }

  private async executeList(context: CommandContext): Promise<void> {
    const giver = context.commandGiver as Stuff & CommandGiver &
      SubjectSubscriber;
    const subjects = await giver.visibleSubjects();
    if (subjects.length === 0) {
      this.send(context, Mml.fromMarkup(`\nNo subjects.\n`));
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
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }

  private fail(context: CommandContext, detail: string, reason: string): void {
    this.send(context, Mml.fromMarkup(`\n${detail}\n`));
    context.note({ kind: 'controller-rejected', reason, detail });
  }

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic('shell.result')
      .toSelf(body)
      .send();
  }
}
