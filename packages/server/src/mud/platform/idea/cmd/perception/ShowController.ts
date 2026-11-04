/**
 * ShowController — `show <what> on <screen>` (paper D5): put a document on
 * a screen, LIVE. The screen (`DisplayMixin`) decides whether you may drive
 * it and whether it shows documents; this verb finds the document the
 * reader may call up — a release they may read, a paper of their own — and
 * hands the screen a `document` source.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Display } from '../../../../lib/display/Display';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { DocumentApi } from '../../../../api/document';
import { Mml } from '../../../../api/mml';

const TOPIC = 'act.deed';

interface ShowModel extends CommandModel {
  what: string;
  screen?: MqlOneResult;
}

export default class ShowController extends CommandController<ShowModel> {
  async execute(model: ShowModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const named = model.screen?.stuff ?? null;
    if (model.screen !== undefined && named === null) {
      return this.refuse(context, TOPIC, `You see no ${model.screen.raw} to show it on.`, 'no-screen');
    }
    let screen: (Stuff & Display) | null = null;
    if (named !== null) {
      if (!MixinApi.isDisplay(named)) return this.refuse(context, TOPIC, `${named.getPresentation()} is not a screen.`, 'not-a-screen');
      screen = named;
    } else {
      screen = (await this.resolveScreen(giver))?.display ?? null;
    }
    if (screen === null) return this.refuse(context, TOPIC, 'You have no screen to hand to show it on.', 'no-screen');
    if (!(await screen.mayDrive(giver))) {
      return this.refuse(context, TOPIC, `${screen.getPresentation()} is not yours to work.`, 'may-not-drive');
    }
    const wanted = (model.what ?? '').trim().toLowerCase();
    if (wanted === '') return this.refuse(context, TOPIC, 'Show what?', 'nothing-named');
    const found = await DocumentApi.callUp(giver, wanted);
    if (found === null) {
      return this.refuse(context, TOPIC, `You can call up nothing called "${model.what}".`, 'no-document');
    }
    const source = { kind: 'document' as const, path: found.path, title: found.title };
    if (!screen.acceptsSource(source)) {
      return this.refuse(context, TOPIC, `${screen.getPresentation()} does not show papers.`, 'screen-refuses');
    }
    screen.show(source);
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`${Mml.thing(screen)} shows ${found.title}. \`read\` it to read it.`)
      .send();
  }
}
