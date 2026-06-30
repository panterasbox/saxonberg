/**
 * GetController — pick up objects from the location.
 *
 * Mirror of `DropController` shape — see that file for the two-path
 * pattern (whole-set vs quantity-bearing). Source for `get` is the
 * location's contents, destination is the giver's inventory.
 *
 * v1 envelope stub: notes from `GlobbableApi.applyQuantity` are
 * folded into the `summary` inline. Future response-envelope work
 * threads them through `ctx.note(...)` instead.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../api/command';
import type { MqlManyResult } from '../../../api/mql';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { ContainmentApi } from '../../../api/containment';
import { GlobbableApi, type ApplyQuantityResult } from '../../../api/glob';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import { Mml } from '../../../api/mml';
import { Touch } from '../../../lib/perception/Touch';

interface GetModel extends CommandModel {
  targets: MqlManyResult;
}

interface GetPayload {
  operand: Stuff;
  applied: number;
}

export default class GetController extends CommandController<GetModel> {
  async execute(
    model: GetModel,
    context: CommandContext
  ): Promise<void> {
    const { stuff, quantity, raw } = model.targets;
    const giver = context.commandGiver;
    if (!MixinApi.isContainer(giver)) {
      throw new Error(
        `GetController: commandGiver ${giver.stuffId} is not a Container`
      );
    }

    // `giver` is narrowed to `Stuff & Container`; carry the inventory
    // / location snapshots into both paths so neither has to re-cast.
    const inventory = ContainmentApi.getContents(giver);
    // Defensive: placeless avatars are blocked at the inbound gate, so a
    // real `get` always has a location by the time the controller runs.
    if (!context.location) return;
    const here = ContainmentApi.getContents(context.location);

    if (!quantity) {
      return this.executeWholeSet(stuff, inventory, here, raw, context);
    }

    // Source: location contents. Filter to candidates actually
    // present here and not already in inventory.
    const inLocation = stuff.filter((s) =>
      here.some((it) => it.stuffId === s.stuffId)
    );
    const candidates = inLocation.filter(
      (s) => !inventory.some((it) => it.stuffId === s.stuffId)
    );

    const result = await GlobbableApi.applyQuantity<GetPayload>(
      candidates,
      quantity,
      async (operand, applied) => {
        if (!this.pickUpOperand(operand, context)) {
          // Lift gate declined this operand — the decline scene + note
          // already fired in `pickUpOperand`; report it as a non-applied
          // result so glob skips it.
          return { ok: false, reason: 'too-heavy-to-lift' };
        }
        return { ok: true, payload: { operand, applied } };
      },
      { field: 'targets', query: raw }
    );

    return this.renderResult(result, raw, context);
  }

  private executeWholeSet(
    targets: Stuff[],
    inventory: readonly Stuff[],
    here: readonly Stuff[],
    raw: string,
    context: CommandContext
  ): void {
    if (targets.length === 0) {
      MessageApi.scene(context.commandGiver)
        .topic('world.perception.inventory')
        .toSelf(Mml.compose`You don't see any '${raw}' here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'targets', query: raw });
      return;
    }
    const pickedNames: string[] = [];
    for (const target of targets) {
      if (inventory.some((item) => item.stuffId === target.stuffId)) {
        continue;
      }
      if (!here.some((item) => item.stuffId === target.stuffId)) {
        continue;
      }
      if (this.pickUpOperand(target, context)) {
        pickedNames.push(target.getPresentation());
      }
    }
    if (pickedNames.length === 0) {
      MessageApi.scene(context.commandGiver)
        .topic('world.perception.inventory')
        .toSelf(Mml.compose`Nothing picked up.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'nothing-picked-up',
        detail: 'nothing picked up',
      });
      return;
    }
    return;
  }

  private renderResult(
    result: ApplyQuantityResult<GetPayload>,
    raw: string,
    context: CommandContext,
  ): void {
    for (const note of result.notes) {
      // Glob already constructed canonical-shape notes — forward
      // straight through. Prose for the kinds that the controller
      // surfaces to the player rides alongside.
      context.note(note);
      switch (note.kind) {
        case 'empty-result':
          MessageApi.scene(context.commandGiver)
            .topic('world.perception.inventory')
            .toSelf(Mml.compose`You don't see any '${raw}' here.`)
            .send();
          return;
        case 'quantity-clamped-rejected':
          MessageApi.scene(context.commandGiver)
            .topic('world.perception.inventory')
            .toSelf(Mml.compose`Only ${String(note.available)} of those here.`)
            .send();
          return;
        case 'quantity-clamped':
        case 'target-declined':
          // Notes already forwarded above; clamp suffix or per-
          // target prose decisions live on the controller's
          // success-path rendering.
          break;
      }
    }

    if (!result.ok || result.payloads.length === 0) {
      MessageApi.scene(context.commandGiver)
        .topic('world.perception.inventory')
        .toSelf(Mml.compose`Nothing picked up.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'nothing-picked-up',
        detail: 'nothing picked up',
      });
    }
  }

  /**
   * Move one operand into the giver's inventory and emit the
   * per-operand scene. Shared by both the bareword whole-set path
   * and the quantity-bearing `applyQuantity` action callback so the
   * move + scene pair stays in one place.
   *
   * Returns `true` when the operand was picked up, `false` when the
   * encumbrance lift gate declined it — so callers skip a declined item
   * (it is simply left behind; lighter items in the same `get all`
   * still succeed).
   */
  private pickUpOperand(operand: Stuff, context: CommandContext): boolean {
    if (!MixinApi.isContainable(operand)) {
      throw new Error(
        `GetController: operand ${operand.stuffId} is not Containable`
      );
    }
    const giver = context.commandGiver;
    if (!MixinApi.isContainer(giver)) {
      throw new Error(
        `GetController: commandGiver ${giver.stuffId} is not a Container`
      );
    }

    // Hands-occupied while hauling: you can't pick a thing up into your
    // hands while gripping a cart's handle. Keyed on the giver being the
    // hauler (a mounted rider whose horse hauls keeps their hands free).
    if (MixinApi.isHauling(giver) && giver.isHitched()) {
      context.note({
        kind: 'controller-rejected',
        reason: 'hands-hauling',
        detail: 'cannot pick up while hauling a cart',
      });
      MessageApi.scene(giver)
        .topic('world.perception.inventory')
        .toSelf(
          Mml.compose`Your hands are full — you're pulling ${Mml.item(giver.getHauledCart()!)}.`,
        )
        .send();
      return false;
    }

    // Encumbrance lift gate — only a load-bearing giver (a creature with
    // the gauge) is gated; non-creature containers (a chest looting into
    // a bag) skip it. Diegetic decline: an envelope note + a scene line,
    // no throw, no boolean-result move. An item that pushes burden over
    // *capacity* but stays under the *strain ceiling* still lifts (now
    // overloaded — locomotion-gated + drains on traverse).
    if (MixinApi.isLoadBearing(giver) && giver.wouldExceedCeiling(operand)) {
      context.note({
        kind: 'controller-rejected',
        reason: 'too-heavy-to-lift',
        detail: `${operand.getPresentation()} won't budge`,
      });
      MessageApi.scene(giver)
        .topic('world.perception.inventory')
        .toSelf(Mml.compose`You strain, but ${Mml.item(operand)} doesn't budge.`)
        .send();
      return false;
    }

    ContainmentApi.move(operand, giver);
    MessageApi.scene(giver)
      .topic('world.perception.inventory')
      .toSelf(Mml.compose`You pick up ${Mml.item(operand)}.`)
      .toPeers(Mml.compose`${Mml.name(giver)} picks up ${Mml.item(operand)}.`)
      .send();
    this.burnOnGrab(operand, giver);
    return true;
  }

  /**
   * The scalding-band burn hook applied to a bare-handed grab. Any
   * Thermal object whose surface scalds afflicts a `burn` trauma on the
   * grabber — the rule itself lives in `Touch.contactBurn` (shared with
   * `feel`), so this is just the `get`-side application + prose. No-op
   * below the band or on a giver with no vitals.
   */
  private burnOnGrab(operand: Stuff, giver: Stuff): void {
    if (!MixinApi.isThermal(operand)) return;
    const trauma = Touch.contactBurn(operand.getSurfaceTemperature().rawValue());
    if (!trauma || !MixinApi.isVitals(giver)) return;
    giver.afflict(trauma);
    MessageApi.scene(giver)
      .topic('world.perception.inventory')
      .toSelf(Mml.compose`It scalds your hand!`)
      .send();
  }
}
