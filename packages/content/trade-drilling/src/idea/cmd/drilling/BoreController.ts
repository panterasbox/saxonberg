/**
 * BoreController — `bore [<hole>]`: one stroke of the beam, banked toward
 * the next metre.
 *
 * ⭐ One act (controller-liquidity W12). `bore` used to be two acts wearing
 * one verb — with no hole it SITED one — and the world's state picked
 * which. Siting is `spud` now (`SpudController`, the driller's own word
 * for starting a hole); this verb only swings.
 *
 * The hole plans the stroke (`Wellhead.swingPlan`): its refusals are the
 * ground's, its pace is the rock's, and the labour credit goes to whoever
 * swung. This controller says it.
 */

import { Mml } from '@saxonberg/server/mud/api/mml';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { DrillingActController, type DrillingModel } from './DrillingActController';
import type { SwingDone, SwingRefusal } from '../../../thing/Wellhead';

export default class BoreController extends DrillingActController {
  public async execute(model: DrillingModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const hole = this.wellheadOf(model);
    if (hole === null) {
      this.noHole(context);
      return;
    }
    if (this.derrickOf(model) === null) {
      this.noDerrick(context);
      return;
    }
    const plan = await hole.swingPlan(giver);
    if (!plan.ok) {
      this.decline(context, BoreController.refusalWords(plan), plan.reason);
      return;
    }
    await this.engageAct(context, plan, {
      beginSelf: () => Mml.compose`You put your weight on the beam.`,
      beginPeers: () => Mml.compose`${Mml.actor(giver)} leans into the beam.`,
      onRefused: (r) => BoreController.refusalWords(r),
      onDone: (f) => ({ self: BoreController.doneWords(f) }),
    });
  }

  /** ⭐ Every refusal the hole can give the beam. */
  protected static refusalWords(r: SwingRefusal): ReturnType<typeof Mml.compose> {
    switch (r.reason) {
      case 'no-bill':
        // ⚠ Silence is not "free": a hole over no column says so.
        return Mml.compose`Nothing under this ground has ever been written down. There is no telling what the next yard costs, and nobody will swing on that.`;
      case 'wants-lining':
        return Mml.compose`The hole will not stand open any deeper — soft ground and standing water, and it comes in as fast as you clear it. It wants lining. \`line\` it.`;
      case 'wants-bailing':
        return Mml.compose`There is water standing in the hole and the bit is swimming in it. Bail it out before you cut any further.`;
      default: {
        const never: never = r.reason;
        return never;
      }
    }
  }

  /**
   * The stroke, landed. ⭐ A swing that buys no yard still says how deep
   * you are — the one number the whole bet turns on.
   */
  protected static doneWords(f: SwingDone): ReturnType<typeof Mml.compose> {
    if (!f.deepened) {
      return Mml.compose`The beam comes up, the bit comes down. ${String(f.beforeM)} m, and ${String(f.bank)} of ${String(f.needed)} strokes toward the next yard.`;
    }
    return f.struck
      ? Mml.compose`The bit drops through — and the hole changes its voice. ${String(f.depthM)} m, and there is something in it.`
      : Mml.compose`The bit drops through and the tools go down another yard. ${String(f.depthM)} m, and dry.`;
  }
}
