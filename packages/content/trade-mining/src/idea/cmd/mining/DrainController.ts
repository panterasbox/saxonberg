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
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
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
    // ⚠ `.stuff` is the right read here, and the fire build's sweep is
    // why this comment exists. The live drive saw `drain` refuse *"You
    // have nothing that would hold it."* with two bladders in hand and
    // blamed THIS line, swapping in `MqlApi.effectiveTarget`. That was a
    // misdiagnosis: `effectiveTarget` returns `value.stuff` when it
    // satisfies the predicate and otherwise a DOOR reached via an exit,
    // so for a vessel the two reads are equivalent — it could not have
    // been the fix. The real cause was `DetailedMixin.details`, a
    // bare-`persistent` Map that hydrated as a plain object on a warm
    // database and threw inside MQL resolution, so the vessel never
    // bound at all. ⭐ `effectiveTarget` earns its place where a
    // DIRECTION may stand for a door (`open north`); a bladder is never
    // a door, and `.stuff` is the house style for a plain object arg.
    const vessel = model.vessel?.stuff ?? null;
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
