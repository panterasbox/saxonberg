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
import { StuffApi } from '../../api/stuff';
import { TemplateApi } from '../../api/template';
import { AccessApi } from '../../api/access';
import { Template } from '../../lib/stuff/Template';
import { Zone } from '../../lib/zone/Zone';
import type { Stuff } from '../../lib/stuff/Stuff';

interface CpModel extends CommandModel {
  src?: string;
  dst?: string;
  content?: boolean;
  source?: boolean;
}

export default class CpController extends CommandController<CpModel> {
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
      // Source endpoint is a READ (slice walk only). Dest endpoint
      // is a WRITE (Zone-target detection routes to canMutateZone).
      const srcResource = StuffApi.findByTemplatePath<Stuff>(src) ?? null;
      if (!(await AccessApi.can(giver, 'read', srcResource))) {
        return this.fail(
          context,
          "you don't have permission to read the source",
          'access-denied',
        );
      }
      const dstResource = StuffApi.findByTemplatePath<Stuff>(dst) ?? null;
      const dstAllowed =
        dstResource instanceof Zone
          ? await AccessApi.canMutateZone(giver, dstResource)
          : await AccessApi.can(giver, 'write', dstResource);
      if (!dstAllowed) {
        return this.fail(
          context,
          "you don't have permission to write to the destination",
          'access-denied',
        );
      }
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

    // Source-tree cp. Source endpoint = read; dest endpoint = write
    // (developer + slice walk).
    const srcLogical = SourceTreeApi.joinLogical(cwd, model.src, { home });
    const dstLogical = SourceTreeApi.joinLogical(cwd, model.dst, { home });
    const srcSlice = await AccessApi.resolveSourceFolderZone(srcLogical);
    if (!(await AccessApi.can(giver, 'read', srcSlice))) {
      return this.fail(
        context,
        "you don't have permission to read that source",
        'access-denied',
      );
    }
    if (!(await AccessApi.isDeveloper(giver))) {
      return this.fail(
        context,
        "you don't have permission to write source",
        'access-denied',
      );
    }
    const dstSlice = await AccessApi.resolveSourceFolderZone(dstLogical);
    if (!(await AccessApi.can(giver, 'write', dstSlice))) {
      return this.fail(
        context,
        "you don't have permission to write to that source slice",
        'access-denied',
      );
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
