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
 * ⭐ **A plant, a bed, a patch and a field** (field population D18). A
 * field crop is watered at its PATCH: on a divided field the act names
 * one (`water wheat at the top end`) or the GROUND refuses it, listing
 * the parts (`resolvePartFor` — the controller only sends the line). Ground
 * with nothing sown on it is watered itself. The reply says how many
 * litres went in, and on a big stretch of ground that a can barely wets,
 * says that too: the player learns what a can is worth on a field.
 *
 * The plant is its own persistence host, so the act captures it — this is
 * what makes a watering survive a restart under an event-driven capture
 * spine (a rolled-back checkpoint re-derives elapsed *time* from the clock
 * stamp, but it cannot re-derive an *intervention*).
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlManyResult, MqlOneResult } from '../../../../api/mql';
import { BulkableApi } from '../../../../api/bulk';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { PersistableApi } from '../../../../api/persistable';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Growing } from '../../../../lib/husbandry/Growing';
import type { Soil } from '../../../../lib/husbandry/Soil';
import Plant from '../../../thing/Plant';
import { CraftingApi } from '../../../../api/crafting';

const TOPIC = 'act.deed';

/** Material tag a bulk slot must carry to count as waterable. */
const WATER_TAG = 'liquid';

/**
 * Below this many litres per square metre of the ground watered, the
 * reply adds that it barely shows — a can on a thousand square meters.
 */
const BARELY_SHOWS_L_PER_M2 = 0.1;

interface WaterModel extends CommandModel {
  target: MqlOneResult;
  /** `at <patch>` — which part of a divided field (D5). */
  patch?: MqlOneResult;
  source?: MqlManyResult;
}

/** What the act is aimed at, once the ground has had its say. */
interface Aim {
  /** The plant whose ground takes the water, or `null` for bare ground. */
  plant: (Stuff & Growing) | null;
  /** The soil the water lands in. */
  ground: Stuff & Soil;
  /** The part of a divided ground, when one was named or resolved. */
  part: (Stuff & Soil) | null;
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
    const patchRaw = model.patch?.raw ?? '';
    const patch = model.patch?.stuff ?? null;
    if (!patch && patchRaw.trim() !== '') {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${patchRaw}' here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'patch', query: patchRaw });
      return;
    }

    const aim = this.aim(named, patch && MixinApi.isSoil(patch) ? patch : null, context);
    if (!aim) return;
    const { plant, ground, part } = aim;

    // The source: the named one, else the first carried holder with
    // water in it — a NARROWING over what the binder bound.
    const source = this.waterSource(model.source);
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
      model.source?.via,
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
    // `{ kind: 'all' }`, so the rest stays in the can. Reading through
    // the plant first reconciles the elapsed drain — otherwise the
    // headroom is stale by the whole absence, and a long-neglected plant
    // would report itself already wet.
    let headroom: number;
    if (plant) {
      plant.getSoilMoisture();
      headroom = plant.waterHeadroomL();
    } else {
      headroom = ground.soilMoistureHeadroomL();
    }
    if (headroom <= 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          plant
            ? Mml.compose`The soil around ${Mml.thing(plant)} is already wet through.`
            : Mml.compose`The soil of ${Mml.thing(ground)} is already wet through.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'already-wet',
        detail: `${(plant ?? ground).getPresentation()} has no room for more water`,
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
      plant instanceof Plant ? plant.careDifficulty() : plant ? 'standard' : 'easy';
    const absorbed = plant
      ? plant.waterPlant(result.applied)
      : ground.waterSoil(result.applied);

    // Capture the GROUND, not the plant: since phase 2 the litres land in
    // the pot's (or bed's, or patch's) moisture reserve, so capturing only
    // the plant would durably record everything about this act except the
    // water. `captureHostOf` walks up to the nearest persistable host — for
    // a potted plant the room the pot stands in, for a patch the field
    // whose record carries it.
    try {
      await PersistableApi.captureHostOf(ground);
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
      CraftingApi.blendAppearance(payload, material) || 'water';
    const litres = litresPhrase(result.applied);
    const where = part ? Mml.compose` at ${Mml.thing(part)}` : Mml.compose``;
    const tipped = plant
      ? Mml.compose`You tip ${litres} of ${appearance} into the soil around ${Mml.thing(plant)}${where}.`
      : part
        ? Mml.compose`You tip ${litres} of ${appearance} into the soil at ${Mml.thing(part)}.`
        : Mml.compose`You tip ${litres} of ${appearance} into the soil of ${Mml.thing(ground)}.`;
    const drinks = plant && absorbed > 0 ? ' It drinks it in.' : '';
    const areaM2 = ground.soilCatchmentAreaM2();
    const barely =
      areaM2 > 0 && result.applied / areaM2 < BARELY_SHOWS_L_PER_M2
        ? ` On ${areaPhrase(areaM2)} it barely shows.`
        : '';
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`${tipped}${drinks}${barely}`)
      .toPeers(Mml.compose`${Mml.actor(giver)} waters ${Mml.thing(plant ?? ground)}.`)
      .send();
  }

  /**
   * Resolve what the act is aimed at (D18), refusing in the ground's own
   * words when it cannot say. A plant is watered where it stands — at the
   * stand of its kind in the named part, on a divided field; a bed or a
   * pot waters its plant; a patch or a one-piece field waters the crop
   * rooted there, else the ground itself.
   */
  private aim(
    named: Stuff,
    patch: (Stuff & Soil) | null,
    context: CommandContext,
  ): Aim | null {
    const giver = context.commandGiver;
    const refuse = (line: Mml, reason: string, detail: string): null => {
      MessageApi.scene(giver).topic(TOPIC).toSelf(line).send();
      context.note({ kind: 'controller-rejected', reason, detail });
      return null;
    };

    if (MixinApi.isGrowing(named)) {
      const holder = MixinApi.isContainable(named) ? named.getContainer() : null;
      // ⭐ A field crop: the GROUND says which part, or refuses.
      if (named.isAreaCrop() && holder && MixinApi.isSoil(holder)) {
        const r = holder.resolvePartFor(patch);
        if (!r.ok) return refuse(Mml.fromMarkup(r.line), r.reason, r.line);
        const plant = r.part ? named.standIn(r.part) : named;
        const ground = plant?.getBed() ?? r.part ?? holder;
        return { plant, ground, part: r.part };
      }
      const bed = named.getBed();
      if (patch && patch !== bed) {
        return refuse(
          Mml.compose`${Mml.thing(named)} does not stand at ${Mml.thing(patch)}.`,
          'not-a-part-here',
          `${named.getPresentation()} is not rooted in ${patch.getPresentation()}`,
        );
      }
      if (!bed) {
        return refuse(
          Mml.compose`${Mml.thing(named)} isn't rooted in anything that holds water.`,
          'not-rooted',
          `${named.getPresentation()} has no ground under it`,
        );
      }
      return { plant: named, ground: bed, part: null };
    }

    if (MixinApi.isSoil(named)) {
      const r = named.resolvePartFor(patch);
      if (!r.ok) return refuse(Mml.fromMarkup(r.line), r.reason, r.line);
      // Naming either half of the assembly works — a player types both.
      if (MixinApi.isCultivable(named)) {
        const occupant = named.getPlant();
        if (!occupant || !MixinApi.isGrowing(occupant)) {
          return refuse(
            Mml.compose`There's nothing planted in ${Mml.thing(named)}.`,
            'nothing-planted',
            `${named.getPresentation()} has no plant to water`,
          );
        }
        return { plant: occupant, ground: named, part: null };
      }
      const plant = named.rootedAreaCrop(r.part);
      const ground = r.part ?? named;
      return { plant, ground: plant?.getBed() ?? ground, part: r.part };
    }

    return refuse(
      Mml.compose`${Mml.thing(named)} isn't a plant.`,
      'not-a-plant',
      `${named.getPresentation()} has no plant to water`,
    );
  }

  /**
   * The vessel to water from. `water.yaml` declares `source` with a
   * `me:i:[mixin.BulkableMixin]` default, so bare `water` arrives with
   * every carried vessel and the only question left is what is IN it —
   * contents, which no predicate asks (`lint:instrument-args`). A NAMED
   * vessel is taken as named, so "it is empty" can be said about it.
   */
  private waterSource(bound: MqlManyResult | undefined): Stuff | null {
    const carried = bound?.stuff ?? [];
    if (carried.length === 0) return null;
    if (bound?.prep !== undefined) return carried[0]!;
    for (const item of carried) {
      const slot = BulkableApi.slotFor(item, undefined);
      if (!slot || slot.isEmpty()) continue;
      const tags = slot.getMaterial()?.getTags() ?? [];
      if (tags.includes(WATER_TAG)) return item;
    }
    return null;
  }
}

/** Litres in words a reader takes in at a glance: `2 L`, `0.5 L`, `12 L`. */
function litresPhrase(litres: number): string {
  const n = litres >= 10 ? Math.round(litres) : Math.round(litres * 10) / 10;
  return `${n.toLocaleString('en-US')} L`;
}

/** An area in square meters, as a reader would say it. */
function areaPhrase(areaM2: number): string {
  const n = Math.round(areaM2);
  return n === 1 ? 'a square meter' : `${n.toLocaleString('en-US')} square meters`;
}
