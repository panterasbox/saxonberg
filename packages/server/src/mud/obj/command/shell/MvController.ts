/**
 * MvController — rename `<src>` to `<dst>`.
 *
 * Templates: clone src to dst, then delete src. Folder/leaf
 * invariant fires through the persistence chokepoint as usual.
 * Code: `SourceTreeApi.mv` (single rename).
 */

import { CommandController } from '../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { MixinApi } from '../../../api/mixin';
import { SourceTreeApi, SourceTreeSandboxError } from '../../../api/source-tree';
import { StuffApi } from '../../../api/stuff';
import { TemplateApi } from '../../../api/template';
import { AccessApi } from '../../../api/access';
import { Template } from '../../../lib/stuff/Template';
import { Zone } from '../../../lib/zone/Zone';
import type { Stuff } from '../../../lib/stuff/Stuff';

interface MvModel extends CommandModel {
  src?: string;
  dst?: string;
  content?: boolean;
  source?: boolean;
}

export default class MvController extends CommandController<MvModel> {
  async execute(model: MvModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!MixinApi.isWorkspace(giver)) {
      this.tell(context, '\nthis character has no workspace\n');
      context.note({ kind: 'mixin-missing', mixin: 'WorkspaceMixin' });
      return;
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
      // mv REMOVES source after write — so both endpoints are WRITE
      // ops in terms of authority. Zone-target detection on both.
      const srcResource = StuffApi.findByTemplatePath<Stuff>(src) ?? null;
      const dstResource = StuffApi.findByTemplatePath<Stuff>(dst) ?? null;
      const srcAllowed =
        srcResource instanceof Zone
          ? await AccessApi.canMutateZone(giver, srcResource)
          : await AccessApi.can(giver, 'rm', srcResource);
      if (!srcAllowed) {
        return this.fail(
          context,
          "you don't have permission to move from there",
          'access-denied',
        );
      }
      const dstAllowed =
        dstResource instanceof Zone
          ? await AccessApi.canMutateZone(giver, dstResource)
          : await AccessApi.can(giver, 'write', dstResource);
      if (!dstAllowed) {
        return this.fail(
          context,
          "you don't have permission to move there",
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
        await tpl.delete();
      } catch (err) {
        return this.fail(context, (err as Error).message);
      }
      this.tell(context, `\nmoved ${src} → ${dst}\n`);
      return;
    }

    // Source-tree mv. Both endpoints are WRITE — `mv` REMOVES source
    // after write — so src-side slice walk must also be a write check
    // (wizard + slice walk on src and dst).
    if (!(await AccessApi.isWizard(giver))) {
      return this.fail(
        context,
        "you don't have permission to write source",
        'access-denied',
      );
    }
    const srcLogical = SourceTreeApi.joinLogical(cwd, model.src, { home });
    const dstLogical = SourceTreeApi.joinLogical(cwd, model.dst, { home });
    const srcSlice = await AccessApi.resolveSourceFolderZone(srcLogical);
    if (!(await AccessApi.can(giver, 'rm', srcSlice))) {
      return this.fail(
        context,
        "you don't have permission to move from that source slice",
        'access-denied',
      );
    }
    const dstSlice = await AccessApi.resolveSourceFolderZone(dstLogical);
    if (!(await AccessApi.can(giver, 'write', dstSlice))) {
      return this.fail(
        context,
        "you don't have permission to move to that source slice",
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
    await SourceTreeApi.mv(absSrc, absDst);
    this.tell(
      context,
      `\nmoved ${SourceTreeApi.toDisplayPath(absSrc)} → ${SourceTreeApi.toDisplayPath(absDst)}\n`,
    );
    return;
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic('shell.result')
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
