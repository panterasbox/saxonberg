/**
 * ReloadController — hot-reload a template's backing class.
 *
 * Resolves a target path (positional or via `--mql <expr>`) and
 * dispatches to `HotReloadApi.reload` (default) or
 * `HotReloadApi.forceReload` (`-f`).
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
import { HotReloadApi } from '../../api/hot-reload';
import { SourceTreeApi } from '../../api/source-tree';
import { MqlApi } from '../../api/mql';
import { resolveSetting } from '../../lib/shell/Environment';

interface ReloadModel extends CommandModel {
  target?: string;
  mql?: string;
  force?: boolean;
}

export class ReloadController extends CommandController<ReloadModel> {
  async execute(model: ReloadModel, context: CommandContext): Promise<CommandResult> {
    const giver = context.commandGiver;
    let path: string | null = null;

    if (model.mql) {
      const r = MqlApi.resolveOne(model.mql, {
        commandGiver: giver,
        scope: 'reachable',
      });
      if (!r.stuff) return this.fail(context, `no match for --mql ${model.mql}`);
      path =
        (r.stuff as unknown as { templatePath?: string }).templatePath ??
        (r.stuff as unknown as { path?: string }).path ??
        null;
    } else if (model.target) {
      if (MixinApi.isWorkspace(giver)) {
        const home = resolveSetting<string>(giver, 'workspace.home') ?? '/';
        path = SourceTreeApi.joinLogical(
          giver.getCwd('content'),
          model.target,
          { home },
        );
      } else {
        path = model.target;
      }
    } else {
      return this.fail(context, 'reload needs a <target>');
    }
    if (!path) return this.fail(context, 'no target path');

    try {
      const fn = model.force ? HotReloadApi.forceReload : HotReloadApi.reload;
      await fn(path);
      this.tell(context, `\nreloaded ${path}\n`);
      return { success: true, summary: `reloaded ${path}` };
    } catch (err) {
      return this.fail(context, (err as Error).message);
    }
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(MessageApi.Topics.world.perception.look)
      .toSelf(Mml.fromMarkup(text))
      .send();
  }

  private fail(context: CommandContext, summary: string): CommandResult {
    this.tell(context, `\n${summary}\n`);
    return { success: false, summary };
  }
}
