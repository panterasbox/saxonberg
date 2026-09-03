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

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { ContainmentApi } from '../../../../api/containment';
import { MixinApi } from '../../../../api/mixin';
import { PersistableApi } from '../../../../api/persistable';
import { PLANT_SLOT } from '../../../../lib/husbandry/Cultivable';

const TOPIC = 'act.deed';

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

    /*
     * ⭐ The capabilities, not the class — see HarvestController.
     *
     * ⚠ Repotting needs THREE, and the spec declares the same three:
     * the thing must grow (`Growing`), must sit in a slot so it can be
     * lifted out of one bed and set in another (`Slottable`), and must
     * be movable at all (`Containable`). `instanceof Plant` bundled all
     * three behind one class and said none of them — which is exactly
     * why the arg's declaration and the controller's guard could drift.
     */
    if (
      !MixinApi.isGrowing(subject) ||
      !MixinApi.isSlottable(subject) ||
      !MixinApi.isContainable(subject)
    ) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.thing(subject)} isn't a plant.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-a-plant',
        detail: `${subject.getPresentation()} is not a plant`,
      });
      return;
    }
    if (!MixinApi.isCultivable(target)) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You can't plant anything in ${Mml.thing(target)}.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-cultivable',
        detail: `${target.getPresentation()} is not ground you can plant in`,
      });
      return;
    }

    const origin = subject.getBed();
    if (origin === target) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.thing(subject)} is already in that pot.`)
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
    // The sizing refusal, and the one whose message must name the reason.
    if (!subject.fitsSlot(target, PLANT_SLOT)) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`${Mml.thing(target)} is too small for ${Mml.thing(subject)} — its roots need more room than that.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'pot-too-small',
        detail: `${target.getPresentation()} cannot carry ${subject.getPresentation()}`,
      });
      return;
    }

    // Read the difficulty before the move — root disturbance is a measurement
    // of the plant as it stands.
    const difficulty = subject.transplantDifficulty();

    // Settle BOTH grounds' water windows before the plant changes hands.
    // Each bed drains by the demand of whoever is standing in it, so the
    // window that just ended has to be drawn at the old membership: the
    // origin owes this plant's share of it, and the destination — which
    // may have sat empty for weeks — owes nothing and must not be made
    // retroactively thirsty by an arrival. (`vacate` settles the origin
    // itself; the destination is settled here because only the caller
    // knows this is a transplant rather than a persistence re-seat.)
    target.reconcileSoil();
    if (origin) origin.vacate(PLANT_SLOT, subject);
    ContainmentApi.move(subject, target);
    target.occupy(subject, PLANT_SLOT);

    try {
      await PersistableApi.captureHostOf(subject);
    } catch (err) {
      console.warn('RepotController: capture after repotting failed:', err);
    }

    // Credit `horticulture`. This is the build's one real diagnosis-and-fix
    // act: the player read a cause line ("it has outgrown its pot"), inferred
    // the remedy, and acted — so it grades by what was actually at stake,
    // which is how much root there was to disturb.
    try {
      if (MixinApi.isAdvancing(giver))
        await giver.creditDeed({
        discipline: 'horticulture',
        difficulty,
        outcome: 'success',
      });
    } catch (err) {
      console.warn('RepotController: recording the deed failed:', err);
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You lift ${Mml.thing(subject)} clear, roots and all, and settle it into ${Mml.thing(target)}.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(giver)} repots ${Mml.thing(subject)} into ${Mml.thing(target)}.`,
      )
      .send();
  }
}
