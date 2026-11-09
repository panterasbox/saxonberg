/**
 * RmController — remove a content-tree template (default) or
 * source-tree file.
 *
 * Templates: validateFolderLeafDelete fires unconditionally (it's a
 * correctness invariant, not a policy), then `Template.delete()`.
 * `-r` recurses (delete descendants first, then parent).
 *
 * No `-f` v1 — folder/leaf is a hard invariant, not a bypassable
 * policy. If a per-template veto pattern emerges later, `-f` lands
 * via the parallel-API force-bypass shape.
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
import { Template } from '../../../../lib/stuff/Template';
import { TemplateApi } from '../../../../api/template';
import { AccessApi } from '../../../../api/access';
import type { MqlOneResult } from '../../../../api/mql';

interface RmModel extends CommandModel {
  path?: string;
  mql?: MqlOneResult;
  content?: boolean;
  source?: boolean;
  recursive?: boolean;
}

export default class RmController extends CommandController<RmModel> {
  async execute(model: RmModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!MixinApi.isWorkspace(giver)) {
      this.tell(context, '\nthis character has no workspace\n');
      context.note({ kind: 'mixin-missing', mixin: 'WorkspaceMixin' });
      return;
    }
    const tree = giver.pickTree(model);
    const home = giver.getHome();
    const cwd = giver.getCwd(tree);

    let target: string | null = null;
    if (model.mql) {
      const stuff = model.mql.stuff;
      if (!stuff) {
        return this.fail(context, `no match for --mql ${model.mql.raw ?? ''}`);
      }
      // Live clone → templatePath stamp; Template doc → .path
      // identity field. Two distinct lookups, hence the split.
      target = stuff instanceof Template ? stuff.path : stuff.getTemplatePath();
    } else if (model.path) {
      try {
        target =
          tree === 'content'
            ? SourceTreeApi.joinLogical(cwd, model.path, { home })
            : SourceTreeApi.toDisplayPath(
                SourceTreeApi.resolvePath(cwd, model.path, { home }),
              );
      } catch (err) {
        if (err instanceof SourceTreeSandboxError) {
          return this.fail(context, err.message);
        }
        throw err;
      }
    } else {
      return this.fail(context, 'rm needs a <path> or --mql');
    }
    if (!target) return this.fail(context, 'no target');

    if (tree === 'content') {
      // Title over EVERY row it removes, and every refusal before the
      // first delete, are the delete's own (`TemplateApi.deleteSubtree`,
      // D9 — C65: `-r` asked the root's title only; C62).
      let removed;
      try {
        removed = await TemplateApi.deleteSubtree(target, model.recursive === true);
      } catch (err) {
        return this.fail(context, (err as Error).message);
      }
      if (!removed.ok) {
        switch (removed.reason) {
          case 'access-denied':
            return this.fail(
              context,
              removed.path === target
                ? "you don't have permission to remove that"
                : `you don't have permission to remove ${removed.path}`,
              'access-denied',
            );
          case 'no-template':
            return this.fail(context, `no template at ${target}`);
          case 'has-descendants':
            return this.fail(
              context,
              `${target} still holds rows — remove them first, or rm -r`,
              'has-descendants',
            );
          default:
            return this.fail(
              context,
              `${removed.path} is extended by rows outside it — re-parent them first`,
              'extended',
            );
        }
      }
      this.tell(context, `\nremoved ${target}\n`);
      return;
    }

    // Source-tree: the one write predicate (a code file asks for the
    // wizard axis and title; anything else, title).
    const refusal = await AccessApi.sourceWriteRefusal(giver, target, 'rm');
    if (refusal) return this.fail(context, refusal, 'access-denied');

    // `target` is already a display path (`/server/...`) for both
    // input shapes — re-resolve it back to an absolute OS path
    // through the sandbox.
    let abs: string;
    try {
      abs = SourceTreeApi.resolvePath(cwd, target, { home });
    } catch (err) {
      if (err instanceof SourceTreeSandboxError) {
        return this.fail(context, err.message);
      }
      throw err;
    }
    await SourceTreeApi.rm(abs, { recursive: !!model.recursive });
    this.tell(context, `\nremoved ${SourceTreeApi.toDisplayPath(abs)}\n`);
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
