/**
 * CdController — change the avatar's working directory.
 *
 * Tree selection: `-c` / `--content` forces the content tree, `-s` /
 * `--source` forces the source tree; with neither flag the
 * `workspace.tree` setting decides (`content` / `source` / `mirror`).
 * In `mirror` mode the assignment fires through `setCwdAuto` so both
 * cwds advance together; explicit single-tree flags break the mirror
 * for that one call.
 *
 * `--mirror` (no path arg) is the legacy one-shot — copies the
 * active tree's cwd to the other.
 *
 * The path argument (or `--mql <expr>`) resolves to a navigable
 * container in the chosen tree:
 *   - content tree → an existing Zone template (folder).
 *   - source tree  → an existing directory inside the sandbox root.
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
import { ZoneApi } from '../../api/zone';
import { Template } from '../../lib/stuff/Template';
import type { MqlOneResult } from '../../api/mql';

interface CdModel extends CommandModel {
  path?: string;
  mql?: MqlOneResult;
  content?: boolean;
  source?: boolean;
  mirror?: boolean;
}

export class CdController extends CommandController<CdModel> {
  async execute(model: CdModel, context: CommandContext): Promise<CommandResult> {
    const giver = context.commandGiver;
    if (!MixinApi.isWorkspace(giver)) {
      return { success: false, summary: 'this character has no workspace' };
    }
    if (model.mirror) {
      giver.mirrorCwd();
      this.tell(
        context,
        `\nmirrored: source cwd is now ${giver.getCwd('source')}\n`,
      );
      return { success: true, summary: 'cwd mirrored' };
    }

    const tree = giver.pickTree(model);
    const home = giver.getHome();

    // Path-then-MQL alternation. The yaml does not enforce mutual
    // exclusivity, so the controller picks: --mql wins when set.
    // The matcher already resolved --mql via MQL → MqlOneResult;
    // we just unwrap and pick out the template path.
    let target: string | null = null;
    if (model.mql) {
      const stuff = model.mql.stuff;
      if (!stuff) {
        return this.fail(context, `no match for --mql ${model.mql.raw ?? ''}`);
      }
      const tp = (stuff as unknown as { templatePath?: string; path?: string })
        .templatePath ??
        (stuff as unknown as { path?: string }).path;
      if (!tp) {
        return this.fail(
          context,
          `--mql resolved to a runtime instance with no template path`,
        );
      }
      target = tp;
    } else if (model.path) {
      const cwd = giver.getCwd(tree);
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
      // bare `cd` → home in active tree
      target = home;
    }

    if (target === null) {
      return this.fail(context, 'no target');
    }

    if (tree === 'content') {
      // Validate: target must be a Zone template (folder), or root.
      if (target !== '/') {
        const tpl = await Template.findByPath(target);
        if (!tpl) {
          return this.fail(context, `no template at ${target}`);
        }
        if (!(await ZoneApi.isFolderClass(tpl.class))) {
          return this.fail(
            context,
            `${target} is a leaf template, not a folder`,
          );
        }
      }
    } else {
      const abs = SourceTreeApi.resolvePath(giver.getCwd('source'), target, {
        home,
      });
      if (!(await SourceTreeApi.isDir(abs))) {
        return this.fail(context, `${target} is not a directory`);
      }
    }

    // Honour mirror mode: when `workspace.tree === 'mirror'` and the
    // call didn't pin a specific tree via `-c` / `-s`, the cwd write
    // fans out to both trees. Single-tree flags use raw setCwd to
    // override.
    const explicitTree = model.content || model.source;
    if (explicitTree) {
      giver.setCwd(tree, target);
    } else {
      giver.setCwdAuto(tree, target);
    }

    this.tell(context, `\n${target}\n`);
    return { success: true, summary: target };
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
