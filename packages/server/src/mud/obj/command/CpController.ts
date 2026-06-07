/**
 * CpController — copy `<src>` to `<dst>`.
 *
 * Templates: clone the source template's class/data/hydratorClass to
 * the dst path via `TemplateApi.saveTemplate`. Code: `SourceTreeApi.cp`
 * (recursive). Both endpoints in the same tree v1 — cross-tree copy
 * is a follow-up.
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
import { Template } from '../../lib/stuff/Template';

interface CpModel extends CommandModel {
  src?: string;
  dst?: string;
  content?: boolean;
  source?: boolean;
}

export class CpController extends CommandController<CpModel> {
  async execute(model: CpModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!MixinApi.isWorkspace(giver)) {
      this.tell(context, '\nthis character has no workspace\n');
      context.note({ kind: 'mixin-missing', mixin: 'WorkspaceMixin' });
      return;
    }
    if (!model.src || !model.dst) {
      return this.fail(context, 'cp needs <src> and <dst>');
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
      } catch (err) {
        return this.fail(context, (err as Error).message);
      }
      this.tell(context, `\ncopied ${src} → ${dst}\n`);
      return;
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
    await SourceTreeApi.cp(absSrc, absDst);
    this.tell(
      context,
      `\ncopied ${SourceTreeApi.toDisplayPath(absSrc)} → ${SourceTreeApi.toDisplayPath(absDst)}\n`,
    );
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
