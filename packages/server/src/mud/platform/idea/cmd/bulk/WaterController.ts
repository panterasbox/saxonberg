/**
 * WaterController — `water <plant> [with <source>]`.
 *
 * `DrinkController` with the plant's moisture reserve in place of
 * `ingest`: resolve a water-bearing bulk slot, transfer out of it into the
 * `null` discard sink, and credit what came out to the plant.
 *
 * Two deliberate differences from `drink`:
 *
 *   1. **An explicit measure, never `{ kind: 'all' }`** — the amount is
 *      the plant's own moisture headroom, so a 2 L can does not vanish
 *      into a pot that had room for a teacup.
 *   2. **Naming either half of the assembly works.** A player will type
 *      `water the pot` as readily as `water the lily`, so a `PlantPot`
 *      target resolves to its occupant.
 *
 * The plant is its own persistence host, so the act captures it — this is
 * what makes a watering survive a restart under an event-driven capture
 * spine (a rolled-back checkpoint re-derives elapsed *time* from the clock
 * stamp, but it cannot re-derive an *intervention*).
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
import type { Growing } from '../../../../lib/husbandry/Growing';
import {
  SOIL_MOISTURE_RESERVE_KEY,
  type Cultivable,
} from '../../../../lib/husbandry/Cultivable';
import type { Reserved } from '../../../../lib/reserve';
import Plant from '../../../thing/Plant';

const TOPIC = 'act.deed';

/** Material tag a bulk slot must carry to count as waterable. */
const WATER_TAG = 'liquid';

interface WaterModel extends CommandModel {
  target: MqlOneResult;
  source?: MqlOneResult;
}

export default class WaterController extends CommandController<WaterModel> {
  async execute(model: WaterModel, context: CommandContext): Promise<void> {
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

    // Naming either half of the assembly works — a player types both.
    const target =
      MixinApi.isCultivable(named)
        ? (named.getPlant() ?? named)
        : named;

    if (!MixinApi.isGrowing(target)) {
      const isEmptyPot = MixinApi.isCultivable(named);
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          isEmptyPot
            ? Mml.compose`There's nothing planted in ${Mml.thing(named)}.`
            : Mml.compose`${Mml.thing(named)} isn't a plant.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: isEmptyPot ? 'nothing-planted' : 'not-a-plant',
        detail: `${named.getPresentation()} has no plant to water`,
      });
      return;
    }
    const plant = target as Stuff & Growing;

    // Resolve the source: the named one, else the first carried holder
    // with water in it.
    const source = model.source?.stuff ?? this.carriedWaterSource(giver);
    if (!source) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You have nothing to water it with.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'no-water-source',
        detail: 'no carried holder with water in it',
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

    // Only as much as the soil can take — an explicit measure, never
    // `{ kind: 'all' }`, so the rest stays in the can.
    const headroom = this.moistureHeadroom(plant);
    if (headroom <= 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`The soil around ${Mml.thing(plant)} is already wet through.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'already-wet',
        detail: `${plant.getPresentation()} has no room for more water`,
      });
      return;
    }

    // Capture the material BEFORE the transfer empties (and clears) the
    // slot, for the prose.
    const material = fromSlot.getMaterial();
    const payload = fromSlot.getPayload();
    const result = BulkableApi.transfer(fromSlot, null, {
      kind: 'measure',
      litres: Math.min(headroom, fromSlot.available()),
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
        reason: 'nothing-poured',
        detail: 'the transfer moved nothing',
      });
      return;
    }

    // Read the difficulty BEFORE the water lands — it is a measurement of the
    // state the plant was in when the act was needed, and watering it is
    // precisely what changes that state.
    const difficulty =
      plant instanceof Plant ? plant.careDifficulty() : 'standard';
    const absorbed = plant.waterPlant(result.applied);

    // Capture the GROUND, not the plant: since phase 2 the litres land in
    // the pot's (or bed's) moisture reserve, so capturing only the plant
    // would durably record everything about this act except the water.
    // `captureHostOf` walks up to the nearest persistable host either way
    // — for a potted plant that is the room the pot stands in, whose
    // record carries the pot's nested state.
    const ground = this.groundUnder(plant);
    try {
      await PersistableApi.captureHostOf(ground ?? plant);
    } catch (err) {
      console.warn('WaterController: capture after watering failed:', err);
    }

    // Credit `horticulture` — but only when the soil actually took the water.
    // A plant with no headroom never reaches here (the verb rejected above),
    // so there is no credit for going through the motions.
    if (absorbed > 0) {
      try {
        if (MixinApi.isAdvancing(giver))
          await giver.creditDeed({
          discipline: 'horticulture',
          difficulty,
          outcome: 'success',
        });
      } catch (err) {
        console.warn('WaterController: recording the deed failed:', err);
      }
    }

    const appearance =
      payload?.appearance ?? (material?.getAppearance() || 'water');
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        absorbed > 0
          ? Mml.compose`You tip the ${appearance} into the soil around ${Mml.thing(plant)}. It drinks it in.`
          : Mml.compose`You tip the ${appearance} into the soil around ${Mml.thing(plant)}.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} waters ${Mml.thing(plant)}.`)
      .send();
  }

  /** Litres the plant's root zone can still take. */
  /**
   * How many litres the GROUND under `plant` can still take.
   *
   * Phase 2 moved the water out of the plant and into the soil, so the
   * headroom is the bed's, not the plant's. Reading through the growth
   * getter first reconciles the elapsed drain — otherwise the headroom is
   * stale by the whole absence, and a long-neglected plant would report
   * itself already wet.
   */
  private moistureHeadroom(plant: Stuff & Growing): number {
    plant.getSoilMoisture();
    const ground = this.groundUnder(plant);
    if (!ground) return 0;
    const reserve = ground.getReserve(SOIL_MOISTURE_RESERVE_KEY);
    if (!reserve) return 0;
    return Math.max(0, reserve.capacity.rawValue() - reserve.current.rawValue());
  }

  /** The cultivable ground `plant` is rooted in, or null when unrooted. */
  private groundUnder(
    plant: Stuff & Growing,
  ): (Stuff & Cultivable & Reserved) | null {
    if (!MixinApi.isSlottable(plant)) return null;
    const host = plant.getOccupiedHost();
    if (!host || !MixinApi.isCultivable(host)) return null;
    if (!MixinApi.isReserved(host)) return null;
    return host;
  }

  /** The first carried holder with a liquid in it, or null. */
  private carriedWaterSource(giver: Stuff): Stuff | null {
    if (!MixinApi.isContainer(giver)) return null;
    for (const item of giver.getContents()) {
      const slot = BulkableApi.slotFor(item, undefined);
      if (!slot || slot.isEmpty()) continue;
      const tags = slot.getMaterial()?.getTags() ?? [];
      if (tags.includes(WATER_TAG)) return item;
    }
    return null;
  }
}
