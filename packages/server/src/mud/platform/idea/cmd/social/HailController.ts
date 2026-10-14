/**
 * HailController — `hail <contact>`: a directed act at something in sight
 * on the SIGNAL channel (maritime D22).
 *
 * ⛔ Not `shout`, the acoustic verb — a hail at twelve miles is flags, a
 * lamp or a gun, at a range that does not care how high you stand. The
 * contact resolves by name against what the signal channel can reach
 * (never through MQL — it is not in the room). A real craft has the hail
 * delivered to everyone aboard her; seeded traffic answers in kind.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { MixinApi } from '../../../../api/mixin';
import { WorldClockApi } from '../../../../api/worldclock';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { ExpanseApi } from '../../../../api/expanse';
import type { Positioned } from '../../../../lib/expanse/Positioned';
import type { Voyaging } from '../../../../lib/expanse/Voyaging';

interface HailModel extends CommandModel {
  contact?: string;
}

export default class HailController extends CommandController<HailModel> {
  async execute(model: HailModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const craft = await this.craftOf(giver);
    if (craft === null) {
      return this.decline(context, 'You are not aboard anything to hail from.', 'not-aboard');
    }
    const expanse = await craft.liveExpanse();
    const asked = (model.contact ?? '').trim().toLowerCase().replace(/^the\s+/, '');
    if (expanse === null || asked === '') {
      return this.decline(context, 'Hail whom? Name a sail in sight.', 'no-contact');
    }
    const hour = Math.floor(WorldClockApi.getNow().rawValue() / 3600);
    const contacts = await expanse.contactsFrom(craft, giver, 'signal', hour);
    const contact = contacts.find((c) => c.name.toLowerCase().includes(asked));
    if (!contact) {
      return this.decline(context, `Nothing in sight answers to '${model.contact}'.`, 'not-in-sight');
    }
    const ours = MixinApi.isNamed(craft) ? craft.getName() : 'a sail';
    this.say(giver, `You hail ${contact.name}.`);
    if (contact.craft === null) {
      this.say(giver, 'She dips her colours in answer and stands on.');
      return;
    }
    const aboard: Stuff[] = MixinApi.isVoyaging(contact.craft) ? await contact.craft.aboard() : [];
    for (const who of aboard) this.say(who, `${ours} is hailing you.`);
    if (aboard.length === 0) this.say(giver, 'Nobody answers.');
  }

  private say(who: Stuff, text: string): void {
    if (!MixinApi.isSensor(who)) return;
    MessageApi.scene(who).topic('speech.comms').toSelf(Mml.fromMarkup(text)).send();
  }

  /** The craft the giver is aboard — their root container's craft. */
  private async craftOf(giver: Stuff): Promise<(Stuff & Positioned & Voyaging) | null> {
    const root = MixinApi.isContainable(giver) ? giver.getRootContainer() ?? giver : giver;
    const craft = await ExpanseApi.craftAt(root.getTemplatePath() ?? '');
    return craft && MixinApi.isVoyaging(craft) ? craft : null;
  }

  private decline(context: CommandContext, text: string, reason: string): void {
    MessageApi.scene(context.commandGiver).topic('shell.result').toSelf(Mml.fromMarkup(text)).send();
    context.note({ kind: 'controller-rejected', reason, detail: text });
  }
}
