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
import { StuffApi } from '../../../../api/stuff';
import ReadingCatalogue, {
  READING_CATALOGUE_PATH,
} from '../../ReadingCatalogue';

export default class AnalyzeController extends CommandController<ReadCommandModel> {
  async execute(model: ReadCommandModel, context: CommandContext): Promise<void> {
    const catalogue = await StuffApi.singleton<ReadingCatalogue>(
      READING_CATALOGUE_PATH,
    );
    // ⭐ The channel, named by the one rule (naming overhaul D-C5 rule 4).
    const typed = model.channel ?? '';
    const reading = await this.named(context, await catalogue.readingNamed(typed), 'reading', typed);
    if (!reading) return;
    // ⭐ Used where it sits (D-W10-7): the binder narrows a defaulted pool to what is to hand.
    const tools = model.tool?.stuff ?? [];
    await reading.runAnalyze(context, model.subject, tools);
  }
}
