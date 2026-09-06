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

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { MixinApi } from '../../../../api/mixin';
import { HotReloadApi } from '../../../../api/hot-reload';
import { SourceTreeApi } from '../../../../api/source-tree';
import { StuffApi } from '../../../../api/stuff';
import { Template } from '../../../../lib/stuff/Template';
import type { MqlOneResult } from '../../../../api/mql';

interface ReloadModel extends CommandModel {
  target?: string;
  mql?: MqlOneResult;
}

/**
 * The backing file of a class-namespace path, or `null` when `target`
 * is not one (relative, or a root the resolver does not know). A
 * kernel path that names no file still returns its would-be `.ts`
 * (the resolver's HMR contract) — `reload` then reports the read error.
 */
function classFileOf(target: string): string | null {
  if (!target.startsWith('/')) return null;
  try {
    return StuffApi.resolveClassFile(target).file;
  } catch {
    return null;
  }
}

export default class ReloadController extends CommandController<ReloadModel> {
  async execute(model: ReloadModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    // Wizard axis check is now declarative — see reload.yaml's
    // `validators: requiresWizard`. The dispatcher rejects the
    // command before this controller runs when the giver isn't a
    // wizard. No slice check applies — module reloads aren't
    // scoped to a content area.

    let path: string | null = null;

    if (model.mql) {
      const stuff = model.mql.stuff;
      if (!stuff) {
        return this.fail(context, `no match for --mql ${model.mql.raw ?? ''}`);
      }
      // Live clone → templatePath stamp; Template doc → .path
      // identity field. Two distinct lookups, hence the split.
      path = stuff instanceof Template ? stuff.path : stuff.getTemplatePath();
    } else if (model.target) {
      // A class-namespace path (`/system/arcana/thing/Wand`, `/platform/thing/Thing`)
      // resolves through the one class→file resolver, so a capability
      // pack's class reloads exactly as a kernel one does; anything
      // else is the workspace-logical join it always was.
      path = classFileOf(model.target);
      if (!path) {
        if (MixinApi.isWorkspace(giver)) {
          path = SourceTreeApi.joinLogical(
            giver.getCwd('content'),
            model.target,
            { home: giver.getHome() },
          );
        } else {
          path = model.target;
        }
      }
    } else {
      return this.fail(context, 'reload needs a <target>');
    }
    if (!path) return this.fail(context, 'no target path');

    try {
      await HotReloadApi.reload(path);
      this.tell(context, `\nreloaded ${path}\n`);
      return;
    } catch (err) {
      return this.fail(context, (err as Error).message);
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
