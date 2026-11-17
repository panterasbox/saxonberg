/**
 * ProvisionController — the `provision <player>` verb (a Duncan Hall
 * *content* verb — it lives in the content namespace
 * `world/terminus/eternal/duncan-hall/`, NOT a core command category,
 * because it names one content instance's `DormWarren`). The landlord act
 * that grows the elastic dorm building.
 *
 * ⭐ **The let is the warren's** (controller-liquidity W13):
 * `DormWarren.let(by, tenant, {theme})` — the residence pack's
 * `LettingWarren` sequence — decides who may let (staff of the college,
 * i.e. Katie's `hall-manager` job, or the hall's committee; never "a member
 * of the landlord group": an NPC is never on a committee), refuses a
 * double-provision and a full hall, mints the unit at the lowest free slot,
 * grants it, stamps the domicile, keys it, hangs the door and sets the
 * move-in style. This controller tells the answer.
 *
 * The view carries no credential check: letting a room is a SEAT's act
 * (Katie's dialogue `dispatch` forces this verb), and a co-located player
 * who types the raw verb is refused with the seat named — the refusal is
 * the progression UI.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { LetAnswer } from '@saxonberg/content-residence/src/lib/LettingWarren';
import DormWarren from '../DormWarren';

const TOPIC = 'act.deed';

interface ProvisionModel extends CommandModel {
  player?: MqlOneResult;
  theme?: string;
}

export default class ProvisionController extends CommandController<ProvisionModel> {
  async execute(model: ProvisionModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver as Stuff;
    const target = model.player?.stuff ?? null;
    // An unbound name is the warren's to refuse — after who may let (finalize).
    const warren = await StuffApi.singleton<DormWarren>(DormWarren.WARREN_PATH);
    const answer = await warren.let(actor, target, { theme: model.theme });
    const who = target?.getPresentation() ?? target?.getIdentityPath() ?? 'them';
    if (!answer.ok) {
      return ProvisionController.fail(context, ProvisionController.refusalWords(answer, who), answer.reason);
    }
    MessageApi.scene(actor)
      .topic(TOPIC)
      .toSelf(Mml.compose`\nProvisioned ${answer.unitExtent} and leased it to ${who}; handed over the key.\n`)
      .send();
    // ⭐ The daypack (size and carrying D29): the warren decided where it
    // went; the newcomer is told in words.
    const told = ProvisionController.daypackWords(answer.daypack, actor.getPresentation());
    if (target && told) {
      MessageApi.scene(target).topic(TOPIC).toSelf(Mml.fromMarkup(`\n${told}\n`)).send();
    }
  }

  /** What the newcomer is told about their daypack. */
  protected static daypackWords(where: 'handed' | 'in-room' | 'granted' | 'none', giver: string): string | null {
    const who = giver.charAt(0).toUpperCase() + giver.slice(1);
    switch (where) {
      case 'handed':
        return `${who} hands you an Eternal U daypack. Every first-year gets one.`;
      case 'in-room':
        return `${who} has an Eternal U daypack for you, but you have nowhere to put it — it will be waiting in your room.`;
      case 'granted':
        // The body said where it went (its room, or at your feet).
        return `${who} has an Eternal U daypack for you, but you have nowhere to put it.`;
      case 'none':
        return null;
    }
  }

  /** What a refused let is told as. */
  protected static refusalWords(answer: Extract<LetAnswer, { ok: false }>, who: string): string {
    switch (answer.reason) {
      case 'no-owner':
        return 'The dorms wing has no owner to lease under.';
      case 'not-authorized':
        return "Only the college's staff or a member of the hall's committee may let Duncan Hall's rooms.";
      case 'no-player':
        return 'Provision a dorm for whom?';
      case 'already-housed':
        return `${who} already holds a dorm.`;
      case 'at-capacity':
        return answer.capacity !== undefined && answer.taken !== undefined && answer.taken >= answer.capacity
          ? `Duncan Hall is at capacity: ${answer.taken} of ${answer.capacity} rooms are taken.`
          : 'No free room slot.';
      case 'ascent-condition':
        return `${who} must put the home they already hold in order first.`;
    }
  }

  protected static fail(context: CommandContext, detail: string, reason: string): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(Mml.fromMarkup(`\n${detail}\n`)).send();
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}
