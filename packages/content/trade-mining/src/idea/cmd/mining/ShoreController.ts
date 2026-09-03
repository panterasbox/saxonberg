/**
 * ShoreController — `shore [<timber>]`.
 *
 * Two things happen, and the second is the design:
 *
 *  1. a timber set you are carrying is **stood in the working**, where
 *    `Working.supportHere` will count it, condition-weighted, from then
 *    on;
 *  2. ⭐ **the cell is promoted from Provisional to Held.**
 *
 * > **Shoring is this mine's provisioning act.**
 *
 * Provisional ground was never a member — it is the commons you are
 * cutting into, and it reverts because you never secured it. Shoring is
 * literally what admits a cell to the holding, which is why *"a carved
 * working persists if and only if it is shored"* needs no separate
 * bookkeeping: the act that makes the ground safe is the act that writes
 * the record.
 *
 * ⚠ No deed gate. Setting timber is labour.
 */

import { MiningActController, MINING_TOPIC } from './MiningActController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import type MineWarren from '../../MineWarren';
import type { Working } from '../../../lib/Working';

/** Reference time to set one timber, in game ms. */
const SHORE_MS = 20000;
/** Endurance setting timber costs, in percentage points. */
const SHORE_COST = 8;

interface ShoreModel extends CommandModel {
  timber?: MqlOneResult;
}

export default class ShoreController extends MiningActController<ShoreModel> {
  async execute(model: ShoreModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const working = this.workingOf(giver);
    if (!working) {
      this.decline(context, Mml.compose`There is nothing here to shore.`, 'not-a-working');
      return;
    }
    const set = this.findTimber(giver, model.timber?.stuff ?? null);
    if (!set) {
      this.decline(
        context,
        Mml.compose`You have no timber to set. Buy a set at the provisioning shed.`,
        'no-timber',
      );
      return;
    }

    const room = working as unknown as Stuff & Container;
    this.engageAct(context, {
      durationMs: SHORE_MS,
      cost: SHORE_COST,
      beginSelf: Mml.compose`You wrestle ${Mml.thing(set)} into place under the back.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} starts setting timber.`,
      // ⚠⚠ A free function, never `this.<method>`: a controller is one
      // ephemeral clone per execution, destructed the moment `execute`
      // returns, and an engaged act completes long after. A completion
      // calling back into it ran on a destroyed Stuff and the proxy
      // answered with a silent no-op — the timber went in, the prose
      // printed, and the cell was never promoted. Found by driving.
      onComplete: () => {
        void standTimber(context, working, room, set);
      },
    });
  }

  /** The named set, else the first `timber-set` tool the actor is carrying. */
  private findTimber(giver: Stuff, named: Stuff | null): Stuff | null {
    if (named) return isTimberSet(named) ? named : null;
    if (!MixinApi.isContainer(giver)) return null;
    return giver.getContents().find((i) => isTimberSet(i)) ?? null;
  }
}

/**
 * Stand the timber, promote the cell, and say what changed.
 *
 * ⚠⚠ A module function rather than a method — by the time it runs the
 * controller that scheduled it has been destructed.
 */
async function standTimber(
  context: CommandContext,
  working: Working,
  room: Stuff & Container,
  set: Stuff,
): Promise<void> {
  // ⚠⚠ **The actor may be GONE.** An engaged act completes long after
  // dispatch, and a player can log out mid-swing — at which point
  // `Mml.actor(giver)` renders `undefined` and the scene composer throws
  // an UNHANDLED REJECTION that takes the process down. (It did.) A
  // completion is the one place in a controller where the actor is not
  // guaranteed, so it is the one place that has to check.
  //
  // ⭐ Returning is the honest answer, not narrating to nobody: the
  // engagement was the actor's, and *a barge-in leaves the rock
  // standing* is already the rule for an interrupted cut.
  if (context.commandGiver.isDestroyed()) return;
    const giver = context.commandGiver;
    if ((set as unknown as Containable).getContainer() !== room) {
      ContainmentApi.move(set as unknown as Stuff & Containable, room as never);
    }

    // ⭐ The promotion. A working with no warren is already Spine —
    // authored ground does not need admitting, and saying so is more
    // honest than pretending the act did nothing.
    const warren = (working as unknown as { getWarren?(): unknown }).getWarren?.() as
      | MineWarren
      | null;
    let promoted = false;
    if (warren && typeof warren.promote === 'function') {
      promoted = warren.promote(working.getCell(), giver.getTemplatePath() ?? null);
      if (promoted && MixinApi.isPersistable(room)) {
        // Held ground survives a restart WITH its contents — so write the
        // record now, at the moment it became worth keeping.
        await PersistableApi.restoreOrSeed(room, warren.memberKeyOf(working.getCell()));
        await PersistableApi.capture(room, warren.memberKeyOf(working.getCell()));
      }
    }

    const after = await working.stabilityAt();
    MessageApi.scene(giver)
      .topic(MINING_TOPIC)
      .toSelf(
        promoted
          ? Mml.compose`The timber takes the weight. This working is yours now — it will still be here when you come back.`
          : after.state === 'sound'
            ? Mml.compose`The timber takes the weight, and the back goes quiet.`
            : Mml.compose`The timber takes some of the weight. It is not enough yet.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} sets timber under the back.`)
      .send();
  }

/** A timber set is whatever affords the `timber-set` tool capability. */
function isTimberSet(item: Stuff): boolean {
  return MixinApi.isTool(item) && item.hasCapability('timber-set');
}
