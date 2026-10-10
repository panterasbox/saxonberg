/**
 * BailController — `bail`, ⭐⭐⭐ **the pre-pump lift, and the reason
 * brine is work rather than a tap.**
 *
 * A leather bucket on the end of the rope, down a hundred metres and
 * back, twelve litres at a time. It is how every well on earth worked
 * before there was a pump, and it does two jobs at once — which is why
 * it is one verb:
 *
 *  1. ⭐ **It clears the hole so it can go deeper.** A bit swimming in
 *     standing water cuts nothing; you bail, then you cut. That is the
 *     real reason a bailer is on the rig from the first yard, long
 *     before there is anything worth lifting — and it is why `bail` is
 *     not a Stage-C verb that arrives with the oil.
 *  2. **It brings up what is standing.** Cuttings early, water in the
 *     middle, and eventually the thing you came for.
 *
 * ## ⭐⭐ The answer, and who gets credited for it
 *
 * The bail that first brings up the body — or first brings up nothing at
 * the depth the survey promised — is **the answer to the bet**, and it
 * credits `geology` *hard* either way, with `outcome: 'success'` either
 * way. Judgment was exercised and the world answered; a dry hole is not
 * a failed roll, it is a fact somebody paid for and now owns.
 *
 * ⚠ **The pump's attach point is `Wellhead.liftL()`** — one number and
 * one act. A mechanism that raises it is the pump build; a mechanism
 * that turns bucket-at-a-time into a continuous rate is the same build,
 * and the second half is the part that matters.
 */

import { BulkableApi } from '@saxonberg/server/mud/api/bulk';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Bulkable } from '@saxonberg/server/mud/lib/bulk/Bulkable';
import {
  DrillingActController,
  ACT_TOPIC,
  type DrillingModel,
} from './DrillingActController';
import type Wellhead from '../../../thing/Wellhead';

/** ⚠ A bound arg is an `MqlOneResult`, never a `Stuff`. */
interface BailModel extends DrillingModel {
  vessel?: MqlOneResult;
}

/** The Discipline the ANSWER credits — the owner's judgment, resolved. */
const GEOLOGY = 'geology';
/** The Discipline the labour credits. */
const MINING = 'mining';

/** How long one trip down and back takes, in game-milliseconds. */
const BAIL_MS = 30_000;

/** Endurance one trip costs a fresh body, in percentage points. */
const BAIL_COST = 9;

export default class BailController extends DrillingActController<BailModel> {
  public async execute(
    model: BailModel,
    context: CommandContext,
  ): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const place = this.placeOf(giver);
    if (!place) {
      this.decline(context, Mml.compose`You are nowhere to bail anything out of.`, 'no-place');
      return;
    }
    if (this.derrickOf(model) === null) {
      this.noDerrick(context);
      return;
    }
    const hole = await this.wellheadOf(model);
    if (hole === null) {
      this.noHole(context);
      return;
    }

    const vessel = (model.vessel?.stuff ?? null) as Stuff | null;

    // ⚠ The vessel contract, refused BEFORE the act. The sentence is
    // `drain`'s and the reason is the same: a gas wants a sealed vessel,
    // shut. The act itself is `BulkableApi.transfer`, so the physics of
    // an under-closed vessel are the platform's — this refusal exists so
    // that a player is told before they spend the trip, not after.
    if (vessel !== null && !MixinApi.isBulkable(vessel)) {
      this.decline(
        context,
        Mml.compose`You cannot pour anything into that.`,
        'not-a-vessel',
      );
      return;
    }

    this.engageAct(context, {
      durationMs: BAIL_MS,
      cost: BAIL_COST,
      beginSelf: Mml.compose`You pay the rope out and let the bailer go down.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} lets the bailer down the hole.`,
      // ⚠⚠ A module function taking values. See the base's header.
      onComplete: () => {
        void completeBail(context, hole, vessel as (Stuff & Bulkable) | null);
      },
    });
  }
}

/** The trip, landed. ⚠ Runs long after the controller is a corpse. */
async function completeBail(
  context: CommandContext,
  hole: Wellhead,
  vessel: (Stuff & Bulkable) | null,
): Promise<void> {
  if (context.commandGiver.isDestroyed()) return;
  const giver = context.commandGiver as unknown as Stuff;
  const scene = MessageApi.scene(giver).topic(ACT_TOPIC);

  const body = await hole.bodyHere();
  const firstAnswer = hole.getDrawnL() <= 0 && hole.getSumpL() <= 0;
  const litres = await hole.lift();

  if (litres <= 0) {
    // ⭐⭐ **The dry hole, and the cuttings that are not nothing.** What
    // comes up is the rock the hole is cut through — which is exactly
    // what the log records and exactly what makes a dry hole worth
    // something to the next person who looks at this country.
    const sample = await hole.sampleAtDepth(hole.getDepthM());
    scene
      .toSelf(
        body === null
          ? Mml.compose`The bailer comes up with a yard of broken rock and a cupful of muddy water, and that is all there is down there. ${String(hole.getDepthM())} m.`
          : Mml.compose`The bailer comes up empty. Whatever is in this hole is not coming up fast enough to catch.`,
      )
      .send();
    void sample;
    // ⭐⭐⭐ The ANSWER is credited even when the answer is *no*. A dry
    // hole is a fact somebody paid for; the judgment was exercised and
    // the world answered, which is the definition of a successful read.
    if (firstAnswer && hole.getDepthM() > 0 && MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({
        discipline: GEOLOGY,
        difficulty: 'hard',
        outcome: 'success',
      });
    }
    return;
  }

  // Up at the wellhead now. Into the vessel, through the platform's own
  // transfer — so closure, gas escape and blending are all shipped
  // behaviour and this file implements none of them.
  let moved = 0;
  let escaped = false;
  if (vessel !== null) {
    // ⚠ `transfer` speaks in SLOTS, not holders — the one place a
    // controller has to know that, and the reason it does is that a
    // holder can have several (a lamp's reservoir, a still's pot).
    const from = BulkableApi.slotFor(hole as unknown as Stuff, undefined);
    const into = BulkableApi.slotFor(vessel, undefined);
    if (from !== null && into !== null) {
      // `lenient`: a cask with room for eight of the twelve takes eight
      // and says so, rather than refusing the whole bucketful.
      const outcome = BulkableApi.transfer(from, into, {
        kind: 'measure',
        litres,
        mode: 'lenient',
      });
      moved = outcome.applied;
      escaped = outcome.status === 'escaped';
    }
  }

  const what = (await hole.bodyHere())?.key ?? 'what is down there';
  if (vessel === null) {
    scene.toSelf(
      Mml.compose`The bailer comes up heavy and you tip it into the trough at the wellhead. Bring something to put it in.`,
    );
  } else if (escaped) {
    scene.toSelf(
      Mml.compose`It will not stay in that — gas wants a sealed vessel, shut. It goes up into the air around you and is gone.`,
    );
  } else {
    scene.toSelf(
      Mml.compose`${String(Math.round(moved))} litres out of the hole and into it. ${describe(what)}`,
    );
  }
  scene.send();

  if (firstAnswer && MixinApi.isAdvancing(giver)) {
    await giver.creditDeed({
      discipline: GEOLOGY,
      difficulty: 'hard',
      outcome: 'success',
    });
  }
  if (MixinApi.isAdvancing(giver)) {
    await giver.creditDeed({
      discipline: MINING,
      difficulty: 'standard',
      outcome: 'success',
    });
  }
}

/** What came up, in the words a driller would use. */
function describe(bodyKey: string): string {
  return bodyKey === 'what is down there'
    ? 'Whatever it is, there is more of it than there was.'
    : 'You taste it off your knuckle before you think about it, which is how everybody finds out.';
}
