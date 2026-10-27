/**
 * TemperController — `temper <copper> with <lime>`: one lump of lime into
 * the liquor. ⭐ The copper decides (`Copper.temper`); this verb only binds
 * the two things and says what happened. Tempered once and skimmed, the
 * liquor grains clean; never tempered, it will not grain at all.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import Copper from '../../../thing/Copper';

const TOPIC = 'act.deed';

interface TemperModel extends CommandModel {
  copper?: MqlOneResult;
  lime?: MqlOneResult;
}

export default class TemperController extends CommandController<TemperModel> {
  execute(model: TemperModel, context: CommandContext): void {
    const actor = context.commandGiver as unknown as Stuff;
    const copper = model.copper?.stuff ?? null;
    const lime = model.lime?.stuff ?? null;
    if (!(copper instanceof Copper)) {
      return this.refuse(context, TOPIC, 'You can only temper a sugar copper.', 'not-a-copper');
    }
    if (!lime) {
      return this.refuse(context, TOPIC, 'Temper it with what? Lime.', 'no-lime');
    }
    const out = copper.temper(lime);
    if (!out.ok) return this.refuse(context, TOPIC, out.line, out.reason);
    MessageApi.scene(actor)
      .topic(TOPIC)
      .toSelf(Mml.compose`${out.line}`)
      .toPeers(Mml.compose`${Mml.actor(actor)} tips lime into ${Mml.thing(copper)}.`)
      .send();
  }
}
