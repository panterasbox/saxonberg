/**
 * LeaseController — the `lease <player>` verb (a Mayfield Row *content*
 * verb: it names Seznick House). The landlord act one rung up the ladder
 * from the dorm's `provision`: the unit comes EMPTY (built-ins only, D9),
 * and the ASCENT GATE (P10) reads the condition of what the tenant already
 * holds.
 *
 * ⭐ **The let is the building's** (controller-liquidity W13):
 * `BuildingWarren.let(by, tenant)` — the residence pack's `LettingWarren`
 * sequence — asks who may let (the `agent` position at Mayfield Holdings —
 * Walter's job — or the building's committee; never "a member of the
 * landlord group": an NPC is never on a committee), refuses a second flat
 * here, the ascent gate and a full house, then mints the unit at the lowest
 * free slot, grants it, stamps the domicile and keys it. Who lets, the
 * domicile and the unit branch are authored on the building row. This
 * controller tells the answer.
 */

import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type BuildingWarren from '@saxonberg/content-residence/src/idea/BuildingWarren';
import type { LetAnswer } from '@saxonberg/content-residence/src/lib/LettingWarren';

const TOPIC = 'act.deed';

/** Seznick House's building row — the warren that lets its flats. */
export const BUILDING_PATH = '/world/terminus/mayfield-row/seznick-house/building';

interface LeaseModel extends CommandModel {
  player?: MqlOneResult;
}

export default class LeaseController extends CommandController<LeaseModel> {
  async execute(model: LeaseModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver as Stuff;
    const building = await StuffApi.singleton<BuildingWarren>(BUILDING_PATH).catch(() => null);
    if (!building) {
      return LeaseController.fail(context, 'The house ledger is not standing.', 'no-building');
    }
    const target = model.player?.stuff ?? null;
    // An unbound name is the warren's to refuse — after who may let (finalize).
    const answer = await building.let(actor, target);
    const who = target?.getPresentation() ?? target?.getIdentityPath() ?? 'them';
    if (!answer.ok) {
      return LeaseController.fail(context, LeaseController.refusalWords(answer, who), answer.reason);
    }
    MessageApi.scene(actor)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`\nLet ${answer.unitExtent} to ${who}; the flat comes empty, and the key is theirs.\n`,
      )
      .send();
  }

  /** What a refused let is told as. */
  protected static refusalWords(answer: Extract<LetAnswer, { ok: false }>, who: string): string {
    switch (answer.reason) {
      case 'no-owner':
        return 'Seznick House has no owner of record to lease under.';
      case 'not-authorized':
        return "Only the letting agency's staff or a member of the building's committee may let Seznick House's rooms.";
      case 'no-player':
        return 'Lease a flat to whom?';
      case 'already-housed':
        return `${who} already holds a flat here.`;
      case 'ascent-condition':
        return (
          `Walter taps the letting board and doesn't move a tab: the home ` +
          `you already hold (${answer.ascent?.leaf ?? ''}) is ${answer.ascent?.band ?? ''}. Put it right first.`
        );
      case 'at-capacity':
        return answer.capacity !== undefined && answer.taken !== undefined && answer.taken >= answer.capacity
          ? `Seznick House is full: ${answer.taken} of ${answer.capacity} units are taken.`
          : 'No free unit slot.';
    }
  }

  protected static fail(context: CommandContext, detail: string, reason: string): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(Mml.fromMarkup(`\n${detail}\n`)).send();
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}
