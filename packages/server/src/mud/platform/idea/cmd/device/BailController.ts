/**
 * BailController — `bail`: ⭐ fill a bucket, lift it, tip it (harbors P21;
 * review 1).
 *
 * ⭐⭐ **The bucket act over ANY {@link LiftSource}** — pump.md's family A
 * (a bucket *carries* the fluid up: no seal, no ceiling at any depth). A
 * boat's bilge, a ship's bilge well, a village well and a bore all answer
 * the same shape the pump lifts through, so `bail` needs no protocol of
 * its own: the controller reads the SOURCE (how far down the fluid stands;
 * what it lifts into) and the TOOL (a bailer, a bucket — or bare hands):
 *
 *  - a spell is the handling plus the rope down and back — `BASE_S +
 *    depth × S_PER_M` game-seconds (20 s at a boat's bilge, 30 s down a
 *    25 m bore — the two shipped grains, one rule);
 *  - a bucketful is the tool's: a vessel's own capacity, a bailing tool
 *    `bail.bucketL` (12 L, the well bailer's), bare hands `bail.handsL`
 *    (10 L, the boat's shipped grain);
 *  - it lifts through `liftInto` (bounded by what the draw point takes),
 *    then — when the draw point is a vessel and you brought one — is tipped
 *    into yours through the platform's own transfer.
 *
 * What the SOURCE says is its own, through two optional `LiftSource` hooks:
 * `bucketRefusal` (a bore wants a derrick over it; a boat upside down has
 * nothing to bail) and `bucketLanded` (the bore's answer; the boat's
 * *"over her side"*). Absent, the verb's words.
 */

import { EngagedActController } from '../../../../lib/command/EngagedActController';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { MessageApi } from '../../../../api/message';
import { BulkableApi } from '../../../../api/bulk';
import { AppApi } from '../../../../api/app';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { LiftSource, BucketLanding } from '../../../../lib/pump/Pumpable';

/** ⚠ A bound arg is an `MqlOneResult`, never a `Stuff`. */
interface BailModel extends CommandModel {
  target?: MqlOneResult;
  tool?: MqlOneResult;
  vessel?: MqlOneResult;
}

type Composed = ReturnType<typeof Mml.compose>;

/** Handling a bucket — fill, lift, tip — game-seconds, before any rope. */
const BASE_S = 20;
/** The rope down and back, game-seconds per metre of depth. */
const S_PER_M = 0.4;
/** Endurance a spell costs a fresh body, percentage points — and per metre hauled. */
const BASE_COST = 4;
const COST_PER_M = 0.2;
/** Deeper than this, the bucket goes down on a rope (the words change, not the rule), m. */
const ROPE_M = 2;
/** A bailing tool's bucketful, L (the well bailer's shipped grain; `bail.bucketL`). */
const BUCKET_L = 12;
/** Bare hands' bucketful, L (the boat's shipped grain; `bail.handsL`). */
const HANDS_L = 10;

/** Does `x` answer the lift shape? A module-private narrowing, by shape (the pump's rule). */
function asLiftSource(x: Stuff | null): (Stuff & LiftSource) | null {
  if (x === null) return null;
  const s = x as unknown as Partial<LiftSource>;
  return typeof s.standingDepthM === 'function' &&
    typeof s.liftInto === 'function' &&
    typeof s.receivableL === 'function' &&
    typeof s.standingAvailableL === 'function'
    ? (x as Stuff & LiftSource)
    : null;
}

/** A numeric setting, else the shipped grain. */
function setting(key: string, fallback: number): number {
  try {
    const n = Number.parseFloat(AppApi.setting(key) ?? '');
    return Number.isFinite(n) && n > 0 ? n : fallback;
  } catch {
    return fallback;
  }
}

/** ⭐ The tool's bucketful, L: a vessel's capacity; a bailing tool's; bare hands'. */
function bucketfulL(tool: Stuff | null): number {
  if (tool === null) return setting('bail.handsL', HANDS_L);
  if (MixinApi.isBulkable(tool)) {
    const slot = BulkableApi.slotFor(tool, undefined);
    const cap = slot?.getCapacity()?.rawValue() ?? 0;
    if (cap > 0) return cap;
  }
  return setting('bail.bucketL', BUCKET_L);
}

/**
 * ⚠ A MODULE function, not a method: an engagement completes after the
 * controller has been destructed in its dispatch `finally` (the
 * `WorkedActController` scar). The giver may have gone, too.
 */
async function land(giver: Stuff, source: Stuff & LiftSource, tool: Stuff | null, vessel: Stuff | null): Promise<void> {
  if (giver.isDestroyed() || source.isDestroyed()) return;
  const want = Math.min(bucketfulL(tool), source.receivableL());
  const litres = want > 0 ? await source.liftInto(want, giver) : 0;
  // Tipped into what you brought — only when the draw point holds it (a
  // trough, a wellhead's head); over a side it is gone.
  let tipped = 0;
  let escaped = false;
  const into = vessel !== null && MixinApi.isBulkable(vessel) ? vessel : null;
  if (into !== null && litres > 0 && MixinApi.isBulkable(source)) {
    const from = BulkableApi.slotFor(source, undefined);
    const to = BulkableApi.slotFor(into, undefined);
    if (from !== null && to !== null) {
      // `lenient`: a cask with room for eight of the twelve takes eight.
      const outcome = BulkableApi.transfer(from, to, { kind: 'measure', litres, mode: 'lenient' });
      tipped = outcome.applied;
      escaped = outcome.status === 'escaped';
    }
  }
  const landing: BucketLanding = { litres, vessel: into, tipped, escaped };
  const own = source.bucketLanded ? await source.bucketLanded(giver, landing) : null;
  if (giver.isDestroyed()) return;
  const words =
    own ??
    (litres <= 0
      ? Mml.compose`The bucket comes up empty.`
      : into !== null && tipped > 0
        ? Mml.compose`You tip the bucketful into ${Mml.thing(into)}.`
        : Mml.compose`You bring up a bucketful and tip it into ${Mml.thing(source)}.`);
  MessageApi.scene(giver).topic('act.deed').toSelf(words).send();
}

export default class BailController extends EngagedActController<BailModel> {
  async execute(model: BailModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const named = (model.target?.stuff ?? null) as Stuff | null;
    // Unnamed: the boat you sit in, if you sit in one.
    const here = named === null && MixinApi.isContainable(giver) ? (giver.getContainer() as Stuff | null) : null;
    const source = asLiftSource(named ?? here);
    if (source === null) {
      this.decline(
        context,
        named !== null ? Mml.compose`There is nothing to bail out of ${Mml.thing(named)}.` : Mml.compose`Bail what?`,
        'nothing-to-bail',
      );
      return;
    }
    const vessel = (model.vessel?.stuff ?? null) as Stuff | null;
    if (vessel !== null && !MixinApi.isBulkable(vessel)) {
      this.decline(context, Mml.compose`You cannot pour anything into that.`, 'not-a-vessel');
      return;
    }
    const tool = (model.tool?.stuff ?? null) as Stuff | null;
    const refused = source.bucketRefusal ? await source.bucketRefusal(giver, tool) : null;
    if (refused !== null) {
      this.decline(context, refused.line as Composed, refused.reason);
      return;
    }
    if (source.receivableL() < 1 && (vessel === null || !MixinApi.isBulkable(source))) {
      this.decline(context, Mml.compose`${Mml.thing(source)} is full. Draw it off first, or bring something to tip it into.`, 'full');
      return;
    }
    const depth = Math.max(0, source.standingDepthM());
    const what = tool ?? null;
    const roped = depth > ROPE_M;
    const beginSelf = roped
      ? what !== null
        ? Mml.compose`You pay the rope out and let ${Mml.thing(what)} go down.`
        : Mml.compose`You pay the rope out and let the bucket go down.`
      : Mml.compose`You start bailing out ${Mml.thing(source)}.`;
    const beginPeers = roped
      ? Mml.compose`${Mml.actor(giver)} lets a bucket down ${Mml.thing(source)}.`
      : Mml.compose`${Mml.actor(giver)} starts bailing out ${Mml.thing(source)}.`;
    this.engageAct(context, {
      durationMs: Math.round((BASE_S + depth * S_PER_M) * 1000),
      cost: Math.round(BASE_COST + depth * COST_PER_M),
      beginSelf: beginSelf as Composed,
      beginPeers: beginPeers as Composed,
      onComplete: () => {
        void land(giver, source, tool, vessel).catch((err) =>
          console.error('BailController: the spell did not land:', err),
        );
      },
    });
  }
}
