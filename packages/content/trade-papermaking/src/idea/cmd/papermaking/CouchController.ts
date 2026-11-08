/**
 * CouchController — `couch <mould> [on <post>]` (paper W2). Dumb: the mould
 * decides (`PaperMould.couchOnto`); with no post named, the view's default
 * binds the press in reach.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import PaperMould from '../../../thing/PaperMould';

const TOPIC = 'act.deed';

interface CouchModel extends CommandModel {
  mould: MqlOneResult;
  post?: MqlOneResult;
}

export default class CouchController extends CommandController<CouchModel> {
  async execute(model: CouchModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const mould = model.mould?.stuff ?? null;
    if (!(mould instanceof PaperMould)) {
      return this.refuse(context, TOPIC, mould === null ? 'Couch what?' : `${mould.getPresentation()} is not a paper mould.`, 'not-a-mould');
    }
    const post: Stuff | null = model.post?.stuff ?? null;
    if (post === null) return this.refuse(context, TOPIC, 'There is no post here to couch onto — no press, no board.', 'no-post');
    const out = mould.couchOnto(post);
    if (!out.ok) return this.refuse(context, TOPIC, out.line, out.reason);
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.text(out.line))
      .toPeers(Mml.compose`${Mml.actor(giver)} couches a wet sheet onto ${Mml.thing(post)}.`)
      .send();
  }
}
