/**
 * LabelController — `label <thing> [text] [at <part>]`.
 *
 * Writes a player's own name onto a thing; with no text, clears it.
 *
 * The mechanic it exists for is narrow and the verb deliberately is not
 * (magic-items D28): derived appearance means descriptors rotate, so a
 * flask you know is healing eventually comes back looking like something
 * else. A label does not rotate. Built as **general annotation** rather
 * than a potions feature, because it serves storage, shops and gifts
 * just as well.
 *
 * ⭐ One act, asked of the thing (controller-liquidity W7c,
 * `Labelled.labelBy`): an ordinary thing takes the words; a crop standing
 * in a field marks ONE plant out under them (`Plant`'s override — field
 * population D6). The controller binds, asks, and words what came back.
 * ⚠ `at` is the part of a field and nothing else: a label with `at` in it
 * is quoted (`label vial "meet at noon"`) — the re-glue of a split phrase
 * went with the greedy text (W5/W7c).
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { LabelAnswer } from '../../../../lib/description/Labelled';
import type { PartChoices, PartRefusal } from '../../../../lib/husbandry/Soil';

const TOPIC = 'sense.survey';

interface LabelModel extends CommandModel {
  target: MqlOneResult;
  text?: string;
  /** `at <patch>` — which part of a divided field (field population D6). */
  part?: MqlOneResult;
}

export default class LabelController extends CommandController<LabelModel> {
  async execute(model: LabelModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const target = model.target?.stuff ?? null;

    if (!target) {
      const raw = model.target?.raw ?? '';
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`You don't see any '${raw}' here.`).send();
      context.note({ kind: 'empty-result', field: 'target', query: raw });
      return;
    }
    if (!MixinApi.isLabelled(target)) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There is nowhere on ${Mml.thing(target)} to write anything.`)
        .send();
      context.note({ kind: 'mixin-missing', mixin: 'LabelledMixin' });
      return;
    }
    const partRaw = (model.part?.raw ?? '').trim();
    const partBound = model.part?.stuff ?? null;
    if (!partBound && partRaw !== '') {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`You don't see any '${partRaw}' here.`).send();
      context.note({ kind: 'empty-result', field: 'part', query: partRaw });
      return;
    }
    const part = partBound && MixinApi.isSoil(partBound) ? partBound : null;
    const answer = await target.labelBy(giver as unknown as Stuff, { text: model.text ?? '', part });
    // The ground's own answers (which field; not a part of it) read as `harvest`'s do.
    if (answer.ok === 'choose' || (answer.ok === false && answer.reason === 'not-a-part-here')) {
      const line = this.partLine(answer);
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.fromMarkup(line)).send();
      context.note({ kind: 'controller-rejected', reason: answer.reason, detail: line });
      return;
    }
    LabelController.word(context, target, answer);
  }

  /** Word what the label act answered. */
  protected static word(
    context: CommandContext,
    target: Stuff,
    answer: Exclude<LabelAnswer, PartChoices | PartRefusal>,
  ): void {
    const giver = context.commandGiver;
    const refuse = (line: ReturnType<typeof Mml.compose>, reason: string): void => {
      MessageApi.scene(giver).topic(TOPIC).toSelf(line).send();
      context.note({ kind: 'controller-rejected', reason, detail: reason });
    };
    if (!answer.ok) {
      switch (answer.reason) {
        case 'part-not-ground':
          refuse(
            Mml.compose`\`at\` names a part of a field, and ${Mml.thing(target)} is not standing in one. To write "at" on it, quote the label.`,
            answer.reason,
          );
          return;
        case 'not-rooted':
          refuse(Mml.compose`${Mml.thing(target)} is not standing in anything.`, answer.reason);
          return;
        case 'nothing-sown-there':
          refuse(
            answer.facts.part
              ? Mml.compose`Nothing of that stands at ${Mml.thing(answer.facts.part)}.`
              : Mml.compose`Nothing of that stands there.`,
            answer.reason,
          );
          return;
        default: {
          const never: never = answer;
          return never;
        }
      }
    }
    const f = answer.facts;
    switch (f.kind) {
      case 'cleared':
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(
            f.had
              ? Mml.compose`You rub the label off ${Mml.thing(target)}.`
              : Mml.compose`${Mml.thing(target)} carries no label to remove.`,
          )
          .send();
        return;
      case 'written':
        MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`You label it: ${f.label}.`).send();
        return;
      case 'marked':
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(
            f.part
              ? Mml.compose`You tie your label to ${f.called} at ${Mml.thing(f.part)}: ${f.label}.`
              : Mml.compose`You tie your label to ${f.called}: ${f.label}.`,
          )
          .toPeers(Mml.compose`${Mml.actor(giver)} ties a label to one plant in ${Mml.thing(f.ground)}.`)
          .send();
        return;
      default: {
        const never: never = f;
        return never;
      }
    }
  }
}
