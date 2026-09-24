/**
 * AnalyzeController — `analyze <channel> [<subject>]`.
 *
 * `measure`'s twin, and the same three sentences of work: resolve the
 * channel against the installed roster, hand off to the {@link Reading}.
 * The difference between the two verbs is which RUNG they drive —
 * `measure` the carried instrument, `analyze` the trained eye — and that
 * difference lives on the Reading, not here.
 *
 * ⭐ `analyze` keeps `opens_card: survey`: the record channels
 * (`analyze ground`, `analyze soil`) are syntheses over readings already
 * taken and belong on the card where a player can sit with them.
 *
 * See {@link MeasureController} for why both views are flat-positional
 * and what the `subcommands:` shape cost.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext } from '../../../../api/command';
import type { ReadCommandModel } from './MeasureController';
import { InstrumentApi } from '../../../../api/instrument';
import { READING_TOPIC } from '../../../../lib/instrument/Reading';

export default class AnalyzeController extends CommandController<ReadCommandModel> {
  async execute(model: ReadCommandModel, context: CommandContext): Promise<void> {
    const reading = await InstrumentApi.reading(model.channel ?? '');
    if (!reading) {
      this.refuse(
        context,
        READING_TOPIC,
        `There is no reading called '${model.channel ?? ''}'. \`readings\` lists what you can find out.`,
        'unknown-channel',
        model.channel ?? '',
      );
      return;
    }
    await reading.runAnalyze(context, model.subject, model.tool?.stuff ?? []);
  }
}
