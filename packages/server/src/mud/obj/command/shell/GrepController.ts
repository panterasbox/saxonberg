/**
 * GrepController — search for `<pattern>` in the template (default)
 * or code tree.
 *
 * Templates: regex-match each leaf template's stringified `data`
 * payload, line-by-line. Code tree: walk the directory under the
 * resolved path and match each file's contents line-by-line.
 *
 * `-r` recurses; `-i` makes the pattern case-insensitive. Output:
 * `path:line: <matched line>`.
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
import { AccessApi } from '../../../api/access';
import { Template } from '../../../lib/stuff/Template';

interface GrepModel extends CommandModel {
  pattern?: string;
  path?: string;
  content?: boolean;
  source?: boolean;
  ignore?: boolean;
  recursive?: boolean;
}

export default class GrepController extends CommandController<GrepModel> {
  async execute(model: GrepModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!MixinApi.isWorkspace(giver)) {
      this.tell(context, '\nthis character has no workspace\n');
      context.note({ kind: 'mixin-missing', mixin: 'WorkspaceMixin' });
      return;
    }
    if (!model.pattern) {
      return this.fail(context, 'grep needs a <pattern>');
    }
    const flags = model.ignore ? 'i' : '';
    let regex: RegExp;
    try {
      regex = new RegExp(model.pattern, flags);
    } catch (err) {
      return this.fail(
        context,
        `invalid pattern: ${(err as Error).message}`,
      );
    }
    const tree = giver.pickTree(model);
    const home = giver.getHome();
    const cwd = giver.getCwd(tree);

    // Source/mirror mode: gate the read against the resolved slice.
    // Content-tree reads stay public. mirror collapses to content
    // via `pickTree`, so consult `getTreeMode()` to catch it.
    const treeMode = giver.getTreeMode();
    if (treeMode === 'source' || treeMode === 'mirror') {
      const baseLogical = model.path
        ? SourceTreeApi.joinLogical(cwd, model.path, { home })
        : cwd;
      const sliceResource =
        await AccessApi.resolveSourceFolderZone(baseLogical);
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
      const base = model.path
        ? SourceTreeApi.joinLogical(cwd, model.path, { home })
        : cwd;
      await this.grepTemplates(regex, base, !!model.recursive, lines);
    } else {
      let abs: string;
      try {
        abs = SourceTreeApi.resolvePath(cwd, model.path ?? '.', { home });
      } catch (err) {
        if (err instanceof SourceTreeSandboxError) {
          return this.fail(context, err.message);
        }
        throw err;
      }
      await this.grepCode(regex, abs, !!model.recursive, lines);
    }

    if (lines.length === 0) {
      this.tell(context, `\n(no matches)\n`);
      return;
    }
    this.tell(context, `\n${lines.join('\n')}\n`);
    return;
  }

  private async grepTemplates(
    regex: RegExp,
    basePath: string,
    recursive: boolean,
    lines: string[],
  ): Promise<void> {
    const all = await Template.findDescendants(basePath);
    const baseSegments = basePath === '/' ? 0 : basePath.split('/').length;
    for (const tpl of all) {
      const tplSegments = tpl.path.split('/').length;
      if (!recursive && tplSegments !== baseSegments + 1) continue;
      const text = this._stringifyData(tpl.data ?? {});
      const tplLines = text.split('\n');
      for (let i = 0; i < tplLines.length; i++) {
        const ln = tplLines[i]!;
        if (regex.test(ln)) {
          lines.push(`${tpl.path}:${i + 1}: ${ln}`);
        }
      }
    }
  }

  private async grepCode(
    regex: RegExp,
    absPath: string,
    recursive: boolean,
    lines: string[],
  ): Promise<void> {
    if (await SourceTreeApi.isFile(absPath)) {
      const content = await SourceTreeApi.read(absPath);
      const display = SourceTreeApi.toDisplayPath(absPath);
      const fileLines = content.split('\n');
      for (let i = 0; i < fileLines.length; i++) {
        const ln = fileLines[i]!;
        if (regex.test(ln)) {
          lines.push(`${display}:${i + 1}: ${ln}`);
        }
      }
      return;
    }
    if (!(await SourceTreeApi.isDir(absPath))) return;
    const entries = await SourceTreeApi.list(absPath);
    for (const ent of entries) {
      if (ent.isFile) {
        await this.grepCode(regex, ent.absolutePath, recursive, lines);
      } else if (ent.isDir && recursive) {
        await this.grepCode(regex, ent.absolutePath, true, lines);
      }
    }
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

  private _stringifyData(data: Record<string, unknown>): string {
    const lines: string[] = [];
    for (const [k, v] of Object.entries(data)) {
      lines.push(`${k}: ${this._formatValue(v)}`);
    }
    return lines.join('\n');
  }

  private _formatValue(v: unknown): string {
    if (v === null) return 'null';
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    return JSON.stringify(v);
  }
}
