/**
 * PlantController — `plant <seed> in <pot>`.
 *
 * Mints the plant the seed names into the pot's one plant slot and
 * consumes the seed. The pot must hold soil (a pot is a volume, and the
 * volume is the root ceiling) and its slot must be free.
 *
 * The new plant goes into the pot's **contents** as well as its **slot** —
 * the wear/equip pattern, and load-bearing: the Slotted capture slice
 * names its occupants by index into the container slice, so a slot-only
 * occupant resolves to -1 and is silently dropped on restore.
 *
 * A cultivated plant is its own persistence host, so the act captures the
 * plant itself through `PersistableApi.captureHostOf`.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { ParcelApi } from '../../../../api/parcel';
import { LandUses } from '../../../../lib/parcel/LandUse';
import { Mml } from '../../../../api/mml';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { PersistableApi } from '../../../../api/persistable';
import { PLANT_SLOT } from '../../../../lib/husbandry/Cultivable';
import Plant from '../../../thing/Plant';

const TOPIC = 'act.deed';

interface PlantModel extends CommandModel {
  seed: MqlOneResult;
  pot: MqlOneResult;
}

export default class PlantController extends CommandController<PlantModel> {
  async execute(model: PlantModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const seed = model.seed.stuff;
    const target = model.pot.stuff;

    if (!seed) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.seed.raw}' here.`)
        .send();
      context.note({
        kind: 'empty-result',
        field: 'seed',
        query: model.seed.raw,
      });
      return;
    }
    if (!target) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.pot.raw}' here.`)
        .send();
      context.note({
        kind: 'empty-result',
        field: 'pot',
        query: model.pot.raw,
      });
      return;
    }

    // ⭐ The CAPABILITY, not the `Seed` class. `mustBePlantable` on the
    // spec checks this exact predicate — one source of truth, so the
    // menu and the verb cannot disagree about what can be planted.
    if (!MixinApi.isPlantable(seed)) {
      const detail = `${seed.getPresentation()} is not a seed`;
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.thing(seed)} isn't a seed.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-a-seed',
        detail,
      });
      return;
    }
    if (!MixinApi.isCultivable(target)) {
      const detail = `${target.getPresentation()} is not a pot`;
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You can't plant anything in ${Mml.thing(target)}.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-a-pot',
        detail,
      });
      return;
    }
    // ⭐ THE LAND-USE GATE. Cultivating GROUND is the parcel's business:
    // a bed on the Registry's civic floor is refused, and the refusal
    // names the use rather than saying "no". A POT is exempt — it is
    // furniture you carry, and a houseplant on a windowsill in a rented
    // office is not agriculture.
    if (target.isFixedGround()) {
      // WHERE the bed stands, not what template it came from: every bed
      // clones from `/trade/farming/thing/bed/garden`, so the template path would zone
      // every bed in the world identically. The parcel that governs it
      // is the one covering the ROOM it is in.
      //
      // ⚠ And the room's own PERSISTENCE KEY wins over its template path
      // when it has one. A room cloned once per lot shares its template
      // path with every other lot's, so the template path resolves to the
      // DISTRICT — right today only because every Hinkley lot is zoned
      // alike. The key is the lot's parcel extent, which is the parcel
      // that actually governs this ground.
      const site = MixinApi.isContainable(target)
        ? target.getContainer()
        : null;
      const keyed =
        site && MixinApi.isPersistable(site)
          ? site.getPersistenceKey()
          : null;
      const where = keyed ?? site?.getTemplatePath() ?? '';

      // ⚠ UNPARCELLED GROUND IS NOT POLICED. `landUseOf` is total and
      // answers `wild` for ground nobody has claimed — but "nobody has
      // zoned this" is not the same statement as "this is zoned against
      // you", and treating it as one breaks the hermit: a shack and a
      // garden in an unparcelled forest must work with zero numbers.
      //
      // So the gate asks whether a parcel COVERS this ground at all
      // before it asks what that parcel permits. The abstract path
      // branches stay protected, because they DO have rows: `/studio`
      // and `/stuff/idea/lounge` are covered, declare no use, and therefore
      // still answer `wild` → refused.
      //
      // Same principle as the acreage check degrading on unmeasured
      // land: measure nothing, police nothing.
      const covering = await ParcelApi.coveringParcelOf(where);
      const use = ParcelApi.landUseOf(where);
      if (covering && !LandUses.permitsAnyCultivation(use)) {
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(
            Mml.compose`Nothing may be grown on this ground — it is zoned for ${LandUses.summaryOf(use)}.`,
          )
          .send();
        context.note({
          kind: 'controller-rejected',
          reason: 'land-use-forbids-cultivation',
          detail: `${where || 'nowhere'} is zoned ${use}, which admits no cultivation`,
        });
        return;
      }
    }

    if (!target.hasSoil()) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`${Mml.thing(target)} has no soil in it. Pour some in first.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'no-soil',
        detail: `${target.getPresentation()} holds no soil`,
      });
      return;
    }
    if (target.isSlotFull(PLANT_SLOT)) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`${Mml.thing(target)} already has something growing in it.`,
        )
        .send();
      context.note({
        kind: 'slot-occupied',
        host: MessageApi.refOf(target),
        slot: PLANT_SLOT,
      });
      return;
    }

    const growsInto = seed.getGrowsIntoPath();
    if (!growsInto) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.thing(seed)} doesn't seem to be viable.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'seed-names-no-plant',
        detail: `${seed.getPresentation()} names no plant template`,
      });
      return;
    }

    const plant = await StuffApi.clone<Plant>(growsInto);

    // Gate on `fitsSlot` even though a seedling fits anything today — so a
    // future large-seeded species cannot be planted into a thimble.
    if (!MixinApi.isSlottable(plant) || !plant.fitsSlot(target, PLANT_SLOT)) {
      StuffApi.destruct(plant);
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`${Mml.thing(target)} is too small for that to grow in.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'pot-too-small',
        detail: `${target.getPresentation()} cannot carry that plant`,
      });
      return;
    }

    // Contents FIRST, then the slot — see the class docstring.
    ContainmentApi.move(plant, target);
    // Settle the ground's water window before the arrival counts toward
    // its demand — a bed that sat empty must not be billed for the gap.
    target.reconcileSoil();
    target.occupy(plant, PLANT_SLOT);
    StuffApi.destruct(seed);

    // The plant is its own host; a failed capture must not fail the verb.
    try {
      await PersistableApi.captureHostOf(plant);
    } catch (err) {
      console.warn('PlantController: capture after planting failed:', err);
    }

    // Credit `horticulture`. Pressing a seed into soil is the entry act and
    // reads `trivial`, which is the honest grade AND self-limiting: the
    // estimator treats a trivial success as unsurprising, so no amount of
    // planting substitutes for keeping something alive.
    try {
      if (MixinApi.isAdvancing(giver))
        await giver.creditDeed({
        discipline: 'horticulture',
        difficulty: 'trivial',
        outcome: 'success',
      });
    } catch (err) {
      console.warn('PlantController: recording the deed failed:', err);
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You press the seed into the soil. ${Mml.thing(plant)} will grow here.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(giver)} plants a seed in ${Mml.thing(target)}.`,
      )
      .send();
  }
}
