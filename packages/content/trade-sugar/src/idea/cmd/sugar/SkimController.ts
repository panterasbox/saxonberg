/**
 * SkimController — `skim <copper> into <pail>`: the scum lifted off a
 * tempered liquor. The skimmings are kept (they feed a distiller's wash);
 * an unskimmed pan grains dark. ⭐ The copper decides (`Copper.skim`).
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import Copper, { type SugarRefusalReason } from '../../../thing/Copper';

const TOPIC = 'act.deed';

interface SkimModel extends CommandModel {
  copper?: MqlOneResult;
  pail?: MqlOneResult;
}

/** The scum off the liquor — the copper decides (`Copper.skim`); these are the words. */
export default class SkimController extends CommandController<SkimModel> {
  execute(model: SkimModel, context: CommandContext): void {
    const actor = context.commandGiver;
    const copper = model.copper?.stuff ?? null;
    if (!(copper instanceof Copper)) {
      return this.refuse(context, TOPIC, 'You can only skim a sugar copper.', 'not-a-copper');
    }
    const pail = model.pail?.stuff ?? null;
    if (!pail) return this.refuse(context, TOPIC, SkimController.refusalLine('no-pail'), 'no-pail');
    const out = copper.skim(pail);
    if (!out.ok) return this.refuse(context, TOPIC, SkimController.refusalLine(out.reason), out.reason);
    MessageApi.scene(actor)
      .topic(TOPIC)
      .toSelf(Mml.compose`You lift the scum off into the pail, and the liquor runs clear beneath it.`)
      .toPeers(Mml.compose`${Mml.actor(actor)} skims the scum off ${Mml.thing(copper)}.`)
      .send();
  }

  /** The words for each refusal the copper gives. */
  protected static refusalLine(reason: SugarRefusalReason): string {
    switch (reason) {
      case 'no-liquor':
        return 'There is nothing in the copper to skim.';
      case 'no-pail':
        return 'You need something to skim it into.';
      case 'already-skimmed':
        return 'It is skimmed clean already.';
      case 'pail-full':
        return 'That already has something else in it.';
      case 'no-skimmings':
        return 'The scum will not come away.';
      case 'not-lime':
        return 'That is not lime.';
      default: {
        const never: never = reason;
        return String(never);
      }
    }
  }
}
