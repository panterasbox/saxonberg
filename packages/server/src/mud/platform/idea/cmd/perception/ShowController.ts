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
import { Release } from '../../../../lib/press/Release';

const TOPIC = 'act.deed';

interface ShowModel extends CommandModel {
  what: string;
  screen?: MqlOneResult;
}

interface Found {
  path: string;
  title: string;
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
    const found = await this.find(giver, wanted);
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

  /**
   * The document `reader` may call up by `word`: the newest standing release
   * (an in-game reader is a member: `members` and `public` both read — the
   * press room's `public` filter is the anonymous web's) whose headline or
   * publisher answers to it, else a paper of their
   * own whose title does. Never a search of anyone else's papers.
   */
  private async find(reader: Stuff, word: string): Promise<Found | null> {
    const releases = (await DocumentApi.listOfKind('release'))
      .map((d) => Release.fromDocument(d))
      .filter((r) => !r.isRetracted() && Release.publishedByOwner(r))
      .filter((r) => r.getHeadline().toLowerCase().includes(word) || r.owner.toLowerCase().includes(word))
      .sort((a, b) => b.getPublishedAt() - a.getPublishedAt());
    const release = releases[0];
    if (release !== undefined) return { path: release.getPath(), title: `"${release.getHeadline()}"` };

    const key = (reader.getIdentityPath() ?? '').split('/').filter(Boolean).pop() ?? '';
    if (key === '') return null;
    for (const d of await DocumentApi.list(`/home/${key}/`)) {
      const pages = await DocumentApi.pagesOf(d.getPath());
      if (pages !== null && pages.title.toLowerCase().includes(word)) return { path: d.getPath(), title: pages.title };
    }
    return null;
  }
}
