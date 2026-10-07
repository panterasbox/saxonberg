/**
 * DrainController — `drain [<vessel>]`.
 *
 * ⭐⭐⭐ The act that inverts a hazard. Firedamp is the one thing in this
 * trade that can be taken rather than merely survived, and taking it is
 * both the remedy (the heading becomes workable) and the product (a
 * charge of burnable gas, which is what a town's supply is made of).
 *
 * ⚠ Every refusal here is somebody else's answer, not this controller's:
 * whether gas stands in this working is the GROUND's, and whether a
 * vessel will hold it is the VESSEL's — a gas's required closure derives
 * from its boiling point.
 */

import { MiningActController } from './MiningActController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import { MqlApi, type MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { Working, DrainOutcome } from '../../../lib/Working';

/** Reference time to pipe a charge off a face, in game ms. */
const DRAIN_MS = 30000;
/** Metabolic watts of working a hand pump. */
const DRAIN_EFFORT_W = 600;

interface DrainModel extends CommandModel {
  vessel?: MqlOneResult;
}

/** The refusal sentence for each reason — and each names what lifts it. */
function refusalFor(reason: Exclude<DrainOutcome, { ok: true }>['reason']): string {
  switch (reason) {
    case 'no-gas':
      return 'There is nothing standing in the air here to draw off.';
    case 'no-vessel':
      return 'You have nothing that would hold it.';
    case 'not-sealed':
      return 'It will not stay in that — gas wants a sealed vessel, shut.';
    case 'no-room':
      default:
      return 'There is no room left in it.';
  }
}

export default class DrainController extends MiningActController<DrainModel> {
  async execute(model: DrainModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const working = this.workingOf(giver);
    if (!working) {
      this.decline(
        context,
        Mml.compose`There is nothing here to drain.`,
        'not-a-working',
      );
      return;
    }
    // ⚠⚠⚠ **A bound arg is an `MqlOneResult`, never a `Stuff`.** This
    // read `model.vessel?.stuff`, and the LIVE drive is what caught it:
    // `.stuff` is populated only for an ALREADY-RESOLVED match, so a
    // vessel that arrived as a raw word (`drain bladder`) or out of the
    // arg's own `default:` (`me:i:[mixin.BulkableMixin]`, what bare
    // `drain` uses) was still an unresolved selector and came through as
    // `null`. `drain` therefore declined *"You have nothing that would
    // hold it."* for every player, carrying anything, always — the one
    // act in the trade that inverts a hazard could not be performed.
    //
    // `MqlApi.effectiveTarget` is the accessor that RESOLVES the
    // selector and narrows in one step, and it is what every other
    // controller in this build uses. This is the antipattern that once
    // shipped eighteen verbs permanently declining; the wire checkpoint
    // could not see it because it accepted `no-vessel` as one of the
    // reasons a refusal was allowed to carry.
    const vessel = model.vessel
      ? MqlApi.effectiveTarget(model.vessel, (s): s is Stuff =>
          MixinApi.isBulkable(s),
        )
      : null;
    if (vessel === null || !MixinApi.isBulkable(vessel)) {
      this.decline(
        context,
        Mml.compose`${refusalFor('no-vessel')}`,
        'no-vessel',
      );
      return;
    }

    this.engageAct(context, {
      durationMs: DRAIN_MS,
      effortW: DRAIN_EFFORT_W,
      beginSelf: Mml.compose`You set the pipe into the face and work the pump.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} starts drawing off the face.`,
      // ⚠⚠ A free function, never `this.<method>`: a controller is one
      // ephemeral clone per execution, destructed the moment `execute`
      // returns, and an engaged act completes long after. The shore act
      // learnt this by driving — the timber went in and the cell was
      // never promoted.
      onComplete: () => {
        void finishDrain(context, working, vessel as unknown as Stuff);
      },
    });
  }
}

/** Draw the charge, and say what came off. */
async function finishDrain(
  context: CommandContext,
  working: Working,
  vessel: Stuff,
): Promise<void> {
  // ⚠⚠ The actor may be GONE — an engaged act completes long after
  // dispatch and a player can log out mid-pump, at which point
  // `Mml.actor(giver)` renders `undefined` and the composer throws an
  // unhandled rejection. (It did, for `shore`.)
  if (context.commandGiver.isDestroyed()) return;
  const giver = context.commandGiver;
  const outcome = await working.drain(vessel);
  if (!outcome.ok) {
    const detail = refusalFor(outcome.reason);
    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(Mml.compose`${detail}`)
      .send();
    context.note({
      kind: 'controller-rejected',
      reason: outcome.reason,
      detail,
    });
    return;
  }
  MessageApi.scene(giver)
    .topic('act.deed')
    .toSelf(
      Mml.compose`The pump sucks and ${Mml.thing(vessel)} swells. The air in here is better for it.`,
    )
    .toPeers(
      Mml.compose`${Mml.actor(giver)} draws a charge of ${outcome.material} off the face.`,
    )
    .send();
  if (MixinApi.isAdvancing(giver)) {
    await giver.creditDeed({
      discipline: 'mining',
      difficulty: 'standard',
      outcome: 'success',
    });
  }
}
