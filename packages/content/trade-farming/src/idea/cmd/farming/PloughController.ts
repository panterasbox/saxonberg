/**
 * PloughController — `plow`, and ⭐⭐ **draught power is body mass.
 * There is no new mechanism** (D40).
 *
 * `DraftAnimal` is the shipped precedent and its own doc says it: carry
 * capacity derives from body mass in the encumbrance substrate, *"the
 * pony is better at hauling because it is heavier, which is the actual
 * reason, and the engine already knew it."* Ploughing asks the same
 * question of the same number.
 *
 * > **By hand it is punishing; with an ox it is work.**
 *
 * ⭐ Which makes the ox a **genuine capital investment** and the first
 * rung of a mechanisation ladder nobody authors ahead of demand. And
 * ⚠ **an ox eats whether or not it works** — the
 * depreciating-asset-that-consumes insight applied to a tool, which is
 * the honest economics of draught power and falls out of the animal
 * being an animal rather than being modelled here.
 *
 * ## What ploughing IS, mechanically
 *
 * It is the same improvement work `grub` does, at a different rate and
 * against a different job: turning ground over rather than getting the
 * thorn out of it. So it banks against `clearing` like grubbing does —
 * one act, but an act worth several by hand and many behind an ox.
 *
 * ⚠ It is deliberately NOT a second improvement axis. A field does not
 * need a "ploughed" state on top of a cleared one; what a plough buys is
 * the same ground, sooner, for a smaller share of somebody's back.
 *
 * ## ⭐ The seedbed (cover build D4)
 *
 * Once the clearing is done, ploughing is SEASONAL: a bout turns the
 * sward under — the grass goes into the ground as organic matter — and
 * the field is ploughed for the season, which is what `sow` asks for. A
 * second bout that season is refused, and so is ploughing under a
 * standing crop (grub it out, or cut it).
 */

import { FieldWorkController } from './FieldWorkController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Soil } from '@saxonberg/server/mud/lib/husbandry/Soil';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { GrammarApi } from '@saxonberg/server/mud/api/grammar';
import Tract, { type PlowDone, type PlowRefusal } from '../../../location/Tract';

type Composed = ReturnType<typeof Mml.compose>;

/** ⭐ The instrument is bound by the view, never hunted for here. */
interface PloughModel extends CommandModel {
  tool?: MqlOneResult;
  /** ⭐ Which field — `plow at the gate end` (tracts build D38). */
  part?: MqlOneResult;
}

/**
 * ⭐⭐ **The tract decides** (controller-liquidity W10): clearing or
 * seedbed, the draught by mass, the pace, the wear on the share, what is
 * banked — `Tract.plowPlanFor`. This file binds the plough and writes the
 * words.
 */
export default class PloughController extends FieldWorkController {
  async execute(model: PloughModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const room = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    if (!(room instanceof Tract)) {
      this.decline(context, Mml.compose`There is no ground here to turn.`, 'no-field');
      return;
    }
    const plough = this.toolOf(model.tool?.stuff, 'ploughing');
    if (!plough) {
      this.decline(context, Mml.compose`You would want a plough for that.`, 'no-tool');
      return;
    }
    const named = model.part?.stuff ?? null;
    const plan = await room.plowPlanFor(
      giver,
      plough,
      named && MixinApi.isSoil(named) ? (named as Stuff & Soil) : null,
    );
    if (plan === null) return;
    if (plan.ok === 'choose' || (plan.ok === false && plan.reason === 'not-a-part-here')) {
      this.decline(context, Mml.fromMarkup(this.partLine(plan)), plan.reason);
      return;
    }
    if (plan.ok === false) {
      this.decline(context, PloughController.refusalWords(plan as PlowRefusal), plan.reason);
      return;
    }
    await this.engagePlan(context, plan, {
      beginSelf: (f) =>
        f.beast
          ? Mml.compose`You set the share in, take up the reins, and the beast leans into the collar. The furrow opens ahead of you.`
          : Mml.compose`You get the traces over your shoulders and lean. The share goes in about half as far as it ought to.`,
      beginPeers: () => Mml.compose`${Mml.actor(giver)} starts a furrow across the field.`,
      onRefused: (r) => PloughController.refusalWords(r),
      onDone: (f) => ({ self: PloughController.doneWords(f) }),
    });
  }

  protected static refusalWords(r: PlowRefusal): Composed {
    switch (r.reason) {
      case 'part-failed':
        // ⭐⭐ The refusal names the PART and the cure — you do not buy a
        // plough, you fit a share.
        return Mml.compose`The ${r.facts.part} on ${Mml.thing(r.facts.plough)} is done for. Fit a new ${r.facts.part} before you plough again.`;
      case 'crop-stands':
        return Mml.compose`A crop stands in it. Cut it or grub it out before you plough.`;
      case 'no-field-marked':
        return Mml.compose`Nobody has marked a field here. Mark one first.`;
      case 'already-ploughed':
        return Mml.compose`It is already ploughed for the season. It wants seed, not another furrow.`;
      default: {
        const never: never = r.reason;
        return Mml.compose`${String(never)}`;
      }
    }
  }

  protected static doneWords(f: PlowDone): Composed {
    if (f.kind === 'seedbed') {
      return Mml.compose`The grass goes under in long dark slices. Ploughed for the season.`;
    }
    const cause = GrammarApi.cap(f.cause ?? 'there is more to do');
    if (f.done) return Mml.compose`The last of it goes over. ${GrammarApi.cap(f.phrase)}.`;
    return f.beast
      ? Mml.compose`Four bouts and the end of it is in sight. ${cause}.`
      : Mml.compose`You get a few yards and stop, and your back tells you what an ox is for. ${cause}.`;
  }
}
