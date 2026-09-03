/**
 * FeedController — `feed <bed> [with <source>]`.
 *
 * {@link WaterController}'s twin, line for line: resolve the target's
 * ground, resolve a carried bulk source of compost, transfer an **explicit
 * measure** sized to the soil's headroom into the `null` discard sink, and
 * credit what came out to the ground's nitrogen reserve.
 *
 * Three things it shares with `water` deliberately:
 *
 *   1. **An explicit measure, never `{ kind: 'all' }`** — a full sack does
 *      not vanish into a bed that had room for a handful.
 *   2. **Naming either half of the assembly works.** `feed the carrots`
 *      feeds the ground the carrots stand in, the same way `water the pot`
 *      waters the lily in it.
 *   3. **The act captures the ground**, because the nitrogen is the
 *      ground's state — the same reason `water` captures it.
 *
 * And one thing it does NOT share: `feed` is not tool-afforded. You feed by
 * hand out of a sack, exactly as you pour soil by hand, so no entry joins
 * the `TOOL_CAPABILITIES` table.
 *
 * A pot authors no nitrogen reserve at all, so feeding a houseplant is
 * refused with the reason rather than silently doing nothing — a
 * windowsill plant is never short of nitrogen, and saying so is the honest
 * answer to a player who tries.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { BulkableApi } from '../../../../api/bulk';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { PersistableApi } from '../../../../api/persistable';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import {
  SOIL_NITROGEN_RESERVE_KEY,
  type Cultivable,
} from '../../../../lib/husbandry/Cultivable';
import type { Reserved } from '../../../../lib/reserve';

const TOPIC = 'act.deed';

/** Material tag a bulk slot must carry to count as feedable. */
const COMPOST_TAG = 'compost';

/**
 * Percentage points of nitrogen one litre of compost restores. A sack
 * holds ~20 L, so a full sack refills a bed's 100 points twice over —
 * generous by design: the interesting decision is *whether you kept up
 * with it*, not how many sacks you counted.
 */
const POINTS_PER_LITRE = 10;

interface FeedModel extends CommandModel {
  target: MqlOneResult;
  source?: MqlOneResult;
}

export default class FeedController extends CommandController<FeedModel> {
  async execute(model: FeedModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const named = model.target.stuff;

    if (!named) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.target.raw}' here.`)
        .send();
      context.note({
        kind: 'empty-result',
        field: 'target',
        query: model.target.raw,
      });
      return;
    }

    // Naming either half of the assembly works — `feed the carrots` feeds
    // the bed they stand in.
    const ground = this.resolveGround(named);
    if (!ground) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.thing(named)} isn't ground you can feed.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-cultivable',
        detail: `${named.getPresentation()} is not cultivable ground`,
      });
      return;
    }

    const reserve = ground.getReserve(SOIL_NITROGEN_RESERVE_KEY);
    if (!reserve) {
      // A pot. Say why rather than no-op'ing.
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`${Mml.thing(ground)} holds too little soil to need feeding.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'no-nutrient-reserve',
        detail: `${ground.getPresentation()} declares no nitrogen`,
      });
      return;
    }

    const source = model.source?.stuff ?? this.carriedCompostSource(giver);
    if (!source) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You have nothing to feed it with.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'no-compost-source',
        detail: 'no carried holder with compost in it',
      });
      return;
    }

    const fromSlot = BulkableApi.slotFor(
      source,
      model.source?.via?.bulk?.affordance,
    );
    if (fromSlot === null || fromSlot.isEmpty()) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.thing(source)} is empty.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'source-empty',
        detail: 'source slot empty or absent',
      });
      return;
    }

    const headroomPoints =
      reserve.capacity.rawValue() - reserve.current.rawValue();
    if (headroomPoints <= 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`The soil in ${Mml.thing(ground)} is already rich.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'already-fed',
        detail: `${ground.getPresentation()} has no room for more nitrogen`,
      });
      return;
    }

    const material = fromSlot.getMaterial();
    const payload = fromSlot.getPayload();
    const wantedLitres = headroomPoints / POINTS_PER_LITRE;
    const result = BulkableApi.transfer(fromSlot, null, {
      kind: 'measure',
      litres: Math.min(wantedLitres, fromSlot.available()),
      mode: 'lenient',
    });
    for (const note of result.notes) context.note(note);

    if (result.applied <= 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`Nothing comes out of ${Mml.thing(source)}.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'nothing-spread',
        detail: 'the transfer moved nothing',
      });
      return;
    }

    const applied = ground.feedSoil(result.applied * POINTS_PER_LITRE);

    try {
      await PersistableApi.captureHostOf(ground);
    } catch (err) {
      console.warn('FeedController: capture after feeding failed:', err);
    }

    if (applied > 0) {
      try {
        if (MixinApi.isAdvancing(giver))
          await giver.creditDeed({
          discipline: 'horticulture',
          difficulty: 'easy',
          outcome: 'success',
        });
      } catch (err) {
        console.warn('FeedController: recording the deed failed:', err);
      }
    }

    const appearance =
      payload?.appearance ?? (material?.getAppearance() || 'compost');
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You work the ${appearance} into the soil of ${Mml.thing(ground)}.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} feeds ${Mml.thing(ground)}.`)
      .send();
  }

  /**
   * The cultivable ground `named` refers to: itself when it is ground, or
   * the ground it is rooted in when it is a plant.
   */
  private resolveGround(named: Stuff): (Stuff & Cultivable & Reserved) | null {
    if (MixinApi.isCultivable(named) && MixinApi.isReserved(named)) {
      return named;
    }
    if (!MixinApi.isSlottable(named)) return null;
    const host = named.getOccupiedHost();
    if (!host || !MixinApi.isCultivable(host)) return null;
    if (!MixinApi.isReserved(host)) return null;
    return host;
  }

  /** The first carried holder with compost in it, or null. */
  private carriedCompostSource(giver: Stuff): Stuff | null {
    if (!MixinApi.isContainer(giver)) return null;
    for (const item of giver.getContents()) {
      const slot = BulkableApi.slotFor(item, undefined);
      if (!slot || slot.isEmpty()) continue;
      const tags = slot.getMaterial()?.getTags() ?? [];
      if (tags.includes(COMPOST_TAG)) return item;
    }
    return null;
  }
}
