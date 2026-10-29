/**
 * Wheel — the potter's wheel (ceramics S4, D16): it throws ROUND forms —
 * open, closed, flat and the cone — one pot to a `shape`, and the potter's hand
 * decides the pot. A `Tool` (capability `wheel`) so `shape`'s instrument
 * arg binds it, fixed where it stands.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { ToolMixin } from '@saxonberg/server/mud/lib/craft/Tooled';
import { DurableMixin } from '@saxonberg/server/mud/lib/material/Durable';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { ShapeRequest } from '@saxonberg/server/mud/lib/craft/Shapeable';
import type { ActPlan, ActRefusal } from '@saxonberg/server/mud/lib/craft/ActPlan';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { FormingMixin, type FormableClass } from '@saxonberg/server/mud/lib/craft/Forming';
import type { FormClass } from '@saxonberg/server/mud/lib/craft/FormSpec';
import Clay from '@saxonberg/content-trade-quarrying/src/thing/Clay';

/** Throwing one pot, game-minutes. */
const THROW_MS = 5 * 60_000;

const WheelBase = FormingMixin(ToolMixin(DurableMixin(Good)));

// ⭐ It FORMS (`FormingMixin`), which is also what affords `shape`.
export default class Wheel extends WheelBase {
  protected override formingMassClass(): FormableClass {
    return Clay;
  }

  /** Round forms — and the cone (a sugar mould, a funnel) is thrown too. */
  protected override formClasses(): readonly FormClass[] {
    return ['open', 'closed', 'flat', 'cone'];
  }

  protected override formingDiscipline(): string {
    return 'pottery';
  }

  public override async shapePlanFor(req: ShapeRequest): Promise<ActPlan | ActRefusal | null> {
    const target = await this.resolveForming(req);
    if (target === null || !('mass' in target)) return target;
    const { form, product, hand, discipline } = target;
    const clay = target.mass;
    if (!(clay instanceof Clay)) return null;
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
    // ⭐ The thrower names it as they know it, not as the light shows it (a
    // throw that ends after dark read "You wire something off the wheel").
    .toSelf(Mml.compose`You wire ${made.getPresentation()} off the wheel. It is green and soft — let it stiffen to leather-hard before you touch it again.`)
    .toPeers(Mml.compose`${Mml.actor(actor)} lifts ${Mml.thing(made)} off the wheel.`)
    .send();
  if (MixinApi.isAdvancing(actor)) {
    await actor.creditDeed({ discipline, difficulty: 'standard', outcome: 'success' });
  }
}
