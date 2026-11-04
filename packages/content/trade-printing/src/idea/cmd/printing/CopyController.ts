/** CopyController — `copy <sheet> onto <blank> with <pen>` (paper D3). Dumb: the pen decides. */
import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlManyResult, MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import Pen from '../../../thing/Pen';

interface Model extends CommandModel { from: MqlOneResult; onto: MqlOneResult; pen?: MqlManyResult; }

export default class CopyController extends CommandController<Model> {
  async execute(model: Model, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const from = model.from?.stuff ?? null;
    const onto = model.onto?.stuff ?? null;
    if (from === null || onto === null) return this.refuse(context, 'act.deed', 'Copy what, onto what?', 'nothing-named');
    const pen = (model.pen?.stuff ?? []).find((s): s is Pen => s instanceof Pen) ?? null;
    if (pen === null) return this.refuse(context, 'act.deed', 'You need a pen in hand to copy by hand.', 'no-pen');
    const out = await pen.copyOnto(from, onto, giver);
    if (!out.ok) return this.refuse(context, 'act.deed', out.line, out.reason);
    MessageApi.scene(giver).topic('act.deed').toSelf(Mml.text(out.line))
      .toPeers(Mml.compose`${Mml.actor(giver)} copies something out by hand, pen scratching.`).send();
  }
}
