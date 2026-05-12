/**
 * CatController — print contents of a template (default) or a code-
 * tree file.
 *
 * Templates: render the leaf template's `data` payload as YAML-ish
 * key/value lines plus a header line with `class` / `hydratorClass`.
 * (Folders/Zones produce a "is a folder" notice — use `ls` for those.)
 *
 * Code: read the file via `SourceTreeApi.read`. Output is paged at
 * `workspace.pageSize` lines (soft cap; 0 disables); the truncation
 * footer reports the residual count.
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
import { ZoneApi } from '../../api/zone';
import type { MqlOneResult } from '../../api/mql';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Workspace } from '../../lib/shell/Workspace';

interface CatModel extends CommandModel {
  path?: string;
  mql?: MqlOneResult;
  content?: boolean;
  source?: boolean;
}

export class CatController extends CommandController<CatModel> {
  async execute(model: CatModel, context: CommandContext): Promise<CommandResult> {
    const giver = context.commandGiver;
    if (!MixinApi.isWorkspace(giver)) {
      this.tell(context, '\nthis character has no workspace\n');
      context.note({ kind: 'mixin-missing', mixin: 'WorkspaceMixin' });
      return { success: false };
    }
    const tree = giver.pickTree(model);
    const home = giver.getHome();
    const pageSize =
      giver.getPageSize();

    let target: string | null = null;
    if (model.mql) {
      const stuff = model.mql.stuff;
      if (!stuff) {
        return this.fail(context, `no match for --mql ${model.mql.raw ?? ''}`);
      }
      target =
        stuff.getTemplatePath() ??
        (stuff as unknown as { path?: string }).path ??
        null;
    } else if (model.path) {
      try {
        target =
          tree === 'content'
            ? SourceTreeApi.joinLogical(giver.getCwd(tree), model.path, {
                home,
              })
            : SourceTreeApi.toDisplayPath(
                SourceTreeApi.resolvePath(
                  giver.getCwd(tree),
                  model.path,
                  { home },
                ),
              );
      } catch (err) {
        if (err instanceof SourceTreeSandboxError) {
          return this.fail(context, err.message);
        }
        throw err;
      }
    } else {
      return this.fail(context, 'cat needs a <path> or --mql');
    }

    if (!target) {
      return this.fail(context, 'no target');
    }

    if (tree === 'content') {
      return this.catTemplate(context, target);
    }
    return this.catCode(context, giver, target, pageSize);
  }

  private async catTemplate(
    context: CommandContext,
    path: string,
  ): Promise<CommandResult> {
    const tpl = await Template.findByPath(path);
    if (!tpl) return this.fail(context, `no template at ${path}`);
    const isFolder = await ZoneApi.isFolderClass(tpl.class);
    if (isFolder) {
      this.tell(
        context,
        `\n${path} is a folder (${tpl.class}); use \`ls ${path}\` to view children.\n`,
      );
      return { success: true, summary: 'folder' };
    }
    const lines = [
      `path:          ${tpl.path}`,
      `class:         ${tpl.class}`,
    ];
    if (tpl.hydratorClass) {
      lines.push(`hydratorClass: ${tpl.hydratorClass}`);
    }
    lines.push('data:');
    for (const [k, v] of Object.entries(tpl.data ?? {})) {
      lines.push(`  ${k}: ${this._formatValue(v)}`);
    }
    this.tell(context, `\n${lines.join('\n')}\n`);
    return { success: true, summary: tpl.path };
  }

  private async catCode(
    context: CommandContext,
    giver: Stuff & Workspace,
    displayPath: string,
    pageSize: number,
  ): Promise<CommandResult> {
    const abs = SourceTreeApi.resolvePath(
      giver.getCwd('source'),
      displayPath,
      { home: giver.getHome() },
    );
    if (!(await SourceTreeApi.isFile(abs))) {
      return this.fail(context, `${displayPath} is not a file`);
    }
    const content = await SourceTreeApi.read(abs);
    const allLines = content.split('\n');
    const cap = pageSize > 0 ? pageSize : allLines.length;
    const shown = allLines.slice(0, cap).join('\n');
    const remaining = allLines.length - cap;
    const footer =
      remaining > 0 ? `\n\n(truncated, ${remaining} more lines)` : '';
    this.tell(context, `\n${shown}${footer}\n`);
    return {
      success: true,
      summary:
        remaining > 0
          ? `${displayPath} (${cap}/${allLines.length} lines)`
          : displayPath,
    };
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
  ): CommandResult {
    this.tell(context, `\n${detail}\n`);
    context.note({ kind: 'controller-rejected', reason, detail });
    return { success: false, summary: detail };
  }

  private _formatValue(v: unknown): string {
    if (v === null) return 'null';
    if (typeof v === 'string') return JSON.stringify(v);
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    return JSON.stringify(v);
  }
}
