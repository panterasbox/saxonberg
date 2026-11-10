/**
 * ScutchController — `scutch`, and ⭐ the decision is **purity against
 * staple length**.
 *
 * Break, scutch and hackle are three motions with one decision, so they
 * fold into one verb. What you are doing is beating the woody boon out
 * of retted straw; what you are CHOOSING is how hard.
 *
 * | | line | tow | grade |
 * |---|---|---|---|
 * | ordinary | most of it | the rest | as retted |
 * | `--hard` | more | less | **one band lower** |
 *
 * ⚠⚠ Working it harder gets more fibre out and BREAKS some of what it
 * gets. That is not a balance knob: long unbroken fibre is the whole
 * value of flax, and the trade-off is why "scutch" and "hackle" were
 * different jobs done by different people.
 *
 * ⭐ **Byproducts, because byproducts are what make a trade economic.**
 * Tow is short fibre — coarse yarn, rope, stuffing. Shive is the woody
 * boon — fuel and litter. Neither is waste, and a chain where the
 * off-cuts vanish is a chain that has quietly stopped being an economy.
 */

import { ManualBuildController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlManyResult, MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { Mml } from '@saxonberg/server/mud/api/mml';
import TextileStock, {
  type ScutchBegin,
  type ScutchDone,
  type TextileRefusal,
} from '../../../thing/TextileStock';

type Composed = ReturnType<typeof Mml.compose>;

interface ScutchModel extends CommandModel {
  board?: MqlManyResult;
  source: MqlOneResult;
  hard?: boolean;
}

/**
 * ⭐ The fibre gate, the charge, the split into line/tow/shive, the band,
 * the dust and the mint are the stock's (`TextileStock.scutchPlan` —
 * controller-liquidity W11); this controller words the plan.
 */
export default class ScutchController extends ManualBuildController<ScutchModel> {
  async execute(model: ScutchModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const source = model.source?.stuff ?? null;
    if (!source) {
      this.declineStep(context, Mml.compose`Scutch what?`, 'no-source');
      return;
    }
    const plan = await TextileStock.scutchPlan(giver, source, {
      hard: model.hard === true,
      instrument: this.bestInstrument(model.board, 'scutching'),
      room: context.location ?? null,
    });
    if (!plan.ok) {
      this.declineStep(context, ScutchController.refusalWords(plan, source), plan.reason);
      return;
    }
    await this.engagePlan(context, plan, {
      beginSelf: (b: ScutchBegin) =>
        b.hard
          ? Mml.compose`You set to ${Mml.thing(b.source)} hard, beating the boon out of it.`
          : Mml.compose`You work ${Mml.thing(b.source)} steadily against the board.`,
      beginPeers: () => Mml.compose`${Mml.actor(giver)} works a bundle of flax against a scutching board.`,
      onRefused: (r: TextileRefusal) => ScutchController.refusalWords(r, source),
      onDone: (f: ScutchDone) => ScutchController.doneWords(giver, f),
    });
  }

  protected static refusalWords(r: TextileRefusal, source: Stuff): Composed {
    switch (r.reason) {
      case 'nothing-to-work':
        return Mml.compose`${Mml.thing(source)} is empty.`;
      case 'not-retted':
        return Mml.compose`That is still straw. It wants a pit and a fortnight before it wants a knife.`;
      case 'not-fibre':
        return Mml.compose`${Mml.thing(source)} holds nothing you could work into a fibre.`;
      case 'over-retted':
        return Mml.compose`It has gone past. Grey, slimy and short — there is nothing in there to save.`;
      case 'too-little':
        return Mml.compose`There is not enough there to work.`;
      case 'not-made':
        return Mml.compose`Nothing comes of it, and you stop before the straw is wasted.`;
      default:
        return Mml.compose`You cannot scutch that.`;
    }
  }

  protected static doneWords(giver: Stuff, f: ScutchDone): { self: Composed; peers: Composed } | null {
    if (f.kind === 'gone') return null;
    const made = f.made.map((m) => `${m.units} of ${m.label}`).join(', ');
    return {
      self: f.hard
        ? Mml.compose`The boon flies. You get ${made} — more line than a gentle hand would, and shorter.`
        : Mml.compose`The boon falls away. You get ${made}.`,
      peers: Mml.compose`${Mml.actor(giver)} finishes a bundle of flax.`,
    };
  }
}
