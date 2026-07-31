/**
 * RepotController — `repot <plant> into <pot>`.
 *
 * Vacates the plant's old slot, moves it, and occupies the new one. The
 * destination must hold soil and have a free slot, and must satisfy the
 * plant's own `fitsSlot` — the candidate-side test, which compares the
 * **current stage's** root demand against the pot's soil volume. That
 * refusal is the one whose message has to name its reason, because
 * "it has outgrown its pot" is the entire transplanting tutorial and this
 * is where a player acts on it.
 *
 * The move preserves every scrap of growth state: moisture, vigor, stage,
 * flowering and the clock stamp all live on the plant, so a transplant
 * never resets it.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { ContainmentApi } from '../../../api/containment';
import { PersistableApi } from '../../../api/persistable';
import PlantPot, { PLANT_SLOT } from '../../PlantPot';
import Plant from '../../Plant';

const TOPIC = 'world.narration.action';

interface RepotModel extends CommandModel {
  plant: MqlOneResult;
  pot: MqlOneResult;
}

export default class RepotController extends CommandController<RepotModel> {
  async execute(model: RepotModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const subject = model.plant.stuff;
    const target = model.pot.stuff;

    if (!subject) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.plant.raw}' here.`)
        .send();
      context.note({
        kind: 'empty-result',
        field: 'plant',
        query: model.plant.raw,
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

    if (!(subject instanceof Plant)) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.item(subject)} isn't a plant.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-a-plant',
        detail: `${subject.getPresentation()} is not a plant`,
      });
      return;
    }
    if (!(target instanceof PlantPot)) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You can't plant anything in ${Mml.item(target)}.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-a-pot',
        detail: `${target.getPresentation()} is not a pot`,
      });
      return;
    }

    const origin = subject.getPot();
    if (origin === target) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.item(subject)} is already in that pot.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'already-there',
        detail: `${subject.getPresentation()} already occupies that pot`,
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
    // The sizing refusal, and the one whose message must name the reason.
    if (!subject.fitsSlot(target, PLANT_SLOT)) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`${Mml.item(target)} is too small for ${Mml.item(subject)} — its roots need more room than that.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'pot-too-small',
        detail: `${target.getPresentation()} cannot carry ${subject.getPresentation()}`,
      });
      return;
    }

    if (origin) origin.vacate(PLANT_SLOT, subject);
    ContainmentApi.move(subject, target);
    target.occupy(subject, PLANT_SLOT);

    try {
      await PersistableApi.captureHostOf(subject);
    } catch (err) {
      console.warn('RepotController: capture after repotting failed:', err);
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You lift ${Mml.item(subject)} clear, roots and all, and settle it into ${Mml.item(target)}.`,
      )
      .toPeers(
        Mml.compose`${Mml.name(giver)} repots ${Mml.item(subject)} into ${Mml.item(target)}.`,
      )
      .send();
  }
}
