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

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import type { MqlManyResult } from '../../api/mql';
import type { Stuff } from '../../lib/stuff/Stuff';
import { ContainmentApi } from '../../api/containment';
import { GlobbableApi } from '../../api/glob';
import { MessageApi } from '../../api/message';
import { MixinApi } from '../../api/mixin';
import { Mml } from '../../api/mml';

interface GetModel extends CommandModel {
  targets: MqlManyResult;
}

interface GetPayload {
  operand: Stuff;
  applied: number;
}

export class GetController extends CommandController<GetModel> {
  async execute(
    model: GetModel,
    context: CommandContext
  ): Promise<CommandResult> {
    const { stuff, quantity, raw } = model.targets;
    const giver = context.commandGiver;
    if (!MixinApi.isContainer(giver)) {
      throw new Error(
        `GetController: commandGiver ${giver.stuffId} is not a Container`
      );
    }

    if (!quantity) {
      return this.executeWholeSet(stuff, raw, context);
    }

    // Source: location contents. Filter to candidates actually
    // present here.
    const here = ContainmentApi.getContents(context.location);
    const inLocation = stuff.filter((s) =>
      here.some((it) => it.stuffId === s.stuffId)
    );
    const inventory = ContainmentApi.getContents(giver);
    const candidates = inLocation.filter(
      (s) => !inventory.some((it) => it.stuffId === s.stuffId)
    );

    const result = await GlobbableApi.applyQuantity<GetPayload>(
      candidates,
      quantity,
      async (operand, applied) => {
        if (!MixinApi.isContainable(operand)) {
          throw new Error(
            `GetController: operand ${operand.stuffId} is not Containable`
          );
        }
        ContainmentApi.move(operand, giver);
        return { ok: true, payload: { operand, applied } };
      },
      { query: raw }
    );

    return this.renderResult(result, raw, giver);
  }

  private executeWholeSet(
    targets: Stuff[],
    raw: string,
    context: CommandContext
  ): CommandResult {
    if (targets.length === 0) {
      return {
        success: false,
        summary: `you don't see any '${raw}' here`,
      };
    }
    let successCount = 0;
    const pickedNames: string[] = [];
    for (const target of targets) {
      if (this.pickUpObject(target, context)) {
        successCount++;
        pickedNames.push(GlobbableApi.formatName(target, 'something'));
      }
    }
    if (successCount === 0) {
      return { success: false, summary: 'nothing picked up' };
    }
    return { success: true, summary: pickedNames.join(', ') };
  }

  private renderResult(
    result: {
      ok: boolean;
      applied: number;
      status?: 'partial' | 'declined';
      notes: ReadonlyArray<
        | { kind: 'quantity-clamped'; requested: number; applied: number }
        | { kind: 'quantity-clamped-rejected'; requested: number; available: number }
        | { kind: 'empty-result'; query: string; reason: 'no-matches' }
        | { kind: 'target-declined'; target: Stuff; reason: string }
      >;
      payloads: GetPayload[];
    },
    raw: string,
    giver: Stuff
  ): CommandResult {
    let clampedSuffix = '';
    for (const note of result.notes) {
      switch (note.kind) {
        case 'empty-result':
          return {
            success: false,
            summary: `you don't see any '${raw}' here`,
          };
        case 'quantity-clamped-rejected':
          return {
            success: false,
            summary: `only ${note.available} of those here`,
          };
        case 'quantity-clamped':
          clampedSuffix = ` (only ${note.applied} available)`;
          break;
        case 'target-declined':
          break;
      }
    }

    if (!result.ok || result.payloads.length === 0) {
      return { success: false, summary: 'nothing picked up' };
    }

    for (const { operand } of result.payloads) {
      this.firePickupScene(giver, operand);
    }

    const pickedNames = result.payloads
      .map(({ operand }) => GlobbableApi.formatName(operand, 'something'))
      .join(', ');
    return {
      success: true,
      summary: `${pickedNames}${clampedSuffix}`,
    };
  }

  private pickUpObject(target: Stuff, context: CommandContext): boolean {
    if (!MixinApi.isContainable(target)) {
      throw new Error(
        `GetController: target ${target.stuffId} is not Containable`
      );
    }
    const giver = context.commandGiver;
    if (!MixinApi.isContainer(giver)) {
      throw new Error(
        `GetController: commandGiver ${giver.stuffId} is not a Container`
      );
    }
    const inventory = ContainmentApi.getContents(giver);
    if (inventory.some((item) => item.stuffId === target.stuffId)) {
      return false;
    }
    const locationContents = ContainmentApi.getContents(context.location);
    if (!locationContents.some((item) => item.stuffId === target.stuffId)) {
      return false;
    }
    ContainmentApi.move(target, giver);
    this.firePickupScene(giver, target);
    return true;
  }

  private firePickupScene(giver: Stuff, target: Stuff): void {
    MessageApi.scene(giver)
      .topic(MessageApi.Topics.world.perception.inventory)
      .toSelf(Mml.compose`You pick up ${Mml.item(target)}.`)
      .toPeers(Mml.compose`${Mml.name(giver)} picks up ${Mml.item(target)}.`)
      .send();
  }
}
