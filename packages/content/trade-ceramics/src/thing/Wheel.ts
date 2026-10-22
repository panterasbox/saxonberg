/**
 * Wheel — the potter's wheel (ceramics S4, D16): it throws ROUND forms —
 * open, closed and flat — one pot to a `shape`, and the potter's hand
 * decides the pot. A `Tool` (capability `wheel`) so `shape`'s instrument
 * arg binds it, fixed where it stands.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { ToolMixin } from '@saxonberg/server/mud/lib/craft/Tooled';
import { DurableMixin } from '@saxonberg/server/mud/lib/material/Durable';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type {
  ShapePlan,
  ShapePlanner,
  ShapeRefusal,
  ShapeRequest,
} from '@saxonberg/server/mud/lib/craft/Shapeable';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { FormingMixin } from '../lib/Forming';

const SHAPING = ['platform/cmd/crafting/shape.yaml'];

/** Throwing one pot, game-minutes. */
const THROW_MS = 5 * 60_000;

const WheelBase = FormingMixin(ToolMixin(DurableMixin(Good)));

export default class Wheel extends WheelBase implements ShapePlanner {
  static commandContributions: CommandContributions = {
    environment: SHAPING,
    peers: SHAPING,
  };

  public async shapePlanFor(req: ShapeRequest): Promise<ShapePlan | ShapeRefusal | null> {
    const target = await this.resolveForming(req);
    if (target === null || !('clay' in target)) return target;
    const { clay, form, product } = target;
    const discipline = form.word?.discipline || 'pottery';
    const hand = await clay.potterHand(req.actor, discipline);
    if (form.formClass !== 'flat' && form.capacityL > hand.maxL) return clay.refuseBeyond(hand);
    const actor = req.actor;
    const self = this as unknown as Stuff;
    return {
      ok: true,
      durationMs: THROW_MS,
      effortW: 260,
      beginSelf: Mml.compose`You centre the clay on ${Mml.thing(self)}, open it with your thumbs and draw the wall up for a ${form.describe()}.`,
      beginPeers: Mml.compose`${Mml.actor(actor)} throws a pot on ${Mml.thing(self)}.`,
      onComplete: () => {
        void clay
          .yieldPieces({ actor, form, product, hand, count: 1 })
          .then((made) => tellShaped(actor, made, discipline));
      },
    };
  }
}

/** Say what came off the wheel, and credit it (a module function: the clay may be gone). */
async function tellShaped(actor: Stuff, made: Stuff | string, discipline: string): Promise<void> {
  if (actor.isDestroyed()) return;
  if (typeof made === 'string') {
    MessageApi.scene(actor).topic('act.deed').toSelf(Mml.compose`${made}`).send();
    return;
  }
  MessageApi.scene(actor)
    .topic('act.deed')
    .toSelf(Mml.compose`You wire ${Mml.thing(made)} off the wheel. It is green and soft — let it stiffen to leather-hard before you touch it again.`)
    .toPeers(Mml.compose`${Mml.actor(actor)} lifts ${Mml.thing(made)} off the wheel.`)
    .send();
  if (MixinApi.isAdvancing(actor)) {
    await actor.creditDeed({ discipline, difficulty: 'standard', outcome: 'success' });
  }
}
