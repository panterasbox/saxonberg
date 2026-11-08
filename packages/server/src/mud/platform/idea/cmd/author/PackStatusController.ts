/**
 * PackStatusController — `pack status [<packId>]`: each pack's record, rung, maintainers, pins and open conflicts, plus the seed rows no pack claims (over {@link PackControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { PackApi } from '../../../../api/pack';
import type { PackStatusReport } from '../../../../api/pack';
import { PackControllerBase, type PackModel } from './PackControllerBase';

export default class PackStatusController extends PackControllerBase {
  async execute(model: PackModel, context: CommandContext): Promise<void> {
    try {
      const reports = await PackApi.status(model.packId?.trim() || undefined);
      if (reports.length === 0) {
        return this.tell(context, model.packId ? `no pack '${model.packId}'` : 'no packs');
      }
      const lines = reports.map((r) => this.formatStatus(r));
      // Seed inventory nobody claims (D9): listed, never deleted.
      const orphans = await PackApi.orphans();
      if (orphans.length > 0) {
        lines.push(`${orphans.length} template row(s) under no pack: ${orphans.join(', ')}`);
      }
      this.tell(context, lines.join('\n\n'));
    } catch (err) {
      return this.fail(context, (err as Error).message, 'status-failed');
    }
  }

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
    // The rung is a fact about the pack's src/; `code` says whether the
    // running server has loaded what is on disk (a stale capability
    // pack is a `pack sync` in dev and a restart owed in prod).
    lines.push(
      `  ${r.rung ?? 'unknown'} pack` +
        (r.dependsOn.length > 0 ? `, depends on ${r.dependsOn.join(', ')}` : '') +
        (r.code ? `; code: ${r.code === 'current' ? 'current' : 'stale — restart owed'}` : ''),
    );
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
}
