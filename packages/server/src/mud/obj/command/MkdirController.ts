/**
 * MkdirController — create a content-tree folder template (default)
 * or a source-tree directory.
 *
 * Templates: creates a `ZoneTemplate` at the resolved path via
 * `TemplateApi.saveTemplate` with class `/lib/zone/FolderZone`. The
 * folder/leaf invariant fires through the persistence chokepoint.
 * `FolderZone` is the generic Zone subclass for organizational tree
 * folders without spatial topology; sub-folders that need a
 * coordinate frame use `CartesianZone` / `SphericalZone` instead.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
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
  async execute(model: MkdirModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!MixinApi.isWorkspace(giver)) {
      this.tell(context, '\nthis character has no workspace\n');
      context.note({ kind: 'mixin-missing', mixin: 'WorkspaceMixin' });
      return;
    }
    if (!model.path) return this.fail(context, 'mkdir needs a <path>');
    const tree = giver.pickTree(model);
    const home = giver.getHome();
    const cwd = giver.getCwd(tree);

    if (tree === 'content') {
      const target = SourceTreeApi.joinLogical(cwd, model.path, { home });
      try {
        await TemplateApi.saveTemplate(target, '/lib/zone/FolderZone', {});
      } catch (err) {
        return this.fail(context, (err as Error).message);
      }
      this.tell(context, `\ncreated folder ${target}\n`);
      return;
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
    return;
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic('system.shell.fs')
      .toSelf(Mml.fromMarkup(text))
      .send();
  }

  private fail(
    context: CommandContext,
    detail: string,
    reason: string = 'unspecified',
  ): void {
    this.tell(context, `\n${detail}\n`);
    context.note({ kind: 'controller-rejected', reason, detail });
    return;
  }
}
