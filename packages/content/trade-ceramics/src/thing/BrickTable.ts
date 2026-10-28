/**
 * BrickTable — the moulder's bench (ceramics S4): a sanded mould thrown full
 * of tempered clay, struck off and turned out onto the pallet, a thousand
 * times a day. At the table `shape` is **a game-day's durative work**, and
 * the moulder's competence sets the RATE: a master's gang makes thousands,
 * a beginner a few hundred, all of them one stack of green bricks. The mould
 * makes its brick — the hand does not change a brick's size.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { ToolMixin } from '@saxonberg/server/mud/lib/craft/Tooled';
import { DurableMixin } from '@saxonberg/server/mud/lib/material/Durable';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { FormClass } from '@saxonberg/server/mud/lib/craft/FormSpec';
import type { ShapeRequest } from '@saxonberg/server/mud/lib/craft/Shapeable';
import type { ActPlan, ActRefusal } from '@saxonberg/server/mud/lib/craft/ActPlan';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { FormingMixin, type FormableClass } from '@saxonberg/server/mud/lib/craft/Forming';
import Clay from '@saxonberg/content-trade-quarrying/src/thing/Clay';

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

  public override async shapePlanFor(req: ShapeRequest): Promise<ActPlan | ActRefusal | null> {
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
      beginSelf: Mml.compose`You sand the brick mould, throw the first clot of clay into it and strike it off. It is going to be a long day.`,
      beginPeers: Mml.compose`${Mml.actor(actor)} sets to at ${Mml.thing(self)}, throwing clay into the mould.`,
      onComplete: () => {
        void (async (): Promise<void> => {
          // ⭐ As many as the day allows — the clay stops it sooner if it runs out.
          const count = Math.max(1, Math.floor(rate * hours));
          const made = await clay.yieldPieces({ actor, form, product, hand, count, into: room });
          if (!actor.isDestroyed() && MixinApi.isSoilable(actor)) actor.soil('mud', 0.4);
          await tellDay(actor, typeof made === 'string' ? made : null, made, discipline);
        })();
      },
    };
  }
}

/** The day's end (a module function: the clay may be worked out). */
async function tellDay(
  actor: Stuff,
  line: string | null,
  made: Stuff | string | null,
  discipline: string,
): Promise<void> {
  if (actor.isDestroyed()) return;
  if (line !== null || made === null || typeof made === 'string') {
    MessageApi.scene(actor).topic('act.deed').toSelf(Mml.compose`${line ?? ''}`).send();
    return;
  }
  // ⭐ Named as the maker knows them, not as the light shows them: a day at
  // the table ends after dark half the year, and the perceptual name read
  // "something stand turned out on the pallet" (ceramics browser walk).
  const n = MixinApi.isStackable(made) ? made.getQuantity() : 1;
  const what = made.getPresentation();
  const them = `${what.charAt(0).toUpperCase()}${what.slice(1)}`;
  MessageApi.scene(actor)
    .topic('act.deed')
    .toSelf(Mml.compose`The day is done. ${them} ${n === 1 ? 'stands' : 'stand'} turned out on the pallet, green and soft — get ${n === 1 ? 'it' : 'them'} under the hack cover before it rains.`)
    .toPeers(Mml.compose`${Mml.actor(actor)} straightens a stiff back over a pallet of green bricks.`)
    .send();
  if (MixinApi.isAdvancing(actor)) {
    await actor.creditDeed({ discipline, difficulty: 'standard', outcome: 'success' });
  }
}
