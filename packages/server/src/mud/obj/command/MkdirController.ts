/**
 * MkdirController — create a content-tree folder template (default)
 * or a source-tree directory.
 *
 * Templates: creates a `ZoneTemplate` at the resolved path via
 * `TemplateApi.saveTemplate` with class `/lib/spatial/Zone`.
 * The folder/leaf invariant fires through the persistence chokepoint.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { MixinApi } from '../../api/mixin';
import { SourceTreeApi, SourceTreeSandboxError } from '../../api/source-tree';
import { TemplateApi } from '../../api/template';

interface MkdirModel extends CommandModel {
  path?: string;
  content?: boolean;
  source?: boolean;
}

export class MkdirController extends CommandController<MkdirModel> {
  async execute(model: MkdirModel, context: CommandContext): Promise<CommandResult> {
    const giver = context.commandGiver;
    if (!MixinApi.isWorkspace(giver)) {
      return { success: false, summary: 'this character has no workspace' };
    }
    if (!model.path) return this.fail(context, 'mkdir needs a <path>');
    const tree = giver.pickTree(model);
    const home = giver.getHome();
    const cwd = giver.getCwd(tree);

    if (tree === 'content') {
      const target = SourceTreeApi.joinLogical(cwd, model.path, { home });
      try {
        await TemplateApi.saveTemplate(target, '/lib/spatial/Zone', {});
      } catch (err) {
        return this.fail(context, (err as Error).message);
      }
      this.tell(context, `\ncreated folder ${target}\n`);
      return { success: true, summary: target };
    }

    let abs: string;
    try {
      abs = SourceTreeApi.resolvePath(cwd, model.path, { home });
    } catch (err) {
      if (err instanceof SourceTreeSandboxError) {
        return this.fail(context, err.message);
      }
      throw err;
    }
    await SourceTreeApi.mkdir(abs);
    this.tell(context, `\ncreated ${SourceTreeApi.toDisplayPath(abs)}\n`);
    return { success: true, summary: SourceTreeApi.toDisplayPath(abs) };
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(MessageApi.Topics.system.shell.fs)
      .toSelf(Mml.fromMarkup(text))
      .send();
  }

  private fail(context: CommandContext, summary: string): CommandResult {
    this.tell(context, `\n${summary}\n`);
    return { success: false, summary };
  }
}
