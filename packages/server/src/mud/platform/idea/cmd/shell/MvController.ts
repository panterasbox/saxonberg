/**
 * MvController — rename `<src>` to `<dst>`.
 *
 * Templates: clone src to dst, then delete src. Folder/leaf
 * invariant fires through the persistence chokepoint as usual.
 * Code: `SourceTreeApi.mv` (single rename).
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { MixinApi } from '../../../../api/mixin';
import { SourceTreeApi, SourceTreeSandboxError } from '../../../../api/source-tree';
import { TemplateApi } from '../../../../api/template';
import { AccessApi } from '../../../../api/access';

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
      // mv REMOVES the source after writing the destination: title over
      // both ends and every refusal before the first write are the move's
      // own (`TemplateApi.move`, D9/D10 — C62, C66).
      let moved;
      try {
        moved = await TemplateApi.move(src, dst);
      } catch (err) {
        return this.fail(context, (err as Error).message);
      }
      if (!moved.ok) return this.fail(context, ...this.refusalOf(moved, src));
      this.tell(context, `\nmoved ${src} → ${dst}\n`);
      return;
    }

    // Source-tree mv. Both endpoints are mutations — `mv` REMOVES the
    // source after writing the destination — so each asks the one write
    // predicate (a code file: the wizard axis and title; else title).
    const srcLogical = SourceTreeApi.joinLogical(cwd, model.src, { home });
    const dstLogical = SourceTreeApi.joinLogical(cwd, model.dst, { home });
    const refusal =
      (await AccessApi.sourceWriteRefusal(giver, srcLogical, 'rm')) ??
      (await AccessApi.sourceWriteRefusal(giver, dstLogical, 'write'));
    if (refusal) return this.fail(context, refusal, 'access-denied');

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

  /** Word a move's refusal: the detail and the envelope reason. */
  private refusalOf(
    r: { reason: string; path: string },
    src: string,
  ): [string, string] {
    switch (r.reason) {
      case 'access-denied':
        return [
          r.path === src
            ? "you don't have permission to move from there"
            : "you don't have permission to move there",
          'access-denied',
        ];
      case 'no-template':
        return [`no template at ${r.path}`, 'no-template'];
      case 'has-descendants':
        return [`${r.path} still holds rows — move them first`, 'has-descendants'];
      default:
        return [`${r.path} is extended by other rows — re-parent them first`, 'extended'];
    }
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
