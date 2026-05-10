/**
 * ReloadController — hot-reload a template's backing class.
 *
 * Resolves a target path (positional or via `--mql <expr>`) and
 * dispatches to `HotReloadApi.reload`. No `-f` / `forceReload`
 * — reload operates on modules and prototypes, not on Stuff
 * targets, so there's no per-target witness to bypass. Permission
 * gating is the right shape for "are you allowed to reload this
 * path?" and lives in the future permission framework.
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
import type { MqlOneResult } from '../../api/mql';

interface ReloadModel extends CommandModel {
  target?: string;
  mql?: MqlOneResult;
}

export class ReloadController extends CommandController<ReloadModel> {
  async execute(model: ReloadModel, context: CommandContext): Promise<CommandResult> {
    const giver = context.commandGiver;
    let path: string | null = null;

    if (model.mql) {
      const stuff = model.mql.stuff;
      if (!stuff) {
        return this.fail(context, `no match for --mql ${model.mql.raw ?? ''}`);
      }
      path =
        (stuff as unknown as { templatePath?: string }).templatePath ??
        (stuff as unknown as { path?: string }).path ??
        null;
    } else if (model.target) {
      if (MixinApi.isWorkspace(giver)) {
        path = SourceTreeApi.joinLogical(
          giver.getCwd('content'),
          model.target,
          { home: giver.getHome() },
        );
      } else {
        path = model.target;
      }
    } else {
      return this.fail(context, 'reload needs a <target>');
    }
    if (!path) return this.fail(context, 'no target path');

    try {
      await HotReloadApi.reload(path);
      this.tell(context, `\nreloaded ${path}\n`);
      return { success: true, summary: `reloaded ${path}` };
    } catch (err) {
      return this.fail(context, (err as Error).message);
    }
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(MessageApi.Topics.system.shell.author)
      .toSelf(Mml.fromMarkup(text))
      .send();
  }

  private fail(context: CommandContext, summary: string): CommandResult {
    this.tell(context, `\n${summary}\n`);
    return { success: false, summary };
  }
}
