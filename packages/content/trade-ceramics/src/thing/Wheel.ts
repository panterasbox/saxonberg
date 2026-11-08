/**
 * Wheel — the potter's wheel (ceramics S4, D16): it throws ROUND forms —
 * open, closed, flat and the cone — one pot to a `shape`, and the potter's hand
 * decides the pot. A `Tool` (capability `wheel`) so `shape`'s instrument
 * arg binds it, fixed where it stands.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { ToolMixin } from '@saxonberg/server/mud/lib/craft/Tool';
import { DurableMixin } from '@saxonberg/server/mud/lib/material/Durable';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { ShapeFacts, ShapePlan, ShapeRefusal, ShapeRequest } from '@saxonberg/server/mud/lib/craft/Shapeable';
import type { ActDone } from '@saxonberg/server/mud/lib/craft/ActPlan';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { FormingMixin, type FormableClass } from '@saxonberg/server/mud/lib/craft/Forming';
import type { FormClass } from '@saxonberg/server/mud/lib/craft/FormSpec';
import Clay, { type PieceYield } from '@saxonberg/content-trade-quarrying/src/thing/Clay';

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

  public override async shapePlanFor(req: ShapeRequest): Promise<ShapePlan | ShapeRefusal | null> {
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
      facts: { kind: 'throw', instrument: self, form: form.describe() },
      onComplete: async () => thrown(actor, await clay.yieldPieces({ actor, form, product, hand, count: 1 }), discipline),
    };
  }
}

/** What came off the wheel, credited (a module function: the clay may be gone). */
async function thrown(
  actor: Stuff,
  y: PieceYield,
  discipline: string,
): Promise<ActDone<ShapeFacts, ShapeRefusal>> {
  if (!y.ok) return y;
  const made = y.made;
  if (!actor.isDestroyed() && MixinApi.isAdvancing(actor)) {
    await actor.creditDeed({ discipline, difficulty: 'standard', outcome: 'success' });
  }
  return { ok: true, facts: { kind: 'thrown', made } };
}
