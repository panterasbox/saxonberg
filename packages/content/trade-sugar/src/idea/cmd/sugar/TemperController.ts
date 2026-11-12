/**
 * TemperController — `temper <copper> with <lime>`: one lump of lime into
 * the liquor. ⭐ The copper decides (`Copper.temper`); this verb only binds
 * the two things and says what happened. Tempered once and skimmed, the
 * liquor grains clean; never tempered, it will not grain at all.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import Copper, { type SugarRefusalReason } from '../../../thing/Copper';

const TOPIC = 'act.deed';

interface TemperModel extends CommandModel {
  copper?: MqlOneResult;
  lime?: MqlOneResult;
}

/** Lime into the liquor — the copper decides (`Copper.temper`); these are the words. */
export default class TemperController extends CommandController<TemperModel> {
  execute(model: TemperModel, context: CommandContext): void {
    const actor = context.commandGiver;
    const copper = model.copper?.stuff ?? null;
    if (!(copper instanceof Copper)) {
      return this.refuse(context, TOPIC, 'You can only temper a sugar copper.', 'not-a-copper');
    }
    const lime = model.lime?.stuff ?? null;
    if (!lime) return this.refuse(context, TOPIC, 'Temper it with what? Lime.', 'no-lime');
    const out = copper.temper(lime);
    if (!out.ok) return this.refuse(context, TOPIC, TemperController.refusalLine(out.reason), out.reason);
    MessageApi.scene(actor)
      .topic(TOPIC)
      .toSelf(
        out.facts.limed === 1
          ? Mml.compose`The lime goes in; the liquor clouds, and a grey scum starts to rise.`
          : Mml.compose`More lime goes in. The liquor darkens — that is too much.`,
      )
      .toPeers(Mml.compose`${Mml.actor(actor)} tips lime into ${Mml.thing(copper)}.`)
      .send();
  }

  /** The words for each refusal the copper gives. */
  protected static refusalLine(reason: SugarRefusalReason): string {
    switch (reason) {
      case 'no-liquor':
        return 'There is no liquor in the copper to temper.';
      case 'not-lime':
        return 'That is not lime.';
      case 'no-pail':
      case 'already-skimmed':
      case 'pail-full':
      case 'no-skimmings':
        return 'The copper will not take it.';
      default: {
        const never: never = reason;
        return String(never);
      }
    }
  }
}
