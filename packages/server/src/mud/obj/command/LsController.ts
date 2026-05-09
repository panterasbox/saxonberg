/**
 * LsController — list children of `<path>` (or cwd) in the template
 * (default) or code tree.
 *
 * Glob expansion: `*` / `**` / `?` in the path are honored via
 * `PathPatternApi.matches`. A path with no wildcards returns the
 * direct children of that location. Long-form (`-l`) prints one
 * entry per line; recursive (`-R`) walks subtrees.
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
import { Template } from '../../lib/stuff/Template';

interface LsModel extends CommandModel {
  path?: string;
  mql?: string;
  content?: boolean;
  source?: boolean;
  long?: boolean;
  recursive?: boolean;
}

const GLOB_RE = /[*?]/;

export class LsController extends CommandController<LsModel> {
  async execute(model: LsModel, context: CommandContext): Promise<CommandResult> {
    const giver = context.commandGiver;
    if (!MixinApi.isWorkspace(giver)) {
      return { success: false, summary: 'this character has no workspace' };
    }
    const tree = giver.pickTree(model);
    const home = giver.getHome();
    const cwd = giver.getCwd(tree);

    let basePath: string;
    try {
      basePath =
        tree === 'content'
          ? SourceTreeApi.joinLogical(cwd, model.path ?? '.', { home })
          : SourceTreeApi.toDisplayPath(
              SourceTreeApi.resolvePath(cwd, model.path ?? '.', { home }),
            );
    } catch (err) {
      if (err instanceof SourceTreeSandboxError) {
        return this.fail(context, err.message);
      }
      throw err;
    }

    const lines: string[] = [];
    if (tree === 'content') {
      await this.listTemplateTree(basePath, !!model.recursive, lines);
    } else {
      await this.listCodeTree(
        SourceTreeApi.resolvePath(cwd, model.path ?? '.', { home }),
        !!model.recursive,
        lines,
        '',
      );
    }

    if (lines.length === 0) {
      this.tell(context, `\n(empty)\n`);
      return { success: true, summary: 'empty' };
    }

    const body = model.long ? lines.join('\n') : lines.join('  ');
    this.tell(context, `\n${body}\n`);
    return { success: true, summary: `${lines.length} entries` };
  }

  private async listTemplateTree(
    basePath: string,
    recursive: boolean,
    lines: string[],
  ): Promise<void> {
    const hasGlob = GLOB_RE.test(basePath);
    if (hasGlob) {
      // Glob over all templates (descendants of the longest non-glob
      // prefix), filtered by PathPatternApi-style match. v1 keeps it
      // simple: walk all descendants of root and filter.
      const all = await Template.findDescendants('/');
      const matched = all
        .filter((t) => simpleGlobMatch(t.path, basePath))
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
      .topic(MessageApi.Topics.system.shell.fs)
      .toSelf(Mml.fromMarkup(text))
      .send();
  }

  private fail(context: CommandContext, summary: string): CommandResult {
    this.tell(context, `\n${summary}\n`);
    return { success: false, summary };
  }
}

/**
 * Cheap inline glob match — `*` matches non-slash, `**` matches any
 * run, `?` matches one non-slash. Mirrors PathPatternApi but lives
 * here as a one-shot helper to avoid round-tripping through that
 * Api's regex cache for an interactive command.
 */
function simpleGlobMatch(path: string, pattern: string): boolean {
  let body = '';
  let i = 0;
  while (i < pattern.length) {
    if (pattern.startsWith('**', i)) {
      body += '.*';
      i += 2;
    } else if (pattern[i] === '*') {
      body += '[^/]*';
      i += 1;
    } else if (pattern[i] === '?') {
      body += '[^/]';
      i += 1;
    } else {
      const ch = pattern[i]!;
      body += /[A-Za-z0-9/_-]/.test(ch) ? ch : '\\' + ch;
      i += 1;
    }
  }
  return new RegExp('^' + body + '$').test(path);
}
