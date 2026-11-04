/**
 * PrintController — `print <what> [n] [on <press|printer>]` (paper D2, D3,
 * D7, D17). Binds; the instrument decides. A forme in reach goes to the
 * press; a ledger's page or a document goes to the printer.
 */
import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlManyResult, MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { DocumentApi } from '@saxonberg/server/mud/api/document';
import { MqlApi } from '@saxonberg/server/mud/api/mql';
import RegisterBook from '@saxonberg/server/mud/platform/thing/RegisterBook';
import Forme from '../../../thing/Forme';
import Press from '../../../thing/Press';
import Printer from '../../../thing/Printer';

interface Model extends CommandModel { what: string; on?: MqlManyResult; }

export default class PrintController extends CommandController<Model> {
  async execute(model: Model, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const words = (model.what ?? '').trim().split(/\s+/).filter((w) => w !== '');
    let copies = 1;
    const last = words[words.length - 1];
    if (last !== undefined && /^\d+$/.test(last)) {
      copies = Math.min(500, Math.max(1, Number(last)));
      words.pop();
    }
    const name = words.join(' ');
    if (name === '') return this.refuse(context, 'act.deed', 'Print what?', 'nothing-named');
    const tools = model.on?.stuff ?? [];
    const press = tools.find((t): t is Press => t instanceof Press) ?? null;
    const printer = tools.find((t): t is Printer => t instanceof Printer) ?? null;
    const thing: Stuff | null = MqlApi.resolveOne(name, { commandGiver: giver, scope: 'reachable' }).stuff ?? null;

    let out;
    if (thing instanceof Forme) {
      if (press === null) return this.refuse(context, 'act.deed', 'A forme is printed on a press, and there is none to hand.', 'no-press');
      out = await press.pull(thing, copies, giver);
    } else if (thing instanceof RegisterBook) {
      if (printer === null) return this.refuse(context, 'act.deed', 'There is no printer to hand to print an extract on.', 'no-printer');
      out = await printer.printPage(thing.getRegisterPrefix(), `an extract of ${thing.getPresentation()}`, await thing.currentPage(), copies, giver);
    } else {
      if (printer === null) {
        return this.refuse(context, 'act.deed', press !== null ? 'A press prints what is set in a forme: compose it first.' : 'There is nothing to hand to print on.', 'no-printer');
      }
      const doc = await DocumentApi.callUp(giver, name);
      if (doc === null) return this.refuse(context, 'act.deed', `You have nothing called "${name}" to print.`, 'no-document');
      out = await printer.printDocument(doc.path, doc.title, copies, giver);
    }
    if (!out.ok) return this.refuse(context, 'act.deed', out.line, out.reason);
    MessageApi.scene(giver).topic('act.deed').toSelf(Mml.text(out.line))
      .toPeers(Mml.compose`${Mml.actor(giver)} runs off copies.`).send();
  }
}
