/**
 * TuneWhoController — `tune who <target>`: who is following a channel (over {@link TuneControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { StreamApi } from '../../../../api/stream';
import { TuneControllerBase, type TuneModel } from './TuneControllerBase';

export default class TuneWhoController extends TuneControllerBase {
  async execute(model: TuneModel, context: CommandContext): Promise<void> {
    const parsed = this.parseTarget(model);
    if (parsed.form === 'reject') return this.rejectParse(context, parsed);
    const sh = await this.serviceHandle(parsed);
    if (!sh.ok) return;
    const tuned = await StreamApi.whoTuned(sh.service, sh.handle);
    if (tuned.length === 0) {
      this.send(
        context,
        Mml.fromMarkup(`\nNo one is following ${sh.service} #${sh.handle}.\n`),
      );
      return;
    }
    const lines = [`Following ${sh.service} #${sh.handle}:`];
    for (const a of tuned) lines.push(`  ${a.getPresentation()}`);
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }
}
