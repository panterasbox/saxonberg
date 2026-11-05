/** ComposeController — `compose <document> in <forme>`. Dumb: the forme decides. */
import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { DocumentApi } from '@saxonberg/server/mud/api/document';
import Forme from '../../../thing/Forme';

interface Model extends CommandModel { what: string; forme: MqlOneResult; }

export default class ComposeController extends CommandController<Model> {
  async execute(model: Model, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const forme = model.forme?.stuff ?? null;
    if (!(forme instanceof Forme)) return this.refuse(context, 'act.deed', 'Set it in what? Name the forme.', 'not-a-forme');
    const doc = await DocumentApi.callUp(giver, model.what ?? '');
    if (doc === null) return this.refuse(context, 'act.deed', `You have no copy called "${model.what}" to set.`, 'no-document');
    const out = await forme.compose(doc.path, doc.title, giver);
    if (!out.ok) return this.refuse(context, 'act.deed', out.line, out.reason);
    MessageApi.scene(giver).topic('act.deed').toSelf(Mml.text(out.line))
      .toPeers(Mml.compose`${Mml.actor(giver)} sets type from the case, quick fingers in the boxes.`).send();
  }
}
