/**
 * MvController — rename `<src>` to `<dst>`.
 *
 * Templates: clone src to dst, then delete src. Folder/leaf
 * invariant fires through the persistence chokepoint as usual.
 * Code: `SourceTreeApi.mv` (single rename).
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
import { Template } from '../../lib/stuff/Template';

interface MvModel extends CommandModel {
  src?: string;
  dst?: string;
  mql?: string;
  content?: boolean;
  source?: boolean;
}

export class MvController extends CommandController<MvModel> {
  async execute(model: MvModel, context: CommandContext): Promise<CommandResult> {
    const giver = context.commandGiver;
    if (!MixinApi.isWorkspace(giver)) {
      return { success: false, summary: 'this character has no workspace' };
    }
    if (!model.src || !model.dst) {
      return this.fail(context, 'mv needs <src> and <dst>');
    }
    const tree = giver.pickTree(model);
    const home = giver.getHome();
    const cwd = giver.getCwd(tree);

    if (tree === 'content') {
      const src = SourceTreeApi.joinLogical(cwd, model.src, { home });
      const dst = SourceTreeApi.joinLogical(cwd, model.dst, { home });
      const tpl = await Template.findByPath(src);
      if (!tpl) return this.fail(context, `no template at ${src}`);
      try {
        await TemplateApi.saveTemplate(
          dst,
          tpl.class,
          tpl.data ?? {},
          tpl.hydratorClass,
        );
        await tpl.delete();
      } catch (err) {
        return this.fail(context, (err as Error).message);
      }
      this.tell(context, `\nmoved ${src} → ${dst}\n`);
      return { success: true, summary: `${src} → ${dst}` };
    }

    let absSrc: string, absDst: string;
    try {
      absSrc = SourceTreeApi.resolvePath(cwd, model.src, { home });
      absDst = SourceTreeApi.resolvePath(cwd, model.dst, { home });
    } catch (err) {
      if (err instanceof SourceTreeSandboxError) {
        return this.fail(context, err.message);
      }
      throw err;
    }
    await SourceTreeApi.mv(absSrc, absDst);
    this.tell(
      context,
      `\nmoved ${SourceTreeApi.toDisplayPath(absSrc)} → ${SourceTreeApi.toDisplayPath(absDst)}\n`,
    );
    return { success: true };
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
