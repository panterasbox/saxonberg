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
        this.pickUpOperand(operand, context);
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
      this.pickUpOperand(target, context);
      pickedNames.push(target.getPresentation());
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
   */
  private pickUpOperand(operand: Stuff, context: CommandContext): void {
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
    ContainmentApi.move(operand, giver);
    MessageApi.scene(giver)
      .topic('world.perception.inventory')
      .toSelf(Mml.compose`You pick up ${Mml.item(operand)}.`)
      .toPeers(Mml.compose`${Mml.name(giver)} picks up ${Mml.item(operand)}.`)
      .send();
  }
}
