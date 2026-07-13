/**
 * BlowController — `blow [<whistle>]`.
 *
 * Blows an `Audible` whistle the actor is carrying or wearing: resolves
 * the whistle (the named/reachable object if given, else the first
 * Audible in the actor's own inventory or worn slots) and calls
 * `emit(...)` — one fixed ~110 dB blast. `Audible.emit` resolves the
 * whistle up to its enclosing room, so a carried whistle propagates from
 * the room, not the hand. Refuses when the actor holds nothing to blow.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Slotted } from '../../../lib/slot/Slotted';
import type { Audible } from '../../../lib/perception/Audible';
import type { MqlOneResult } from '../../../api/mql';
import { MixinApi } from '../../../api/mixin';
import { ContainmentApi } from '../../../api/containment';
import { SlotApi } from '../../../api/slot';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';

interface BlowModel extends CommandModel {
  target?: MqlOneResult;
}

/** Gus's whistle blast is a fixed, clean ~110 dB (no breath/skill model). */
const WHISTLE_DB = 110;

export default class BlowController extends CommandController<BlowModel> {
  execute(model: BlowModel, ctx: CommandContext): void {
    const giver = ctx.commandGiver;
    const whistle = resolveWhistle(giver as Stuff, model.target);
    if (!whistle) {
      ctx.note({
        kind: 'controller-rejected',
        reason: 'no-whistle',
        detail: 'no whistle to blow',
      });
      MessageApi.scene(giver)
        .topic('world.narration.action')
        .toSelf(Mml.compose`You have no whistle to blow.`)
        .send();
      return;
    }

    // Actor-facing acknowledgement; the heard event fans out to the room
    // (and adjacent rooms) via Audible.emit's own Scene.
    MessageApi.scene(giver)
      .topic('world.narration.action')
      .toSelf(
        Mml.compose`You raise ${Mml.object(whistle as unknown as Stuff)} and blow a sharp blast.`,
      )
      .send();

    whistle.emit({
      db: WHISTLE_DB,
      character: 'whistle',
      description: 'a sharp whistle',
      timbreHook: 'rough trill',
    });
  }
}

/**
 * Resolve the whistle to blow: the named/reachable Audible if one was
 * given, otherwise the first Audible in the actor's own inventory or worn
 * slots. Folded into the controller (not a free-floating helper) — the
 * device verbs' shared resolution shape.
 */
function resolveWhistle(
  giver: Stuff,
  target: MqlOneResult | undefined,
): (Stuff & Audible) | null {
  if (target && target.stuff) {
    const s = target.stuff as Stuff;
    return MixinApi.isAudible(s) ? s : null;
  }
  if (target && target.stuff !== null && target.stuff !== undefined) {
    return null;
  }
  for (const item of carriedAndWorn(giver)) {
    if (MixinApi.isAudible(item)) return item;
  }
  return null;
}

/** The actor's own carried (inventory) plus worn/wielded (slotted) items. */
function carriedAndWorn(giver: Stuff): Stuff[] {
  const out: Stuff[] = [];
  if (MixinApi.isContainer(giver)) {
    out.push(...(ContainmentApi.getContents(giver as Stuff & Container) as Stuff[]));
  }
  if (MixinApi.isSlotted(giver)) {
    SlotApi.walkOccupants(giver as Stuff & Slotted, (_h, _s, occupant) => {
      out.push(occupant as unknown as Stuff);
    });
  }
  return out;
}
