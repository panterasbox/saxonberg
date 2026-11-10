/**
 * DyeController — `dye <thing> with <dyestuff>`, and ⚠⚠ **two
 * chemistries, not one.**
 *
 * | | madder / weld | woad |
 * |---|---|---|
 * | chemistry | **mordant** dye | **vat** dye |
 * | needs | a metal ion, applied first | an alkaline reduction vat |
 * | mordant | decides the colour family | **refused** — wasted alum |
 * | the bath | **exhausts** (first dip deep, second paler) | **accumulates** (each dip builds depth) |
 * | the moment | the colour is there when you lift it | the colour arrives in the **AIR** |
 *
 * Shipping all three through one uniform grid would have asserted that
 * every dye works one way, which is false and is the thing a player
 * would carry away.
 *
 * ## ⭐⭐⭐ Linen is hard to dye, and that RETIRES the degenerate-axis worry
 *
 * > **Cellulose does not hold metal ions.** Protein fibres — wool, silk
 * > — take alum directly. Cotton and linen need a **tannin pre-mordant**
 * > to give the metal something to bind to.
 *
 * Which is exactly why linen was historically worn undyed or bleached
 * and **wool was the coloured fabric**. So one fibre does not make
 * `f(dyestuff, mordant, fibre)` degenerate — **it makes dyeing the hard
 * case**, and three good things follow: tannin is not one option of
 * four but the workhorse; wool's arrival becomes a genuine unlock
 * rather than a second row; and the trade is **harder now and easier
 * later**, which is backwards from the usual game shape and far more
 * interesting.
 *
 * ⚠ **Accepted with eyes open: the launch palette is MUTED.** Linen +
 * tannin + alum + madder is a real red, just softer, and a world of
 * heathery, chalky, sun-faded colour is a coherent look rather than a
 * deficient one. **Saturation is a thing wool brings. Do not "fix" the
 * muted palette by fudging cellulose chemistry.**
 *
 * ## ⭐ Competence buys FASTNESS and REPEATABILITY, never a brighter hue
 *
 * The hue comes from the dyestuff. What the craft decides is how many
 * washes it survives — and whether you can match last month's lot,
 * which is visible in whether your bolts stack.
 */

import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ManualBuildController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlManyResult, MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import DyeBath, { type DyeBathRefusal, type DyeDone } from '../../../lib/DyeBath';

type Composed = ReturnType<typeof Mml.compose>;

interface DyeModel extends CommandModel {
  target: MqlOneResult;
  bath?: MqlManyResult;
}

/** The dyestuff roster's row (`trade-dyeing`'s own). */
const DYESTUFF_CATALOGUE_PATH = '/trade/dyeing/idea/dyestuff-catalogue';

/**
 * ⭐ The two chemistries — refusal, bond, depth, fastness, the bath's
 * exhaust — are the bath's (`DyeBath.dyePlanFor` — controller-liquidity
 * W11); this controller narrows the bound vessels to a bath and words the
 * plan.
 */
export default class DyeController extends ManualBuildController<DyeModel> {
  async execute(model: DyeModel, context: CommandContext): Promise<void> {
    // ⭐ The dyestuff dictionary warms on first use (the scan sweep): the
    // catalogue's own creation stands the roster up — nothing boots it.
    await StuffApi.singleton(DYESTUFF_CATALOGUE_PATH).catch(() => null);
    const giver = context.commandGiver;
    const target = model.target?.stuff ?? null;
    if (!target || !MixinApi.isDyed(target)) {
      this.declineStep(context, Mml.compose`Dye what?`, 'no-target');
      return;
    }
    const bath = DyeController.findBath(model.bath);
    if (!bath) {
      this.declineStep(context, Mml.compose`There is no bath here to dip it in.`, 'no-bath');
      return;
    }
    const plan = await new DyeBath(bath).dyePlanFor(giver, target);
    if (!plan.ok) {
      this.declineStep(context, DyeController.refusalWords(plan, target, bath), plan.reason);
      return;
    }
    await this.engagePlan(context, plan, {
      beginSelf: () => Mml.compose`You work ${Mml.thing(target)} down into ${Mml.thing(bath)}.`,
      beginPeers: () => Mml.compose`${Mml.actor(giver)} works something down into a dye bath.`,
      onRefused: () => Mml.compose`The dip came to nothing.`,
      onDone: (f: DyeDone) => DyeController.doneWords(giver, target, f),
    });
  }

  /**
   * The bath — a NARROWING over what the binder bound, not a search: a
   * NAMED bath is taken as named, so the refusal can say what is wrong
   * with it; bare, the first vessel in reach with dyestuff in it.
   */
  protected static findBath(bound: MqlManyResult | undefined): Stuff | null {
    const candidates = (bound?.stuff ?? []).filter((c) => MixinApi.isBulkable(c));
    if (candidates.length === 0) return null;
    if (bound?.prep !== undefined) return candidates[0]!;
    return candidates.find((c) => new DyeBath(c).dyestuff() !== null) ?? null;
  }

  protected static refusalWords(r: DyeBathRefusal, target: Stuff, bath: Stuff): Composed {
    switch (r.reason) {
      case 'empty-bath':
        return Mml.compose`${Mml.thing(bath)} is empty.`;
      case 'not-a-dyestuff':
        return Mml.compose`${Mml.thing(bath)} holds nothing that will colour anything.`;
      case 'mordant-on-vat':
        return Mml.compose`${Mml.thing(target)} has been mordanted, and ${Mml.thing(bath)} is a vat. The alum is wasted — a reduction vat wants the cloth bare.`;
      case 'no-shade':
        return Mml.compose`Nothing happens worth speaking of. That mordant and that dye do not answer to each other.`;
      default:
        return Mml.compose`That bath will not dye anything.`;
    }
  }

  protected static doneWords(giver: Stuff, target: Stuff, f: DyeDone): { self: Composed; peers: Composed } | null {
    if (f.kind === 'gone') return null;
    return {
      self:
        f.chemistry === 'vat'
          ? Mml.compose`You draw ${Mml.thing(target)} out yellow-green. As the air takes it, the colour walks up through jade to a deep, even blue.`
          : f.gummed
            ? Mml.compose`${Mml.thing(target)} comes up ${f.colour}, thin and patchy. It is still in its gum — the dye sits on it rather than in it. It wanted boiling off first.`
            : f.thin
              ? Mml.compose`${Mml.thing(target)} comes up ${f.colour}, and thinner than it ought to be. Cellulose will not hold a metal on its own — it wanted tannin first.`
              : Mml.compose`${Mml.thing(target)} comes up ${f.colour}.`,
      peers: Mml.compose`${Mml.actor(giver)} lifts something dripping out of a bath.`,
    };
  }
}
