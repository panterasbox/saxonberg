/**
 * PaddleController — `paddle [<way>]`: propel the small boat you are
 * sitting in by your own effort (river D21).
 *
 * The boat plans it (`Boat.paddleBy` — the words it takes, the landing by
 * name, the bar side, the start of the `Propel` engagement); this says it.
 * Words: `downstream` / `down`, `upstream` / `up`, `left`, `right`, `bar`
 * (whichever bank is gravel here), or the name of a landing within hail.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import Boat, { type PaddleRefusal } from '../../../thing/Boat';

interface PaddleModel extends CommandModel {
  heading?: string;
  inside?: boolean;
  hard?: boolean;
}

export default class PaddleController extends CommandController<PaddleModel> {
  async execute(model: PaddleModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const boat = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    if (!(boat instanceof Boat)) return this.refuse(context, 'act.deed', 'You are not sitting in a boat.', 'not-in-boat');
    const out = await boat.paddleBy(giver, model.heading ?? '', { inside: model.inside === true, hard: model.hard === true });
    if (!out.ok) return this.refuse(context, 'act.deed', PaddleController.refusalText(out), out.reason);
    const { kind, heading } = out.facts;
    const verb = kind === 'pole' ? 'pole' : kind === 'oar' ? 'row' : 'paddle';
    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(Mml.compose`You take up the ${kind} and ${verb} ${heading === 'place' ? 'for the landing' : heading}.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} takes up the ${kind} and ${verb}s.`)
      .send();
  }

  /** ⭐ Every refusal a boat can give the paddle. */
  protected static refusalText(r: PaddleRefusal): string {
    switch (r.reason) {
      case 'no-propulsion':
        return 'There is nothing in her to paddle with.';
      case 'capsized':
        return 'She is upside down.';
      case 'not-engaged':
        return 'You cannot paddle.';
      case 'no-river':
        return 'There is no water here that goes anywhere.';
      case 'which-way':
        return 'Paddle which way — downstream, upstream, left, right, or to a landing you can see?';
      case 'engagement-conflict':
        return 'Your hands are already busy.';
      default: {
        const never: never = r.reason;
        return never;
      }
    }
  }
}
