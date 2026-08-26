/**
 * PackController — the `pack` verb: the content-pack installer's operator
 * surface (`status` / `install --dry-run` / `sync` / `diff` / `resolve` /
 * `pin` / `unpin`).
 *
 * Dispatch-on-subcommand (the `ErrorsController` shape), one `executeX`
 * per subcommand, every result rendered as plain escaped text through
 * `tell` (the diagnostics-build lesson: no nested MML lists). The
 * reconcile logic lives behind {@link PackApi}; this controller is the
 * thin diegetic wrapper that also enforces two rules the Api does not
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
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { CommandApi } from '../../../api/command';
import { PackApi } from '../../../api/pack';
import type {
  PackDiffReport,
  PackDryRunReport,
  PackReconcileResult,
  PackResolveMode,
  PackStatusReport,
  PackProvisionReport,
} from '../../../api/pack';

interface PackModel extends CommandModel {
  subcommand?: string;
  packId?: string;
  path?: string;
  dryRun?: boolean;
  takePack?: boolean;
  keep?: boolean;
  pin?: boolean;
  export?: boolean;
}

const DEFAULT_PACK = 'base-library';

const USAGE =
  'usage: pack status [<packId>] | pack install <packId> --dry-run | ' +
  'pack sync [<packId>] | pack provision <packId> | pack diff <packId> [<path>] | ' +
  'pack resolve <packId> <path> --take-pack|--keep --pin|--export | ' +
  'pack pin <packId> <path> | pack unpin <packId> <path>';

export default class PackController extends CommandController<PackModel> {
  async execute(model: PackModel, context: CommandContext): Promise<void> {
    switch (model.subcommand) {
      case 'status':
        return this.executeStatus(model, context);
      case 'install':
        return this.executeInstall(model, context);
      case 'sync':
        return this.executeSync(model, context);
      case 'provision':
        return this.executeProvision(model, context);
      case 'diff':
        return this.executeDiff(model, context);
      case 'resolve':
        return this.executeResolve(model, context);
      case 'pin':
        return this.executePin(model, context, true);
      case 'unpin':
        return this.executePin(model, context, false);
      default:
        return this.fail(context, USAGE, 'unknown-subcommand');
    }
  }

  private async executeStatus(model: PackModel, context: CommandContext): Promise<void> {
    try {
      const reports = await PackApi.status(model.packId?.trim() || undefined);
      if (reports.length === 0) {
        return this.tell(context, model.packId ? `no pack '${model.packId}'` : 'no packs');
      }
      const lines = reports.map((r) => this.formatStatus(r));
      // The command-view migration residue: views the dispatcher still
      // serves from DISK because no pack shipped them yet.
      const fromDisk = CommandApi.diskFallbacks();
      if (fromDisk.length > 0) {
        lines.push(
          `${fromDisk.length} command view(s) still served from disk: ${fromDisk.join(', ')}`,
        );
      }
      this.tell(context, lines.join('\n\n'));
    } catch (err) {
      return this.fail(context, (err as Error).message, 'status-failed');
    }
  }

  private async executeInstall(model: PackModel, context: CommandContext): Promise<void> {
    if (!model.dryRun) {
      return this.fail(
        context,
        'boot installs; use `pack install <packId> --dry-run` to preview, ' +
          '`pack sync <packId>` to apply live',
        'install-is-boot',
      );
    }
    const packId = model.packId?.trim();
    if (!packId) return this.fail(context, USAGE, 'pack-required');
    try {
      const plan = await PackApi.dryRun(packId);
      this.tell(context, this.formatDryRun(plan));
    } catch (err) {
      return this.fail(context, (err as Error).message, 'dry-run-failed');
    }
  }

  private async executeSync(model: PackModel, context: CommandContext): Promise<void> {
    const packId = model.packId?.trim() || DEFAULT_PACK;
    try {
      const result = await PackApi.sync(packId);
      this.tell(context, this.formatResult('synced', result));
    } catch (err) {
      return this.fail(context, (err as Error).message, 'sync-failed');
    }
  }

  private async executeProvision(model: PackModel, context: CommandContext): Promise<void> {
    const packId = model.packId?.trim();
    if (!packId) return this.fail(context, USAGE, 'pack-required');
    try {
      const report = await PackApi.provision(packId);
      this.tell(context, this.formatProvision(report));
    } catch (err) {
      return this.fail(context, (err as Error).message, 'provision-failed');
    }
  }

  private async executeDiff(model: PackModel, context: CommandContext): Promise<void> {
    const packId = model.packId?.trim();
    if (!packId) return this.fail(context, USAGE, 'pack-required');
    try {
      const report = await PackApi.diff(packId, model.path?.trim() || undefined);
      this.tell(context, this.formatDiff(report));
    } catch (err) {
      return this.fail(context, (err as Error).message, 'diff-failed');
    }
  }

  private async executeResolve(model: PackModel, context: CommandContext): Promise<void> {
    const packId = model.packId?.trim();
    const path = model.path?.trim();
    if (!packId || !path) return this.fail(context, USAGE, 'path-required');

    const modes: PackResolveMode[] = [];
    if (model.takePack) modes.push('take-pack');
    if (model.export) modes.push('export');
    if (model.keep && model.pin) modes.push('keep-pin');
    if (model.keep && !model.pin) {
      return this.fail(
        context,
        'keeping means claiming: use --keep --pin (a kept row is pinned, and ' +
          'never compared again). There is no bare --keep.',
        'keep-without-pin',
      );
    }
    if (modes.length !== 1) {
      return this.fail(
        context,
        'resolve takes exactly one of --take-pack, --keep --pin, --export',
        'one-mode-required',
      );
    }
    const mode = modes[0]!;
    try {
      const result = await PackApi.resolve(packId, path, mode);
      if (mode === 'keep-pin') {
        this.tell(context, `kept and pinned ${path} in pack '${packId}' — it is never compared again until \`pack unpin\``);
      } else if (mode === 'export') {
        this.tell(
          context,
          `exported the database row at ${path} to pack '${packId}'s workspace file; ` +
            `the conflict stays open until \`pack sync ${packId}\` sees both sides agree`,
        );
      } else if (result) {
        this.tell(context, this.formatResult('resolved (took the pack)', result));
      }
    } catch (err) {
      return this.fail(context, (err as Error).message, 'resolve-failed');
    }
  }

  private async executePin(model: PackModel, context: CommandContext, pin: boolean): Promise<void> {
    const packId = model.packId?.trim();
    const path = model.path?.trim();
    if (!packId || !path) return this.fail(context, USAGE, 'path-required');
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

  // ---- rendering ---------------------------------------------------------

  private formatStatus(r: PackStatusReport): string {
    const lines: string[] = [];
    const head = `pack '${r.packId}'` + (r.discovered ? '' : ' (NOT in this build)');
    lines.push(head);
    if (!r.record) {
      lines.push('  not installed (no record)');
      return lines.join('\n');
    }
    const rec = r.record;
    lines.push(
      `  ${rec.status} v${rec.version}` +
        (r.manifestVersion && r.manifestVersion !== rec.version
          ? ` (build ships v${r.manifestVersion})`
          : '') +
        ` at ${rec.appliedAt} by ${rec.principal}`,
    );
    if (rec.failure) {
      lines.push(`  FAILED at ${rec.failure.step}: ${rec.failure.error}`);
    }
    if (r.maintainers) {
      lines.push(
        `  maintainers: ${r.maintainers.group} — ` +
          (r.maintainers.staffed ? 'staffed' : 'UNSTAFFED — routes to the executive'),
      );
    }
    for (const extent of r.titleConflicts) {
      lines.push(`  title conflict: ${extent} is held by somebody else`);
    }
    // Pins are loud, every time.
    lines.push(`  ${rec.pins.length} row(s) pinned, skipped on last reconcile`);
    for (const p of rec.pins) lines.push(`    pinned ${p}`);
    if (rec.conflicts.length === 0) {
      lines.push('  no open conflicts');
    } else {
      lines.push(`  ${rec.conflicts.length} open conflict(s):`);
      for (const c of rec.conflicts) {
        lines.push(`    ${c.path} — ${c.reason} (since ${c.detectedAt})`);
        lines.push(`      next: pack diff ${r.packId} ${c.path}`);
        lines.push(
          `            pack resolve ${r.packId} ${c.path} --take-pack | --keep --pin | --export`,
        );
      }
    }
    return lines.join('\n');
  }

  private formatProvision(p: PackProvisionReport): string {
    const lines = [`pack '${p.packId}' — as the registries hold it now`];
    lines.push(
      `  maintainers: ${p.maintainers.group} — ` +
        (p.maintainers.staffed
          ? `staffed (${p.maintainers.members.length}): ${p.maintainers.members.join(', ')}`
          : 'UNSTAFFED — routes to the executive'),
    );
    lines.push(p.groups.length === 0 ? '  groups: none' : '  groups:');
    for (const g of p.groups) lines.push(`    ${g.name} (${g.members} member(s))`);
    lines.push(p.titles.length === 0 ? '  titles: none' : '  titles:');
    for (const t of p.titles) lines.push(`    ${t.extent} — ${t.holder} [${t.outcome}]`);
    return lines.join('\n');
  }

  private formatDryRun(p: PackDryRunReport): string {
    const lines = [`dry run for pack '${p.packId}' — nothing written`];
    const byOp = new Map<string, string[]>();
    for (const a of p.actions) {
      if (a.op === 'normalize') continue;
      const list = byOp.get(a.op) ?? [];
      list.push(`${a.key} [${a.kind}]`);
      byOp.set(a.op, list);
    }
    if (byOp.size === 0) lines.push('  no changes');
    for (const op of ['insert', 'update', 'adopt', 'delete', 'keep', 'converge', 'conflict', 'pinned-skip', 'skip-sold']) {
      const keys = byOp.get(op);
      if (!keys) continue;
      lines.push(`  ${op} (${keys.length}):`);
      for (const k of keys) lines.push(`    ${k}`);
    }
    lines.push(`  ${p.pinnedSkipped} row(s) pinned, would be skipped`);
    lines.push(`  ${p.conflicts.length} conflict(s) would be reported`);
    return lines.join('\n');
  }

  private formatResult(verb: string, r: PackReconcileResult): string {
    return (
      `${verb} pack '${r.packId}': ` +
      `${r.inserted.length} inserted, ${r.updated.length} updated, ` +
      `${r.adopted.length} adopted, ${r.deleted.length} deleted, ` +
      `${r.kept.length} kept, ${r.merged.length} merged, ${r.archived.length} archived, ` +
      `${r.conflicts.length} conflict(s), ` +
      `${r.pinnedSkipped} row(s) pinned (skipped), ` +
      `${r.quantityTables} quantity table(s)` +
      Object.entries(r.documents)
        .map(([k, n]) => `, ${n} ${k} document(s)`)
        .join('') +
      ', ' +
      `${r.rehydrated} live instance(s) re-hydrated` +
      (r.conflicts.length > 0
        ? '\n' +
          r.conflicts
            .map((c) => `  conflict ${c} — next: pack diff ${r.packId} ${c}`)
            .join('\n')
        : '')
    );
  }

  /** The wiki three-body shape: three labeled sections, no machine merge. */
  private formatDiff(d: PackDiffReport): string {
    if (d.entries.length === 0) return `pack '${d.packId}': nothing to diff (no open conflicts)`;
    const out: string[] = [];
    for (const e of d.entries) {
      out.push(`${e.path} [${e.kind}]`);
      const section = (label: string, body: { hash: string; body: string } | null): void => {
        out.push(`— ${label} —${body ? ` ${body.hash}` : ' (absent)'}`);
        if (body) out.push(body.body.replace(/\n$/, ''));
      };
      section('baseline (as installed)', e.baseline);
      section('yours (database)', e.yours);
      section('theirs (pack file)', e.theirs);
    }
    return out.join('\n');
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic('shell.result')
      .toSelf(Mml.escape(`\n${text}\n`))
      .send();
  }

  private fail(context: CommandContext, detail: string, reason: string): void {
    this.tell(context, detail);
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}
