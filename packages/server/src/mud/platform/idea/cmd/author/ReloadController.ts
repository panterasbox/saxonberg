/**
 * ReloadController — hot-reload a template's backing class, then
 * type-check it.
 *
 * Resolves a target path (positional or via `--mql <expr>`) and
 * dispatches to `HotReloadApi.reload`. tsx strips types and never checks
 * them, so a reload alone can succeed on code that no longer type-checks;
 * by default the reloaded file is then checked out of process
 * (`DiagnosticApi.typecheck`) and the verdict told to the giver when it
 * lands. `--no-check` skips that; `--strict` checks FIRST and refuses to
 * swap code with type errors in. No `-f` / `forceReload`
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
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { DiagnosticApi } from '../../../../api/diagnostics';
import { ScheduleApi } from '../../../../api/schedule';
import type { MqlOneResult } from '../../../../api/mql';
import type { TypecheckResult } from '@saxonberg/types';

export interface ReloadModel extends CommandModel {
  target?: string;
  mql?: MqlOneResult;
  noCheck?: boolean;
  strict?: boolean;
}

/** How many diagnostics a verdict lists inline before pointing at `errors`. */
const INLINE_DIAGNOSTICS = 5;

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

/** One check's verdict as the giver reads it. */
function verdictOf(result: TypecheckResult): string {
  if (result.errors === 0 && result.warnings === 0) {
    return `type-check: ${result.file} is clean`;
  }
  const counts = [
    result.errors > 0 ? `${result.errors} error(s)` : '',
    result.warnings > 0 ? `${result.warnings} warning(s)` : '',
  ].filter(Boolean).join(', ');
  const lines = result.diagnostics.slice(0, INLINE_DIAGNOSTICS).map(
    (d) =>
      `  ${d.line ?? '?'}:${d.col ?? '?'} ${d.code ? `TS${d.code} ` : ''}${d.message.split('\n')[0]}`,
  );
  const more =
    result.diagnostics.length > INLINE_DIAGNOSTICS
      ? `\n  … ${result.diagnostics.length - INLINE_DIAGNOSTICS} more — \`errors --source compile\``
      : '';
  return `type-check: ${result.file} has ${counts}\n${lines.join('\n')}${more}`;
}

/** Tell `giver` a reload result line (plain text, never markup). */
function tellGiver(giver: Stuff, text: string): void {
  MessageApi.scene(giver)
    .topic('shell.result')
    .toSelf(Mml.text(text))
    .send();
}

export default class ReloadController extends CommandController<ReloadModel> {
  async execute(model: ReloadModel, context: CommandContext): Promise<void> {
    // Wizard axis check is declarative — see reload.yaml's
    // `validators: requiresWizard`. No slice check applies — module
    // reloads aren't scoped to a content area.
    const path = this.resolveTarget(model, context);
    if (path === null) return;

    if (model.strict) {
      const checked = await this.check(context, path);
      if (checked === null) return;
      if (checked.errors > 0) {
        return this.fail(
          context,
          `${this.verdict(checked)}\nnot reloaded (--strict)`,
          'type-errors',
        );
      }
    }

    try {
      await HotReloadApi.reload(path);
    } catch (err) {
      return this.fail(context, (err as Error).message);
    }
    this.tell(context, `\nreloaded ${path}\n`);

    // --strict already checked this exact source; --no-check opts out.
    if (model.strict || model.noCheck) return;
    const file = ReloadController.fileOf(path);
    if (file === null) return;
    // The verdict lands after this command has answered: it is told from
    // a fresh root (the scheduler's), not the finished command's context.
    // ⚠ This controller instance is destroyed when the command returns,
    // so nothing below may touch `this`.
    const giver = context.commandGiver;
    const later = (text: string): void => {
      ScheduleApi.schedule(0, () => tellGiver(giver, `\n${text}\n`), {
        propagateAttribution: false,
      });
    };
    void DiagnosticApi.typecheck(file, { live: false }).then(
      (result) => later(verdictOf(result)),
      (err: Error) => later(`type-check not run: ${err.message}`),
    );
  }

  /**
   * The target as a reloadable path, or `null` after telling the giver
   * why there is none. Shared with `typecheck`, which names its target
   * the same way.
   */
  protected resolveTarget(
    model: ReloadModel,
    context: CommandContext,
  ): string | null {
    const giver = context.commandGiver;
    let path: string | null = null;

    if (model.mql) {
      const stuff = model.mql.stuff;
      if (!stuff) {
        this.fail(context, `no match for --mql ${model.mql.raw ?? ''}`);
        return null;
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
      this.fail(context, `${this.verb()} needs a <target>`);
      return null;
    }
    if (!path) {
      this.fail(context, 'no target path');
      return null;
    }
    return path;
  }

  /** The verb name for messages (`typecheck` overrides it). */
  protected verb(): string {
    return 'reload';
  }

  /**
   * The source file behind a reload path — the path itself when it is a
   * `.ts` file, else its class file — or `null` when it names none.
   */
  protected static fileOf(path: string): string | null {
    if (path.endsWith('.ts')) return path;
    const file = classFileOf(path);
    return file?.endsWith('.ts') ? file : null;
  }

  /**
   * Type-check `path` and wait for the verdict, or tell the giver why it
   * could not run and return `null`.
   */
  protected async check(
    context: CommandContext,
    path: string,
  ): Promise<TypecheckResult | null> {
    const file = ReloadController.fileOf(path);
    if (file === null) {
      this.fail(context, `nothing to type-check: ${path} is not a source file`);
      return null;
    }
    try {
      return await DiagnosticApi.typecheck(file, { live: false });
    } catch (err) {
      this.fail(context, `type-check not run: ${(err as Error).message}`);
      return null;
    }
  }

  /** One check's verdict as the giver reads it. */
  protected verdict(result: TypecheckResult): string {
    return verdictOf(result);
  }

  protected tell(context: CommandContext, text: string): void {
    tellGiver(context.commandGiver, text);
  }

  protected fail(
    context: CommandContext,
    detail: string,
    reason: string = 'unspecified',
  ): void {
    this.tell(context, `\n${detail}\n`);
    context.note({ kind: 'controller-rejected', reason, detail });
    return;
  }
}
