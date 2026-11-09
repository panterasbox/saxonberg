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

/** The content-tree grep's match cap (the code tree's is `SourceTreeApi.search`'s). */
const TEMPLATE_MATCH_CAP = 200;

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
    // The pattern's safety and the walk's limits are the search's own
    // (`SourceTreeApi.search`, controller-liquidity D9 — C86).
    const compiled = SourceTreeApi.compilePattern(model.pattern, !!model.ignore);
    if (!compiled.ok) {
      return this.fail(context, `invalid pattern: ${compiled.detail}`, compiled.reason);
    }
    const tree = giver.pickTree(model);
    const home = giver.getHome();
    const cwd = giver.getCwd(tree);

    // Source reads are OPEN (wizard-axis D14): reading is not authoring,
    // and no title is needed to read the world's code. Hiding a spoiler in
    // code is the reveal model's job (wizard-axis-cleanup-slate W4).

    const lines: string[] = [];
    let truncated: string | null = null;
    if (tree === 'content') {
      const base = model.path
        ? SourceTreeApi.joinLogical(cwd, model.path, { home })
        : cwd;
      truncated = await this.grepTemplates(compiled.regex, base, !!model.recursive, lines);
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
      const found = await SourceTreeApi.search(abs, model.pattern, {
        recursive: !!model.recursive,
        ignoreCase: !!model.ignore,
      });
      if (!found.ok) {
        return this.fail(context, `invalid pattern: ${found.detail}`, found.reason);
      }
      for (const m of found.matches) {
        lines.push(`${SourceTreeApi.toDisplayPath(m.absolutePath)}:${m.line}: ${m.text}`);
      }
      truncated = found.truncated;
    }
    if (truncated) {
      lines.push(
        truncated === 'matches'
          ? '(stopped at the match limit — narrow the pattern or the path)'
          : truncated === 'bytes'
            ? '(stopped after reading the size limit — narrow the path)'
            : '(stopped at the time limit — narrow the path)',
      );
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
  ): Promise<'matches' | null> {
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
          if (lines.length >= TEMPLATE_MATCH_CAP) return 'matches';
          lines.push(`${tpl.path}:${i + 1}: ${ln}`);
        }
      }
    }
    return null;
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
