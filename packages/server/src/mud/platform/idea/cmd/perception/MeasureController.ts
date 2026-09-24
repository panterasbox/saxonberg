/**
 * MeasureController — `measure <channel> [<subject>] [with <tool>]`.
 *
 * ⭐⭐ **One controller for every channel there will ever be.** The verb
 * used to carry a `subcommands:` map — one stanza per channel, each
 * naming a controller, several of them naming a controller in a pack
 * that might not be installed. That shape had three costs and the first
 * two were silent:
 *
 *   1. a channel a pack ships was **advertised in every install** and
 *      died on dispatch with `controller-error` wherever the pack was
 *      absent;
 *   2. an unknown subcommand **stops the affordance chain**, so a verb
 *      afforded twice could not fall through to the other view;
 *   3. a trade could not add a channel without editing a platform file.
 *
 * Flat-positional fixes all three: the channel is a STRING the
 * {@link InstrumentApi} resolves against the installed roster, so an
 * uninstalled channel is simply not a channel and says so.
 *
 * The controller does almost nothing, on purpose. It resolves the
 * channel and hands off — every decision about what the reading means,
 * what it needs and how wide the answer is belongs to the
 * {@link Reading}, because a reading is an act performed by a channel.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlManyResult, MqlOneResult } from '../../../../api/mql';
import { InstrumentApi } from '../../../../api/instrument';
import { READING_TOPIC } from '../../../../lib/instrument/Reading';

export interface ReadCommandModel extends CommandModel {
  /** The channel token — `light`, `strike`, `grade`. */
  channel: string;
  /** What is being read, when the channel takes one. */
  subject?: MqlOneResult;
  /** Everything tool-shaped in reach; the Reading narrows by capability. */
  tool?: MqlManyResult;
}

export default class MeasureController extends CommandController<ReadCommandModel> {
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
    await reading.runMeasure(context, model.subject, model.tool?.stuff ?? []);
  }
}
