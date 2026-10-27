/**
 * SkimController — `skim <copper> into <pail>`: the scum lifted off a
 * tempered liquor. The skimmings are kept (they feed a distiller's wash);
 * an unskimmed pan grains dark. ⭐ The copper decides (`Copper.skim`).
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import Copper from '../../../thing/Copper';

const TOPIC = 'act.deed';

interface SkimModel extends CommandModel {
  copper?: MqlOneResult;
  pail?: MqlOneResult;
}

export default class SkimController extends CommandController<SkimModel> {
  execute(model: SkimModel, context: CommandContext): void {
    const actor = context.commandGiver as unknown as Stuff;
    const copper = model.copper?.stuff ?? null;
    const pail = model.pail?.stuff ?? null;
    if (!(copper instanceof Copper)) {
      return this.refuse(context, TOPIC, 'You can only skim a sugar copper.', 'not-a-copper');
    }
    if (!pail) {
      return this.refuse(context, TOPIC, 'Skim it into what? A pail.', 'no-pail');
    }
    const out = copper.skim(pail);
    if (!out.ok) return this.refuse(context, TOPIC, out.line, out.reason);
    MessageApi.scene(actor)
      .topic(TOPIC)
      .toSelf(Mml.compose`${out.line}`)
      .toPeers(Mml.compose`${Mml.actor(actor)} skims the scum off ${Mml.thing(copper)}.`)
      .send();
  }
}
