/**
 * TallyController — `tally <log>`.
 *
 * Adds one mark to a `CrossingLog`. Resolves a readable timepiece from
 * the ACTOR'S OWN carried/worn items (v1 fallback: a subset of the
 * eventual sight-scope model — your own open-lidded watch is trivially in
 * your own sight) and stamps the mark with its reading, or a bare untimed
 * tick when there's no readable timepiece (none present, lid shut, or the
 * watch stopped with the lid shut).
 *
 * `tally` OBSERVES, never manipulates — it reads whatever the timepiece
 * currently shows; it does not `open`/`wind`/`set` the actor's gear.
 * And it DISCARDS IDENTITY: the mark carries when, never who.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Container } from '../../../../lib/spatial/Container';
import type { Slotted } from '../../../../lib/slot/Slotted';
import type { MqlOneResult } from '../../../../api/mql';
import { MixinApi } from '../../../../api/mixin';
import { SlotApi } from '../../../../api/slot';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import CrossingLog from '../CrossingLog';

interface TallyModel extends CommandModel {
  target?: MqlOneResult;
}

export default class TallyController extends CommandController<TallyModel> {
  execute(model: TallyModel, ctx: CommandContext): void {
    const giver = ctx.commandGiver;
    const target = model.target;
    if (!target || target.stuff === null || target.stuff === undefined) {
      ctx.note({
        kind: 'empty-result',
        field: 'target',
        query: target?.raw ?? '',
      });
      MessageApi.scene(giver)
        .topic('act.deed')
        .toSelf(Mml.compose`Tally what?`)
        .send();
      return;
    }
    if (!(target.stuff instanceof CrossingLog)) {
      ctx.note({
        kind: 'controller-rejected',
        reason: 'not-a-log',
        detail: "can't tally that",
      });
      MessageApi.scene(giver)
        .topic('act.deed')
        .toSelf(Mml.compose`You can't tally that.`)
        .send();
      return;
    }
    const log = target.stuff;

    // v1 resolveReadableTimepiece(actor): the actor's own carried/worn
    // timepiece whose face reads right now. null → a bare untimed tick.
    const reading = resolveReadableTimepiece(giver as Stuff);

    // Append when, NEVER who. Identity is available here and deliberately
    // discarded — see CrossingLog's loud data-model comment.
    log.addMark(reading);

    const stamp =
      reading === null
        ? Mml.compose`You add an untimed tick to ${Mml.thing(log as unknown as Stuff)}.`
        : Mml.compose`You glance at the time and mark ${Mml.thing(log as unknown as Stuff)}.`;
    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(stamp)
      .toPeers(
        Mml.compose`${Mml.actor(giver)} makes a mark on ${Mml.thing(log as unknown as Stuff)}.`,
      )
      .send();
  }
}

/**
 * v1 fallback: scan the actor's own carried/worn items for a `Timekeeping`
 * thing whose face reads right now, returning its minute-of-day reading or
 * `null` when none is readable. Folded into the controller (not a
 * free-floating helper) per the no-helper convention; swap in the
 * sight-scope resolver when scope-modality lands (same call site).
 */
function resolveReadableTimepiece(giver: Stuff): number | null {
  for (const item of carriedAndWorn(giver)) {
    if (MixinApi.isTimekeeping(item)) {
      const reading = item.currentReading();
      if (reading !== null) return reading.minutes;
    }
  }
  return null;
}

/** The actor's own carried (inventory) plus worn/wielded (slotted) items. */
function carriedAndWorn(giver: Stuff): Stuff[] {
  const out: Stuff[] = [];
  if (MixinApi.isContainer(giver)) {
    out.push(
      ...((giver as Stuff & Container).getContents() as Stuff[]),
    );
  }
  if (MixinApi.isSlotted(giver)) {
    SlotApi.walkOccupants(giver as Stuff & Slotted, (_h, _s, occupant) => {
      out.push(occupant as unknown as Stuff);
    });
  }
  return out;
}
