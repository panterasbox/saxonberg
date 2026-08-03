/**
 * ZapController — `zap <item> [at <target>]`.
 *
 * The charged-item front door. Thin by construction: everything that
 * makes an item discharge different from a cast lives behind
 * `MagicApi.discharge` — no band gate, no cast time, no Transcript
 * credit, potency from the maker's fixed efficiency — and the charge
 * spend happens inside it, because that is what makes "depleted" a
 * single answer rather than a check every caller has to remember.
 *
 * ⚠ **A depleted wand reaches here and fails audibly** (D34). The
 * controller deliberately does not pre-check the charge and refuse
 * early: it must behave identically for a full and a flat wand right up
 * to the point of firing, because any earlier divergence is a channel
 * through which charge state could leak into something observable.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { MagicApi } from '../../../api/magic';
import { Mml } from '../../../api/mml';

const TOPIC = 'world.magic.cast';

interface ZapModel extends CommandModel {
  item: MqlOneResult;
  target?: MqlOneResult;
}

export default class ZapController extends CommandController<ZapModel> {
  async execute(model: ZapModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver;
    const item = model.item?.stuff ?? null;

    if (!item) {
      const raw = model.item?.raw ?? '';
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${raw}' here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'item', query: raw });
      return;
    }

    if (!MixinApi.isCharged(item) || !MixinApi.isArcane(item)) {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.item(item)} is not something you can fire.`)
        .send();
      context.note({ kind: 'mixin-missing', mixin: 'ChargedMixin' });
      return;
    }

    const target = model.target?.stuff ?? undefined;
    const outcome = await MagicApi.discharge(item, target);

    if (!outcome.ok) {
      // The refusal IS the prose — including the flat-wand click.
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.text(outcome.refusal ?? 'Nothing happens.'))
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'discharge-refused',
        detail: outcome.refusal ?? 'no effect',
      });
      return;
    }

    MessageApi.scene(actor)
      .topic(TOPIC)
      .toSelf(Mml.text(outcome.reports.join(' ')))
      .toPeers(
        target
          ? Mml.compose`${Mml.name(actor)} levels ${Mml.item(item)} at ${Mml.item(target)}.`
          : Mml.compose`${Mml.name(actor)} raises ${Mml.item(item)}, and something answers.`,
      )
      .send();
  }
}
