/**
 * BrickTable — the moulder's bench (ceramics S4): a sanded mould thrown full
 * of tempered clay, struck off and turned out onto the pallet, a thousand
 * times a day. At the table `shape` is **a game-day's durative work**, and
 * the moulder's competence sets the RATE: a master's gang makes thousands,
 * a beginner a few hundred, all of them one stack of green bricks. The mould
 * makes its brick — the hand does not change a brick's size.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { ToolMixin } from '@saxonberg/server/mud/lib/craft/Tool';
import { DurableMixin } from '@saxonberg/server/mud/lib/material/Durable';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { FormClass } from '@saxonberg/server/mud/lib/craft/FormSpec';
import type { ShapeFacts, ShapePlan, ShapeRefusal, ShapeRequest } from '@saxonberg/server/mud/lib/craft/Shapeable';
import type { ActDone } from '@saxonberg/server/mud/lib/craft/ActPlan';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { FormingMixin, type FormableClass } from '@saxonberg/server/mud/lib/craft/Forming';
import Clay, { type PieceYield } from '@saxonberg/content-trade-quarrying/src/thing/Clay';

/** Bricks an hour, by band — the grain `ceramics.brickTable.rate.<band>` tunes. */
const RATE: Readonly<Record<CompetenceBandName, number>> = {
  untrained: 30,
  novice: 60,
  competent: 150,
  proficient: 300,
  expert: 450,
};

function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw == null || raw === '') return fallback;
    const n = Number.parseFloat(String(raw));
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

const BrickTableBase = FormingMixin(ToolMixin(DurableMixin(Good)));

// ⭐ It FORMS (`FormingMixin`), which is also what affords `shape`.
export default class BrickTable extends BrickTableBase {
  protected override formingMassClass(): FormableClass {
    return Clay;
  }

  protected override formingDiscipline(): string {
    return 'brickmaking';
  }

  protected override formClasses(): readonly FormClass[] {
    return ['block', 'flat'];
  }

  public override async shapePlanFor(req: ShapeRequest): Promise<ShapePlan | ShapeRefusal | null> {
    const target = await this.resolveForming(req);
    if (target === null || !('mass' in target)) return target;
    const { form, product, hand, discipline } = target;
    const clay = target.mass;
    if (!(clay instanceof Clay)) return null;
    const hours = dial('ceramics.brickTable.hours', 8);
    const rate = dial(`ceramics.brickTable.rate.${hand.band}`, RATE[hand.band]);
    const self = this as unknown as Stuff;
    const room = MixinApi.isContainable(self) ? self.getContainer() : null;
    const actor = req.actor;
    return {
      ok: true,
      durationMs: hours * 3_600_000,
      // ⚠ Under the 300 W aerobic threshold: the whole act is charged up
      // front, and 330 W for eight hours was ~576 % of any body's endurance —
      // nobody could ever mould (the ceramics drive). A day's work is paced.
      effortW: 260,
      facts: { kind: 'mould', instrument: self },
      onComplete: async () => {
        // ⭐ As many as the day allows — the clay stops it sooner if it runs out.
        const count = Math.max(1, Math.floor(rate * hours));
        const made = await clay.yieldPieces({ actor, form, product, hand, count, into: room });
        if (!actor.isDestroyed() && MixinApi.isSoilable(actor)) actor.soil('/platform/dirt/mud', 0.4);
        return dayDone(actor, made, discipline);
      },
    };
  }
}

/** The day's end, credited (a module function: the clay may be worked out). */
async function dayDone(
  actor: Stuff,
  y: PieceYield,
  discipline: string,
): Promise<ActDone<ShapeFacts, ShapeRefusal>> {
  if (!y.ok) return y;
  if (!actor.isDestroyed() && MixinApi.isAdvancing(actor)) {
    await actor.creditDeed({ discipline, difficulty: 'standard', outcome: 'success' });
  }
  return { ok: true, facts: { kind: 'moulded', made: y.made } };
}
