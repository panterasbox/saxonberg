/**
 * PrintController — `print <what> [n] [on <press|printer>]`. Binds; the
 * instrument decides (`PrintingMixin.printFor` — controller-liquidity W11):
 * each bound instrument is asked in turn, a press prints a forme, a printer
 * a ledger's page or a document called up by name. The run's cap is the
 * instrument's. The controller words what came back.
 */
import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlManyResult, MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Printing } from '../../../lib/Printing';
import Forme from '../../../thing/Forme';

interface Model extends CommandModel {
  what?: MqlOneResult;
  copies?: number | string;
  press?: MqlManyResult;
}

export default class PrintController extends CommandController<Model> {
  async execute(model: Model, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const thing = model.what?.stuff ?? null;
    const name = (model.what?.raw ?? '').trim();
    if (thing === null && name === '') return this.refuse(context, 'act.deed', 'Print what?', 'nothing-named');
    const copies = model.copies === undefined ? 1 : Number(model.copies);
    if (!Number.isFinite(copies) || copies < 1) {
      return this.refuse(context, 'act.deed', 'How many? A run is a whole number of copies.', 'bad-copies');
    }
    const instruments = (model.press?.stuff ?? []).filter((t) => MixinApi.isActive(t, 'PrintingMixin')) as Array<
      Stuff & Printing
    >;
    for (const instrument of instruments) {
      const out = await instrument.printFor(thing, name, copies, giver);
      if (out === null) continue;
      if (!out.ok) return this.refuse(context, 'act.deed', out.line, out.reason);
      MessageApi.scene(giver)
        .topic('act.deed')
        .toSelf(Mml.text(out.line))
        .toPeers(Mml.compose`${Mml.actor(giver)} runs off copies.`)
        .send();
      return;
    }
    // Nothing in reach prints it: say which instrument it wanted.
    if (thing instanceof Forme) {
      return this.refuse(context, 'act.deed', 'A forme is printed on a press, and there is none to hand.', 'no-press');
    }
    return this.refuse(
      context,
      'act.deed',
      instruments.length > 0
        ? 'A press prints what is set in a forme: compose it first.'
        : 'There is nothing to hand to print on.',
      'no-printer',
    );
  }
}
