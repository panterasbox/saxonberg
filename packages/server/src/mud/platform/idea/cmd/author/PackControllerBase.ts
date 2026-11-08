/**
 * PackControllerBase — what every `pack` subcommand shares
 * (controllers-are-io W7, D9: one controller per subcommand over a base per
 * noun). `pack` is the content-pack installer's operator surface
 * (`status` / `install --dry-run` / `sync` / `provision` / `diff` /
 * `resolve` / `pin` / `unpin`); every result is rendered as plain escaped
 * text through `tell` (the diagnostics-build lesson: no nested MML lists).
 * The reconcile logic lives behind {@link PackApi}; the controllers are
 * the thin diegetic wrappers that also enforce two rules the Api does not
 * speak:
 *
 *  - `install` without `--dry-run` is rejected — boot installs; a live
 *    apply is `sync`'s job, and staging is a non-goal this cycle.
 *  - `resolve` takes exactly one mode, and `--keep` without `--pin` does
 *    not exist — keeping means claiming.
 *
 * Authorization is declarative: `pack.yaml` carries
 * `requiresPackInstaller` (holding `/compact/executive` — the PM and her
 * staff; never the wizard axis). The dispatcher rejects before here.
 * Bare `pack` names no subcommand and has no verb-level controller, so the
 * framework answers it (`missing-subcommand`).
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { PackApi } from '../../../../api/pack';
import type { PackReconcileResult } from '../../../../api/pack';

export interface PackModel extends CommandModel {
  subcommand?: string;
  packId?: string;
  path?: string;
  dryRun?: boolean;
  takePack?: boolean;
  keep?: boolean;
  pin?: boolean;
  export?: boolean;
}

const USAGE =
  'usage: pack status [<packId>] | pack install <packId> --dry-run | ' +
  'pack sync [<packId>] | pack provision <packId> | pack diff <packId> [<path>] | ' +
  'pack resolve <packId> <path> --take-pack|--keep --pin|--export | ' +
  'pack pin <packId> <path> | pack unpin <packId> <path>';

export abstract class PackControllerBase extends CommandController<PackModel> {
  /** Refuse with the verb's usage line. */
  protected failUsage(context: CommandContext, reason: string): void {
    this.fail(context, USAGE, reason);
  }

  protected async setPinned(model: PackModel, context: CommandContext, pin: boolean): Promise<void> {
    const packId = model.packId?.trim();
    const path = model.path?.trim();
    if (!packId || !path) return this.failUsage(context, 'path-required');
    try {
      const pins = pin ? await PackApi.pin(packId, path) : await PackApi.unpin(packId, path);
      this.tell(
        context,
        `${pin ? 'pinned' : 'unpinned'} ${path} in pack '${packId}'; ` +
          `${pins.length} row(s) pinned${pin ? '' : ' — the next reconcile compares it again'}`,
      );
    } catch (err) {
      return this.fail(context, (err as Error).message, pin ? 'pin-failed' : 'unpin-failed');
    }
  }

  protected formatResult(verb: string, r: PackReconcileResult): string {
    return (
      `${verb} pack '${r.packId}': ` +
      `${r.inserted.length} inserted, ${r.updated.length} updated, ` +
      `${r.deleted.length} deleted, ` +
      `${r.kept.length} kept, ${r.merged.length} merged, ${r.archived.length} archived, ` +
      `${r.conflicts.length} conflict(s), ` +
      `${r.pinnedSkipped} row(s) pinned (skipped), ` +
      `${r.quantityTables} quantity table(s)` +
      Object.entries(r.documents)
        .map(([k, n]) => `, ${n} ${k} document(s)`)
        .join('') +
      ', ' +
      `${r.reapplied} live instance(s) re-applied` +
      (r.conflicts.length > 0
        ? '\n' +
          r.conflicts
            .map((c) => `  conflict ${c} — next: pack diff ${r.packId} ${c}`)
            .join('\n')
        : '')
    );
  }

  protected tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic('shell.result')
      .toSelf(Mml.escape(`\n${text}\n`))
      .send();
  }

  protected fail(context: CommandContext, detail: string, reason: string): void {
    this.tell(context, detail);
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}
