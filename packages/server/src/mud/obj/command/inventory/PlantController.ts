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

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import { Mml } from '../../../api/mml';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { PersistableApi } from '../../../api/persistable';
import Seed from '../../Seed';
import PlantPot, { PLANT_SLOT } from '../../PlantPot';
import Plant from '../../Plant';

const TOPIC = 'world.narration.action';

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

    if (!(seed instanceof Seed)) {
      const detail = `${seed.getPresentation()} is not a seed`;
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.item(seed)} isn't a seed.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-a-seed',
        detail,
      });
      return;
    }
    if (!(target instanceof PlantPot)) {
      const detail = `${target.getPresentation()} is not a pot`;
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You can't plant anything in ${Mml.item(target)}.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-a-pot',
        detail,
      });
      return;
    }
    if (!target.hasSoil()) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`${Mml.item(target)} has no soil in it. Pour some in first.`,
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
          Mml.compose`${Mml.item(target)} already has something growing in it.`,
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
        .toSelf(Mml.compose`${Mml.item(seed)} doesn't seem to be viable.`)
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
          Mml.compose`${Mml.item(target)} is too small for that to grow in.`,
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
    target.occupy(plant, PLANT_SLOT);
    StuffApi.destruct(seed);

    // The plant is its own host; a failed capture must not fail the verb.
    try {
      await PersistableApi.captureHostOf(plant);
    } catch (err) {
      console.warn('PlantController: capture after planting failed:', err);
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You press the seed into the soil. ${Mml.item(plant)} will grow here.`,
      )
      .toPeers(
        Mml.compose`${Mml.name(giver)} plants a seed in ${Mml.item(target)}.`,
      )
      .send();
  }
}
