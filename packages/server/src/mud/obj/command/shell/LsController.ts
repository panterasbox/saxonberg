/**
 * LsController — list children of `<path>` (or cwd) in the template
 * (default) or code tree.
 *
 * Glob expansion: `*` / `**` / `?` in the path are honored via
 * `PathPatternApi.matches`. A path with no wildcards returns the
 * direct children of that location. Long-form (`-l`) prints one
 * entry per line; recursive (`-R`) walks subtrees.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { MixinApi } from '../../../api/mixin';
import type { MqlOneResult } from '../../../api/mql';
import { PathPatternApi } from '../../../api/path-pattern';
import { SourceTreeApi, SourceTreeSandboxError } from '../../../api/source-tree';
import { AccessApi } from '../../../api/access';
import { Template } from '../../../lib/stuff/Template';

interface LsModel extends CommandModel {
  path?: string;
  mql?: MqlOneResult;
  content?: boolean;
  source?: boolean;
  long?: boolean;
  recursive?: boolean;
}

const GLOB_RE = /[*?]/;

export default class LsController extends CommandController<LsModel> {
  async execute(model: LsModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!MixinApi.isWorkspace(giver)) {
      this.tell(context, '\nthis character has no workspace\n');
      context.note({ kind: 'mixin-missing', mixin: 'WorkspaceMixin' });
      return;
    }
    const tree = giver.pickTree(model);
    const home = giver.getHome();
    const cwd = giver.getCwd(tree);

    // Resolve the path input. `--mql` (`type: object`, scope:
    // reachable) wins when set; otherwise the positional `<path>`
    // is the source of truth, defaulting to cwd.
    let pathInput = model.path ?? '.';
    if (model.mql) {
      const stuff = model.mql.stuff;
      if (!stuff) {
        return this.fail(context, `no match for --mql ${model.mql.raw ?? ''}`);
      }
      // Live clone → templatePath stamp; Template doc → .path
      // identity field. Two distinct lookups, hence the split.
      const tp = stuff instanceof Template ? stuff.path : stuff.getTemplatePath();
      if (!tp) {
        return this.fail(
          context,
          `--mql resolved to a runtime instance with no template path`,
        );
      }
      pathInput = tp;
    }

    let basePath: string;
    try {
      basePath =
        tree === 'content'
          ? SourceTreeApi.joinLogical(cwd, pathInput, { home })
          : SourceTreeApi.toDisplayPath(
              SourceTreeApi.resolvePath(cwd, pathInput, { home }),
            );
    } catch (err) {
      if (err instanceof SourceTreeSandboxError) {
        return this.fail(context, err.message);
      }
      throw err;
    }

    // Source / mirror mode: slice walk on the resolved zone.
    // Content-tree reads are public (no gate). `pickTree` returns
    // 'content' under mirror mode for reads (the read-side collapses
    // mirror to content), so the gate has to consult `getTreeMode()`
    // directly to catch the mirror case.
    const treeMode = giver.getTreeMode();
    if (treeMode === 'source' || treeMode === 'mirror') {
      const sliceResource = await AccessApi.resolveSourceFolderZone(basePath);
      if (!(await AccessApi.can(giver, 'read', sliceResource))) {
        return this.fail(
          context,
          "you don't have permission to read that source slice",
          'access-denied',
        );
      }
    }

    const lines: string[] = [];
    if (tree === 'content') {
      await this.listTemplateTree(basePath, !!model.recursive, lines);
    } else {
      await this.listCodeTree(
        SourceTreeApi.resolvePath(cwd, pathInput, { home }),
        !!model.recursive,
        lines,
        '',
      );
    }

    if (lines.length === 0) {
      this.tell(context, `\n(empty)\n`);
      return;
    }

    const body = model.long ? lines.join('\n') : lines.join('  ');
    this.tell(context, `\n${body}\n`);
    return;
  }

  private async listTemplateTree(
    basePath: string,
    recursive: boolean,
    lines: string[],
  ): Promise<void> {
    const hasGlob = GLOB_RE.test(basePath);
    if (hasGlob) {
      // Glob over all templates (descendants of the longest non-glob
      // prefix), filtered by PathPatternApi.matches. v1 keeps it
      // simple: walk all descendants of root and filter.
      const all = await Template.findDescendants('/');
      const matched = all
        .filter((t) => PathPatternApi.matches(t.path, basePath))
        .map((t) => t.path)
        .sort();
      lines.push(...matched);
      return;
    }
    const direct = await Template.findDescendants(basePath);
    const baseSegments = basePath === '/' ? 0 : basePath.split('/').length;
    for (const tpl of direct.sort((a, b) => a.path.localeCompare(b.path))) {
      const tplSegments = tpl.path.split('/').length;
      const isImmediate = tplSegments === baseSegments + 1;
      if (recursive || isImmediate) {
        lines.push(tpl.path);
      }
    }
  }

  private async listCodeTree(
    absPath: string,
    recursive: boolean,
    lines: string[],
    prefix: string,
  ): Promise<void> {
    if (await SourceTreeApi.isFile(absPath)) {
      lines.push(prefix + SourceTreeApi.toDisplayPath(absPath));
      return;
    }
    if (!(await SourceTreeApi.isDir(absPath))) return;
    const entries = (await SourceTreeApi.list(absPath)).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    for (const ent of entries) {
      const display = SourceTreeApi.toDisplayPath(ent.absolutePath);
      lines.push(prefix + display);
      if (recursive && ent.isDir) {
        await this.listCodeTree(ent.absolutePath, true, lines, prefix);
      }
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
