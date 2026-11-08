/**
 * TuneHistoryController — `tune history <target>`: recent messages on a followed channel (over {@link TuneControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { StreamApi } from '../../../../api/stream';
import { TuneControllerBase, type TuneModel } from './TuneControllerBase';

export default class TuneHistoryController extends TuneControllerBase {
  async execute(model: TuneModel, context: CommandContext): Promise<void> {
    const parsed = this.parseTarget(model);
    if (parsed.form === 'reject') return this.rejectParse(context, parsed);
    const sh = await this.serviceHandle(parsed);
    if (!sh.ok) return;
    const ring = await StreamApi.historyFor(sh.service, sh.handle);
    if (ring.length === 0) {
      this.send(
        context,
        Mml.fromMarkup(
          `\nNo history for ${sh.service} #${sh.handle} (follow it first?).\n`,
        ),
      );
      return;
    }
    const lines = [`${sh.service} #${sh.handle}:`];
    for (const f of ring) lines.push(`  ${f.body}`);
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }
}
