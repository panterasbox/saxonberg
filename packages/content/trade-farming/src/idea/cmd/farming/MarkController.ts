/**
 * MarkController — `mark <name> [as <share> of it]`: **draw a field on the
 * tract you stand in** (tracts build D29).
 *
 * ⭐ Dumb by design (the mixin-authoritative rule): the TRACT decides —
 * whether you may, whether its zoning admits a field, whether it was ever
 * measured, whether the share fits, whether a crop stands across the line
 * — and words every refusal. This controller binds the words and sends
 * what the tract said.
 *
 * A name the tract already has resizes that field; a new name marks a new
 * one. No share means *the rest* of the unmarked ground.
 */

import { FieldWorkController, FIELD_TOPIC } from './FieldWorkController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { Share } from '../../../lib/Share';

interface MarkModel extends CommandModel {
  /** The field's name — *barley field*, *the long acre*. */
  name?: string;
  /** How much of the tract — *a third*, *two-thirds of it*, *40%*. */
  share?: string;
}

export default class MarkController extends FieldWorkController {
  async execute(model: MarkModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const reading = await this.fieldOf(giver);
    if (!reading) {
      this.decline(
        context,
        Mml.compose`There is no open ground here to mark a field on.`,
        'no-tract',
      );
      return;
    }
    const name = (model.name ?? '').trim();
    if (!name) {
      this.decline(context, Mml.compose`Mark a field called what?`, 'no-name');
      return;
    }
    const share = new Share(model.share);
    if (!share.isReadable()) {
      this.decline(
        context,
        Mml.compose`How much is '${model.share ?? ''}'? Say a third, half, two-thirds, the rest — or a percentage.`,
        'unreadable-share',
      );
      return;
    }
    const outcome = await reading.tract.markField(giver, name, share.fraction());
    if (!outcome.ok) {
      this.decline(context, Mml.fromMarkup(outcome.line), outcome.reason);
      return;
    }
    MessageApi.scene(giver)
      .topic(FIELD_TOPIC)
      .toSelf(Mml.fromMarkup(outcome.line))
      .toPeers(Mml.compose`${Mml.actor(giver)} paces out a field, setting stakes at the corners.`)
      .send();
  }
}
