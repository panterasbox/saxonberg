/**
 * PackDiffController — `pack diff <packId> [<path>]`: the three bodies of each open conflict (over {@link PackControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { PackApi } from '../../../../api/pack';
import type { PackDiffReport } from '../../../../api/pack';
import { PackControllerBase, type PackModel } from './PackControllerBase';

export default class PackDiffController extends PackControllerBase {
  async execute(model: PackModel, context: CommandContext): Promise<void> {
    const packId = model.packId?.trim();
    if (!packId) return this.failUsage(context, 'pack-required');
    try {
      const report = await PackApi.diff(packId, model.path?.trim() || undefined);
      this.tell(context, this.formatDiff(report));
    } catch (err) {
      return this.fail(context, (err as Error).message, 'diff-failed');
    }
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
}
