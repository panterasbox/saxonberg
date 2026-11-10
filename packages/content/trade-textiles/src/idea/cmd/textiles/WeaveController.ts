/**
 * WeaveController — `weave`, and ⭐ the decision is **weave density**:
 * yield against windproofing and wear.
 *
 * | | cloth per yarn | the cloth |
 * |---|---|---|
 * | `--coarse` | most | sackcloth — breathes, and a sack is what it is for |
 * | ordinary | middling | plain linen |
 * | `--close` | least | fine linen: breaks a wind, wears far longer |
 *
 * ⭐⭐ **The density is a FABRIC ROW, not a per-bolt number**, and that
 * is the demonstration that `Construction`'s second source works: this
 * pack ships its own `/trade/textiles/idea/fabric/*` rows, the
 * catalogue harvests them by path infix, and the kernel never learned
 * they exist. A pack adding `lace` tomorrow needs no kernel edit and
 * changes nothing about combat — cloth resists poorly, and the kernel
 * decides that, not the row.
 *
 * ⚠ A bad run yields a **flawed bolt** — one grade band down. Without a
 * failure mode competence is invisible, and weaving's is a slub you
 * cannot take out.
 */

import { ManualBuildController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlManyResult, MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { Mml } from '@saxonberg/server/mud/api/mml';
import TextileStock, {
  type TextileRefusal,
  type WeaveBegin,
  type WeaveDone,
} from '../../../thing/TextileStock';

type Composed = ReturnType<typeof Mml.compose>;

interface WeaveModel extends CommandModel {
  loom?: MqlManyResult;
  yarn: MqlOneResult;
  close?: boolean;
  open?: boolean;
}

/**
 * ⭐ The charge, the yield against the cloth, the band and the mint are
 * the yarn's (`TextileStock.weavePlan` — controller-liquidity W11); this
 * controller picks the weave from the options, the best loom bound, and
 * words the plan.
 */
export default class WeaveController extends ManualBuildController<WeaveModel> {
  async execute(model: WeaveModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const yarn = model.yarn?.stuff ?? null;
    if (!yarn) {
      this.declineStep(context, Mml.compose`Weave what?`, 'no-yarn');
      return;
    }
    if (model.close && model.open) {
      this.declineStep(context, Mml.compose`A web is set close or open, not both.`, 'two-weaves');
      return;
    }
    const plan = await TextileStock.weavePlan(giver, yarn, {
      form: model.close ? 'fine-woven' : model.open ? 'sackcloth' : 'woven',
      instrument: this.bestInstrument(model.loom, 'weaving'),
    });
    if (!plan.ok) {
      this.declineStep(context, WeaveController.refusalWords(plan, yarn), plan.reason);
      return;
    }
    await this.engagePlan(context, plan, {
      beginSelf: (b: WeaveBegin) =>
        Mml.compose`You warp the loom with ${Mml.thing(b.yarn)} and begin throwing the shuttle.`,
      beginPeers: () => Mml.compose`${Mml.actor(giver)} sets a web on the loom.`,
      onRefused: (r: TextileRefusal) => WeaveController.refusalWords(r, yarn),
      onDone: (f: WeaveDone) => WeaveController.doneWords(giver, f),
    });
  }

  protected static refusalWords(r: TextileRefusal, yarn: Stuff): Composed {
    switch (r.reason) {
      case 'not-yarn':
        return Mml.compose`${Mml.thing(yarn)} is not yarn. A loom wants thread.`;
      case 'too-little':
        return Mml.compose`There is not enough yarn there to warp a loom.`;
      case 'not-made':
        return Mml.compose`The web will not come right. You take it off the loom with the yarn unspoiled.`;
      default:
        return Mml.compose`You cannot weave that.`;
    }
  }

  protected static doneWords(giver: Stuff, f: WeaveDone): { self: Composed; peers: Composed } | null {
    if (f.kind === 'gone') return null;
    const kind = f.form === 'fine-woven' ? 'fine' : f.form === 'sackcloth' ? 'coarse' : 'plain';
    return {
      self: Mml.compose`You cut ${String(f.units)} of ${kind} cloth off the loom.`,
      peers: Mml.compose`${Mml.actor(giver)} cuts a web off the loom.`,
    };
  }
}
