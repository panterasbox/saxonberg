/**
 * LabelController — `label <thing> [text]`.
 *
 * Writes a player's own name onto a thing; with no text, clears it.
 *
 * The mechanic it exists for is narrow and the verb deliberately is not
 * (magic-items D28): derived appearance means descriptors rotate, so a
 * flask you know is healing eventually comes back looking like something
 * else. A label does not rotate. Built as **general annotation** rather
 * than a potions feature, because it serves storage, shops and gifts
 * just as well — and a potions-only version would have been the same
 * code with a smaller reach.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';

const TOPIC = 'sense.survey';

interface LabelModel extends CommandModel {
  target: MqlOneResult;
  text?: string;
}

export default class LabelController extends CommandController<LabelModel> {
  execute(model: LabelModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const target = model.target?.stuff ?? null;

    if (!target) {
      const raw = model.target?.raw ?? '';
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${raw}' here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'target', query: raw });
      return;
    }

    if (!MixinApi.isLabelled(target)) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`There is nowhere on ${Mml.thing(target)} to write anything.`,
        )
        .send();
      context.note({ kind: 'mixin-missing', mixin: 'LabelledMixin' });
      return;
    }

    const text = (model.text ?? '').trim();
    if (text.length === 0) {
      const had = target.isLabelled();
      target.setLabel('');
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          had
            ? Mml.compose`You rub the label off ${Mml.thing(target)}.`
            : Mml.compose`${Mml.thing(target)} carries no label to remove.`,
        )
        .send();
      return;
    }

    target.setLabel(text);
    MessageApi.scene(giver)
      .topic(TOPIC)
      // Read back what was STORED, not what was typed: the setter trims
      // and caps, and showing the player something other than what the
      // world now holds would be a small lie.
      .toSelf(Mml.compose`You label it: ${target.getLabel()}.`)
      .send();
  }
}
