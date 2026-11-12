/**
 * UnleaseController — the `unlease <player>` verb: end a Seznick House
 * lease and reclaim the unit (residences D9/D16).
 *
 * ⭐ **The end of the let is the building's** (controller-liquidity W13):
 * `BuildingWarren.endLet(by, tenant)` — the residence pack's
 * `LettingWarren` sequence — asks who may (the agency's staff or the
 * building's committee), sends the tenant's owned goods to STORAGE (intact,
 * titled, recoverable — never destructed), steps any occupant out to the
 * landing, reverts the shell whole, clears every record under the unit and
 * retires its row (the keyway dies with it: the old key is dead metal until
 * a new lease mints a fresh one).
 */

import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type BuildingWarren from '@saxonberg/content-residence/src/idea/BuildingWarren';
import { BUILDING_PATH } from './LeaseController';

const TOPIC = 'act.deed';

const NOT_AUTHORIZED =
  "Only the letting agency's staff or a member of the building's committee may end Seznick House leases.";

interface UnleaseModel extends CommandModel {
  player?: MqlOneResult;
}

export default class UnleaseController extends CommandController<UnleaseModel> {
  async execute(model: UnleaseModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver as Stuff;
    const building = await StuffApi.singleton<BuildingWarren>(BUILDING_PATH).catch(() => null);
    if (!building) {
      return UnleaseController.fail(context, NOT_AUTHORIZED, 'not-authorized');
    }
    const target = model.player?.stuff ?? null;
    if (!target) {
      if (!(await building.mayLetFor(actor))) {
        return UnleaseController.fail(context, NOT_AUTHORIZED, 'not-authorized');
      }
      return UnleaseController.fail(context, 'End whose lease?', 'no-player');
    }
    const answer = await building.endLet(actor, target);
    if (!answer.ok) {
      const who = target.getPresentation() ?? target.getIdentityPath() ?? 'They';
      const detail =
        answer.reason === 'not-authorized'
          ? NOT_AUTHORIZED
          : answer.reason === 'not-housed'
            ? `${who} doesn't hold a flat here.`
            : 'End whose lease?';
      return UnleaseController.fail(context, detail, answer.reason);
    }
    MessageApi.scene(actor)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`\nEnded the lease on ${answer.unitExtent}; the tenant's goods are in storage, the flat reverts, and its slot is free.\n`,
      )
      .send();
  }

  protected static fail(context: CommandContext, detail: string, reason: string): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(Mml.fromMarkup(`\n${detail}\n`)).send();
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}
