/**
 * PackInstallController — `pack install <packId> --dry-run`: the reconcile plan, nothing written (boot installs; a live apply is `sync`) (over {@link PackControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { PackApi } from '../../../../api/pack';
import type { PackDryRunReport } from '../../../../api/pack';
import { PackControllerBase, type PackModel } from './PackControllerBase';

export default class PackInstallController extends PackControllerBase {
  async execute(model: PackModel, context: CommandContext): Promise<void> {
    if (!model.dryRun) {
      return this.fail(
        context,
        'boot installs; use `pack install <packId> --dry-run` to preview, ' +
          '`pack sync <packId>` to apply live',
        'install-is-boot',
      );
    }
    const packId = model.packId?.trim();
    if (!packId) return this.failUsage(context, 'pack-required');
    try {
      const plan = await PackApi.dryRun(packId);
      this.tell(context, this.formatDryRun(plan));
    } catch (err) {
      return this.fail(context, (err as Error).message, 'dry-run-failed');
    }
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
    for (const op of ['insert', 'update', 'delete', 'keep', 'converge', 'conflict', 'pinned-skip', 'skip-sold']) {
      const keys = byOp.get(op);
      if (!keys) continue;
      lines.push(`  ${op} (${keys.length}):`);
      for (const k of keys) lines.push(`    ${k}`);
    }
    lines.push(`  ${p.pinnedSkipped} row(s) pinned, would be skipped`);
    lines.push(`  ${p.conflicts.length} conflict(s) would be reported`);
    return lines.join('\n');
  }
}
