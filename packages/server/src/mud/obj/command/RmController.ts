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

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../api/command';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { MixinApi } from '../../api/mixin';
import { SourceTreeApi, SourceTreeSandboxError } from '../../api/source-tree';
import { Template } from '../../lib/stuff/Template';
import type { MqlOneResult } from '../../api/mql';

interface RmModel extends CommandModel {
  path?: string;
  mql?: MqlOneResult;
  content?: boolean;
  source?: boolean;
  recursive?: boolean;
}

export class RmController extends CommandController<RmModel> {
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
      const tpl = await Template.findByPath(target);
      if (!tpl) return this.fail(context, `no template at ${target}`);
      // Recursive: delete descendants first.
      if (model.recursive) {
        const descendants = await Template.findDescendants(target);
        // Deepest first so leaves go before their folder ancestors.
        descendants.sort(
          (a, b) => b.path.split('/').length - a.path.split('/').length,
        );
        for (const d of descendants) {
          try {
            await d.delete();
          } catch (err) {
            return this.fail(context, (err as Error).message);
          }
        }
      }
      try {
        await tpl.delete();
      } catch (err) {
        return this.fail(context, (err as Error).message);
      }
      this.tell(context, `\nremoved ${target}\n`);
      return;
    }

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
      .topic(MessageApi.Topics.system.shell.fs)
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
