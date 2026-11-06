/**
 * PackProvisionController — `pack provision <packId>`: the pack's groups, titles and maintainers as the registries hold them now (over {@link PackControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { PackApi } from '../../../../api/pack';
import type { PackProvisionReport } from '../../../../api/pack';
import { PackControllerBase, type PackModel } from './PackControllerBase';

export default class PackProvisionController extends PackControllerBase {
  async execute(model: PackModel, context: CommandContext): Promise<void> {
    const packId = model.packId?.trim();
    if (!packId) return this.failUsage(context, 'pack-required');
    try {
      const report = await PackApi.provision(packId);
      this.tell(context, this.formatProvision(report));
    } catch (err) {
      return this.fail(context, (err as Error).message, 'provision-failed');
    }
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
}
