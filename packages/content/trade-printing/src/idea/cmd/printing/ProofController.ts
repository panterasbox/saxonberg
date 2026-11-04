/** ProofController — `proof <forme>` (paper D17). Dumb: the forme decides. */
import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import Forme from '../../../thing/Forme';

interface Model extends CommandModel { forme: MqlOneResult; }

export default class ProofController extends CommandController<Model> {
  async execute(model: Model, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const forme = model.forme?.stuff ?? null;
    if (!(forme instanceof Forme)) return this.refuse(context, 'act.deed', 'Proof what? Name the forme.', 'not-a-forme');
    const out = await forme.proof(giver);
    if (!out.ok) return this.refuse(context, 'act.deed', out.line, out.reason);
    MessageApi.scene(giver).topic('act.deed').toSelf(Mml.text(out.line)).send();
  }
}
